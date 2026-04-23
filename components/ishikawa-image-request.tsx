'use client'

import { useState } from 'react'
import { Download, ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { type IshikawaCategory } from '@/lib/root-cause'

export function IshikawaImageRequest({
  problem,
  data
}: {
  problem: string
  data: IshikawaCategory[]
}) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateImage = async () => {
    setLoading(true)
    setError(null)

    // Transform data to the format the local server expects
    

    const payload = {
      problem,
      data
    }

    try {
      console.log(payload)
      const response = await fetch('http://localhost:4000/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setImageSrc(url)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to generate image from local server')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!imageSrc) return
    const link = document.createElement('a')
    link.href = imageSrc
    link.download = 'ishikawa-diagram.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card className="p-6 mt-6 border-border bg-card/50">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Generate Visual Diagram</h3>
            <p className="text-sm text-muted-foreground">
              Send the current data to the local server (Port 4000) to render a PNG image.
            </p>
          </div>
          <Button onClick={generateImage} disabled={loading || !data.length}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ImageIcon className="mr-2 h-4 w-4" />
                Render PNG
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-100/50 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {imageSrc && (
          <div className="relative mt-4 group">
            <div className="overflow-hidden rounded-lg border border-border bg-white shadow-inner">
              <img src={imageSrc} alt="Ishikawa Diagram" className="w-full h-auto" />
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="sm" variant="secondary" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download PNG
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
