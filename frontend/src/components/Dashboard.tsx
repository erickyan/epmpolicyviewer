import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import {
  Boxes,
  Eye,
  EyeOff,
  FileCode2,
  LayoutDashboard,
  MonitorPlay,
  Settings2,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Sparkles,
  type LucideIcon,
} from "lucide-react"
import type { GuiDialog, PolicyDocumentResponse } from "../types"
import { cx } from "../lib/ui"
import { availableOsesFor, type OsFilterValue } from "../lib/os"
import OsFilter from "./OsFilter"
import SearchBar from "./SearchBar"
import SummaryView, { type SummaryTarget } from "./SummaryView"
import GlobalSearchResults from "./GlobalSearchResults"
import GeneralConfigView from "./GeneralConfigView"
import PolicyExplorer from "./PolicyExplorer"
import GuiDialogs from "./GuiDialogs"
import ApplicationGroupsView from "./ApplicationGroupsView"
import DialogModal from "./DialogModal"
import RawXmlView from "./RawXmlView"
import IntelligenceView from "./IntelligenceView"
import { fetchRawXml } from "../api"

interface DashboardProps {
  response: PolicyDocumentResponse
}

type TabId =
  | "overview"
  | "intelligence"
  | "config"
  | "normal"
  | "excluded"
  | "threat"
  | "gui"
  | "appgroups"
  | "raw"

interface TabDef {
  id: TabId
  label: string
  icon: LucideIcon
  count?: number
}

