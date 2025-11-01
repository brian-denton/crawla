"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Trash2, Download, Terminal } from "lucide-react"

interface ScanLog {
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'success'
  message: string
}

interface ScanLogsViewerProps {
  isOpen: boolean
  onClose: () => void
}

export function ScanLogsViewer({ isOpen, onClose }: ScanLogsViewerProps) {
  const [logs, setLogs] = useState<ScanLog[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const fetchLogs = useCallback(async () => {
    try {
      const response = await fetch('/api/logs')
      const data = await response.json()
      
      if (data.success) {
        setLogs(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    }
  }, [])

  const clearLogs = async () => {
    try {
      await fetch('/api/logs', { method: 'DELETE' })
      setLogs([])
    } catch (err) {
      console.error('Failed to clear logs:', err)
    }
  }

  const downloadLogs = () => {
    const logText = logs.map(log => 
      `[${new Date(log.timestamp).toLocaleString()}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n')
    
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `crawla-scan-logs-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (!isOpen) return

    // Fetch immediately and then every 1 second
    const interval = setInterval(fetchLogs, 1000)
    
    // Trigger initial fetch after mount
    const timeout = setTimeout(fetchLogs, 0)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [isOpen, fetchLogs])

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  if (!isOpen) return null

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-500'
      case 'warning':
        return 'text-yellow-500'
      case 'success':
        return 'text-green-500'
      default:
        return 'text-blue-500'
    }
  }

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'error':
        return <Badge variant="destructive" className="text-xs">ERROR</Badge>
      case 'warning':
        return <Badge variant="secondary" className="text-xs">WARN</Badge>
      case 'success':
        return <Badge variant="default" className="text-xs">SUCCESS</Badge>
      default:
        return <Badge variant="outline" className="text-xs">INFO</Badge>
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Scan Logs</CardTitle>
                <CardDescription>Live scanning activity and diagnostics</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={clearLogs}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button variant="outline" size="sm" onClick={downloadLogs}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant={autoScroll ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
            >
              Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
            </Button>
            <div className="flex-1" />
            <Badge variant="secondary">{logs.length} entries</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <div className="bg-black/95 rounded-lg p-4 h-full overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No logs yet. Start a scan to see activity.
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map((log, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <span className="text-gray-500 text-xs min-w-[140px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    {getLevelBadge(log.level)}
                    <span className={getLevelColor(log.level)}>
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

