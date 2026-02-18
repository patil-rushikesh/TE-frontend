'use client'

import { useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { FilePlus, FileText, UploadCloud } from 'lucide-react'

interface EightDRecord {
  id: number
  name: string
  uploadedAt: string
  size: number
  url?: string
}

export default function EightDManager() {
  const [records, setRecords] = useState<EightDRecord[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const newRecords: EightDRecord[] = Array.from(files).map((file, idx) => ({
      id: Date.now() + idx,
      name: file.name,
      uploadedAt: new Date().toLocaleString(),
      size: file.size,
      url: URL.createObjectURL(file),
    }))
    setRecords(prev => [...newRecords, ...prev])
    // Optionally: upload to server here
  }

  return (
    <Card className="max-w-3xl mx-auto p-6 border-border bg-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="w-7 h-7 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">8D Document Records</h2>
        </div>
        <Button
          className="flex items-center gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className="w-5 h-5" /> Upload 8D Document
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={handleUpload}
          accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,.json"
        />
      </div>
      <div className="overflow-x-auto">
        <Table className="min-w-full text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="text-left">File Name</TableHead>
              <TableHead className="text-left">Uploaded At</TableHead>
              <TableHead className="text-left">Size</TableHead>
              <TableHead className="text-left">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No 8D documents uploaded yet.
                </TableCell>
              </TableRow>
            ) : (
              records.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell className="font-medium text-foreground flex items-center gap-2">
                    <FilePlus className="w-4 h-4 text-accent" />
                    {rec.name}
                  </TableCell>
                  <TableCell>{rec.uploadedAt}</TableCell>
                  <TableCell>{(rec.size / 1024).toFixed(1)} KB</TableCell>
                  <TableCell>
                    {rec.url && (
                      <a
                        href={rec.url}
                        download={rec.name}
                        className="text-primary underline hover:text-orange-700"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
