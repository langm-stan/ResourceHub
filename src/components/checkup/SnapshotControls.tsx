import { useRef } from 'react'
import { Upload, FileSpreadsheet } from 'lucide-react'
import { Button } from '../../design-system'

/*
 * One file format, two verbs: download your numbers as Excel, and upload a
 * previously downloaded Excel file to pick up where you left off. Everything
 * else saves automatically in the browser.
 */
export default function SnapshotControls({
  onExportExcel,
  onImportFile,
}: {
  onExportExcel: () => void
  onImportFile: (file: File) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="quiet" onClick={onExportExcel}>
        <FileSpreadsheet size={13} />
        Download as Excel
      </Button>
      <Button size="sm" variant="quiet" onClick={() => fileRef.current?.click()}>
        <Upload size={13} />
        Upload a previous Excel file
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onImportFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