const Dashboard = ({ response }: DashboardProps) => {
  const { document: doc } = response

  const tabs = useMemo<TabDef[]>(() => {
    const list: TabDef[] = []
    list.push({ id: "overview", label: "Overview", icon: LayoutDashboard })
    const actionableFindings =
      doc.intelligence.counts.critical + doc.intelligence.counts.warning
    list.push({
      id: "intelligence",
      label: "Intelligence",
      icon: Sparkles,
      count: actionableFindings > 0 ? actionableFindings : doc.intelligence.findings.length || undefined,
    })
    if (doc.generalConfiguration) {
      list.push({ id: "config", label: "General Configuration", icon: Settings2 })
    }
    list.push({ id: "normal", label: "Normal Policies", icon: ShieldCheck, count: doc.normalPolicies.length })
    list.push({ id: "excluded", label: "Excluded Policies", icon: ShieldOff, count: doc.excludedPolicies.length })
    if (doc.threatProtectionPolicies.length > 0) {
      list.push({
        id: "threat",
        label: "Threat Protection",
        icon: ShieldAlert,
        count: doc.threatProtectionPolicies.length,
      })
    }
    list.push({ id: "gui", label: "GUI Dialogs", icon: MonitorPlay, count: doc.gui.length })
    if (doc.applicationGroups.length > 0) {
      list.push({
        id: "appgroups",
        label: "Application Groups",
        icon: Boxes,
        count: doc.applicationGroups.length,
      })
    }
    list.push({ id: "raw", label: "Raw XML", icon: FileCode2 })
    return list
  }, [doc])

  const [activeTab, setActiveTab] = useState<TabId>(tabs[0].id)
  const [osFilter, setOsFilter] = useState<OsFilterValue>("all")
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const [hideDefaults, setHideDefaults] = useState(false)
  const [normalCategory, setNormalCategory] = useState("all")
  const [excludedCategory, setExcludedCategory] = useState("all")
  const [threatCategory, setThreatCategory] = useState("all")
  const [selectedDialog, setSelectedDialog] = useState<GuiDialog | null>(null)
  const [selectedAppGroup, setSelectedAppGroup] = useState<string | null>(null)
  const [highlightPolicyId, setHighlightPolicyId] = useState<string | null>(null)
  const [rawXml, setRawXml] = useState<string | null>(null)
  const [rawXmlLoading, setRawXmlLoading] = useState(false)
  const [rawXmlError, setRawXmlError] = useState<string | null>(null)
  const availableOs = useMemo(() => availableOsesFor(doc), [doc])

  useEffect(() => {
    setRawXml(null)
    setRawXmlError(null)
    setRawXmlLoading(false)
  }, [response.fileName, response.source])

  useEffect(() => {
    if (activeTab !== "raw" || rawXml) return

    let cancelled = false
    setRawXmlLoading(true)
    setRawXmlError(null)

    fetchRawXml(response.source)
      .then((xml) => {
        if (!cancelled) setRawXml(xml)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setRawXmlError(
            error instanceof Error ? error.message : "Unable to load raw XML"
          )
        }
      })
      .finally(() => {
        if (!cancelled) setRawXmlLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeTab, rawXml, response.source])

  const excludedCategoryIds = useMemo(
    () => new Set(doc.excludedPolicies.map((policy) => policy.categoryId)),
    [doc.excludedPolicies]
  )

  const threatCategoryIds = useMemo(
    () => new Set(doc.threatProtectionPolicies.map((policy) => policy.categoryId)),
    [doc.threatProtectionPolicies]
  )

  const handleSummaryNavigate = useCallback((target: SummaryTarget) => {
    if (target === "intelligence") {
      setActiveTab("intelligence")
      return
    }
    if (target === "default") {
      setNormalCategory("default")
      setActiveTab("normal")
      return
    }
    if (target === "normal") setNormalCategory("all")
    if (target === "threat") setThreatCategory("all")
    setActiveTab(target)
  }, [])

  const handleSelectCategory = useCallback(
    (categoryId: string) => {
      if (categoryId === "threat-protection" || categoryId === "eagles") {
        setThreatCategory("all")
        setActiveTab("threat")
        return
      }
      if (threatCategoryIds.has(categoryId)) {
        setThreatCategory(categoryId)
        setActiveTab("threat")
        return
      }
      if (excludedCategoryIds.has(categoryId)) {
        setExcludedCategory(categoryId)
        setActiveTab("excluded")
        return
      }
      setNormalCategory(categoryId)
      setActiveTab("normal")
    },
    [excludedCategoryIds, threatCategoryIds]
  )

  const openDialogById = useCallback(
    (id: string) => {
      const dialog = doc.gui.find((entry) => entry.id === id)
      if (dialog) setSelectedDialog(dialog)
    },
    [doc.gui]
  )

  const openAppGroupById = useCallback((id: string) => {
    setSelectedAppGroup(id)
    setActiveTab("appgroups")
  }, [])

  const openPolicyById = useCallback(
    (id: string) => {
      setHighlightPolicyId(id)
      if (doc.threatProtectionPolicies.some((policy) => policy.id === id)) {
        setActiveTab("threat")
        return
      }
      const inExcluded = doc.excludedPolicies.some((policy) => policy.id === id)
      setActiveTab(inExcluded ? "excluded" : "normal")
    },
    [doc.excludedPolicies, doc.threatProtectionPolicies]
  )

  const handleHighlightHandled = useCallback(() => {
    setHighlightPolicyId(null)
  }, [])

  const showOsFilter =
    (activeTab === "normal" ||
      activeTab === "excluded" ||
      activeTab === "threat" ||
      activeTab === "gui") &&
    availableOs.length > 0
  const showSearch = activeTab !== "raw"

  const searchPlaceholder =
    activeTab === "overview"
      ? "Search the entire policy — settings, policies, dialogs…"
      : activeTab === "intelligence"
        ? "Search intelligence findings…"
        : activeTab === "config"
        ? "Search settings, alerts, messages…"
        : activeTab === "gui"
          ? "Search dialogs…"
          : activeTab === "appgroups"
            ? "Search application groups, members…"
            : "Search policies, publishers, locations…"

  return (
    <div className="space-y-6">
      {showSearch && (
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar value={query} onChange={setQuery} placeholder={searchPlaceholder} />
          <button
            type="button"
            onClick={() => setHideDefaults((value) => !value)}
            aria-pressed={hideDefaults}
            title="Hide unchanged default configurations, policies and dialogs"
            className={cx(
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
              hideDefaults
                ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            {hideDefaults ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            Customized only
          </button>
        </div>
      )}

      <div className="border-b border-slate-200">
        <nav className="flex flex-wrap gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={cx(
                  "inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.count !== undefined ? (
                  <span
                    className={cx(
                      "rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                      isActive
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </button>
            )
          })}
        </nav>
      </div>

      {showOsFilter && (
        <div className="flex flex-wrap items-center gap-3">
          <OsFilter value={osFilter} onChange={setOsFilter} available={availableOs} />
        </div>
      )}

      <div>
        {activeTab === "overview" &&
          (deferredQuery.trim() ? (
            <GlobalSearchResults
              doc={doc}
              query={deferredQuery}
              onOpenDialog={setSelectedDialog}
              onNavigate={handleSummaryNavigate}
            />
          ) : (
            <SummaryView
              summary={doc.summary}
              intelligence={doc.intelligence}
              onNavigate={handleSummaryNavigate}
              onSelectCategory={handleSelectCategory}
            />
          ))}
        {activeTab === "intelligence" && (
          <IntelligenceView
            intelligence={doc.intelligence}
            policies={[
              ...doc.normalPolicies,
              ...doc.excludedPolicies,
              ...doc.threatProtectionPolicies,
            ]}
            query={deferredQuery}
            onOpenPolicy={openPolicyById}
          />
        )}
        {activeTab === "config" && doc.generalConfiguration && (
          <GeneralConfigView
            config={doc.generalConfiguration}
            query={deferredQuery}
            customizedOnly={hideDefaults}
          />
        )}
        {activeTab === "normal" && (
          <PolicyExplorer
            key={`normal-${normalCategory}`}
            policies={doc.normalPolicies}
            applicationGroups={doc.applicationGroups}
            emptyMessage="No normal policies in this document"
            osFilter={osFilter}
            query={deferredQuery}
            hideDefaults={hideDefaults}
            initialCategory={normalCategory}
            onOpenDialog={openDialogById}
            onOpenAppGroup={openAppGroupById}
            highlightPolicyId={highlightPolicyId}
            onHighlightHandled={handleHighlightHandled}
          />
        )}
        {activeTab === "excluded" && (
          <PolicyExplorer
            key={`excluded-${excludedCategory}`}
            policies={doc.excludedPolicies}
            applicationGroups={doc.applicationGroups}
            emptyMessage="No excluded policies in this document"
            osFilter={osFilter}
            query={deferredQuery}
            hideDefaults={hideDefaults}
            initialCategory={excludedCategory}
            onOpenDialog={openDialogById}
            onOpenAppGroup={openAppGroupById}
            highlightPolicyId={highlightPolicyId}
            onHighlightHandled={handleHighlightHandled}
          />
        )}
        {activeTab === "threat" && (
          <PolicyExplorer
            key={`threat-${threatCategory}`}
            policies={doc.threatProtectionPolicies}
            applicationGroups={doc.applicationGroups}
            emptyMessage="No threat protection policies in this document"
            osFilter={osFilter}
            query={deferredQuery}
            hideDefaults={hideDefaults}
            initialCategory={threatCategory}
            onOpenDialog={openDialogById}
            onOpenAppGroup={openAppGroupById}
            highlightPolicyId={highlightPolicyId}
            onHighlightHandled={handleHighlightHandled}
          />
        )}
        {activeTab === "gui" && (
          <GuiDialogs
            dialogs={doc.gui}
            osFilter={osFilter}
            query={deferredQuery}
            hideDefaults={hideDefaults}
            onOpenDialog={setSelectedDialog}
          />
        )}
        {activeTab === "appgroups" && (
          <ApplicationGroupsView
            groups={doc.applicationGroups}
            query={deferredQuery}
            hideDefaults={hideDefaults}
            selectedId={selectedAppGroup}
            onOpenPolicy={openPolicyById}
          />
        )}
        {activeTab === "raw" && (
          <RawXmlView
            xml={rawXml}
            loading={rawXmlLoading}
            error={rawXmlError}
          />
        )}
      </div>

      {selectedDialog && (
        <DialogModal
          dialog={selectedDialog}
          onClose={() => setSelectedDialog(null)}
        />
      )}
    </div>
  )
}

export default Dashboard
