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
} from "lucide-react"
import type { GuiDialog, PolicyDocumentResponse } from "../types"
import { cx } from "../lib/ui"
import { availableOsesFor, type OsFilterValue } from "../lib/os"
import { tabCountsForDocument, overviewCountsForDocument } from "../lib/customizedCounts"
import { buildIntelligenceDocumentKey } from "../lib/intelligenceAcknowledgements"
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
import DashboardNav, { type DashboardTab, type DashboardTabId } from "./DashboardNav"
import { fetchRawXml } from "../api"

interface DashboardProps {
  response: PolicyDocumentResponse
}

type TabId = DashboardTabId

interface TabDef extends DashboardTab {}

const Dashboard = ({ response }: DashboardProps) => {
  const { document: doc } = response
  const [hideDefaults, setHideDefaults] = useState(false)

  const overviewCounts = useMemo(
    () => overviewCountsForDocument(doc, hideDefaults),
    [doc, hideDefaults]
  )

  const intelligenceDocumentKey = useMemo(
    () => buildIntelligenceDocumentKey(doc.meta, response.source, response.fileName),
    [doc.meta, response.fileName, response.source]
  )

  const tabs = useMemo<TabDef[]>(() => {
    const counts = tabCountsForDocument(doc, hideDefaults)
    const list: TabDef[] = []
    list.push({
      id: "overview",
      label: "Overview",
      shortLabel: "Overview",
      icon: LayoutDashboard,
      group: "explore",
    })
    if (doc.generalConfiguration) {
      list.push({
        id: "config",
        label: "General Configuration",
        shortLabel: "Configuration",
        icon: Settings2,
        count: counts.config,
        group: "reference",
      })
    }
    list.push({
      id: "normal",
      label: "Normal Policies",
      shortLabel: "Normal",
      icon: ShieldCheck,
      count: counts.normal,
      group: "policies",
    })
    list.push({
      id: "excluded",
      label: "Excluded Policies",
      shortLabel: "Excluded",
      icon: ShieldOff,
      count: counts.excluded,
      group: "policies",
    })
    if (doc.threatProtectionPolicies.length > 0) {
      list.push({
        id: "threat",
        label: "Threat Protection",
        shortLabel: "Threat",
        icon: ShieldAlert,
        count: counts.threat,
        group: "policies",
      })
    }
    list.push({
      id: "gui",
      label: "GUI Dialogs",
      shortLabel: "Dialogs",
      icon: MonitorPlay,
      count: counts.gui,
      group: "reference",
    })
    if (doc.applicationGroups.length > 0) {
      list.push({
        id: "appgroups",
        label: "Application Groups",
        shortLabel: "App Groups",
        icon: Boxes,
        count: counts.appGroups,
        group: "reference",
      })
    }
    list.push({
      id: "raw",
      label: "Raw XML",
      shortLabel: "Raw XML",
      icon: FileCode2,
      group: "reference",
    })
    list.push({
      id: "intelligence",
      label: "Intelligence",
      shortLabel: "Intelligence",
      icon: Sparkles,
      count: counts.intelligence,
      group: "explore",
    })
    return list
  }, [doc, hideDefaults])

  const [activeTab, setActiveTab] = useState<TabId>(tabs[0].id)
  const [osFilter, setOsFilter] = useState<OsFilterValue>("all")
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const [normalCategory, setNormalCategory] = useState("all")
  const [excludedCategory] = useState("all")
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
      <DashboardNav
        tabs={tabs}
        activeTab={activeTab}
        hideDefaults={hideDefaults}
        onSelectTab={setActiveTab}
      />

      {activeTab !== "raw" && (
        <div className="flex flex-wrap items-center gap-3">
          {showSearch ? (
            <div className="min-w-[16rem] flex-1">
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder={searchPlaceholder}
              />
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setHideDefaults((value) => !value)}
            aria-pressed={hideDefaults}
            title="Show only customized policies, dialogs, settings, and application groups"
            className={cx(
              "inline-flex shrink-0 items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2",
              hideDefaults
                ? "border-amber-500 bg-amber-500 text-white shadow-amber-200/60 hover:bg-amber-600"
                : "border-slate-300 bg-white text-slate-800 hover:border-amber-300 hover:bg-amber-50"
            )}
          >
            {hideDefaults ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            Customized only
          </button>
        </div>
      )}

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
              counts={overviewCounts}
              hideDefaults={hideDefaults}
              onNavigate={handleSummaryNavigate}
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
            applicationGroups={doc.applicationGroups}
            hideDefaults={hideDefaults}
            query={deferredQuery}
            documentKey={intelligenceDocumentKey}
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
