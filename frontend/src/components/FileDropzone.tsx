import { useRef, useState, type DragEvent } from "react"
import { FileUp, Loader2, UploadCloud } from "lucide-react"

interface FileDropzoneProps {
  onFileSelected: (file: File) => void
  isLoading: boolean
}

const FileDropzone = ({ onFileSelected, isLoading }: FileDropzoneProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = (files: FileList | null) => {
    if (isLoading) return
    const file = files?.[0]
    if (!file) return
    onFileSelected(file)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!isLoading) setIsDragging(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const handleBrowse = () => {
    if (!isLoading) inputRef.current?.click()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleBrowse()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload vf_policies.xml file"
      aria-disabled={isLoading}
      onClick={handleBrowse}
      onKeyDown={handleKeyDown}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={[
        "group flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-white px-6 py-16 text-center transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
        isLoading
          ? "cursor-not-allowed border-slate-200 opacity-70"
          : "cursor-pointer hover:border-slate-400 hover:bg-slate-50 active:bg-slate-100",
        isDragging ? "border-slate-900 bg-slate-50" : "border-slate-300",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xml,text/xml,application/xml"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />

      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors group-hover:bg-slate-900 group-hover:text-white">
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : isDragging ? (
          <FileUp className="h-6 w-6" />
        ) : (
          <UploadCloud className="h-6 w-6" />
        )}
      </div>

      <p className="text-sm font-medium text-slate-900">
        {isLoading
          ? "Parsing policy file…"
          : "Drag & drop your vf_policies.xml here"}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {isLoading ? "Please wait a moment" : "or click to browse — XML files only"}
      </p>
    </div>
  )
}

export default FileDropzone
