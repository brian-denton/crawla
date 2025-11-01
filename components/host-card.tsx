"use client"

import { useState } from "react"
import { Host } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Monitor, Globe, Server, Shield, ChevronDown, ChevronUp, Edit2, X, Check, Tag, Copy, CheckCheck, Search, Loader2, ShieldAlert, ShieldCheck } from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface HostCardProps {
  host: Host
  onFriendlyNameUpdate?: () => void
  onHostUpdate?: (updatedHost: Host) => void
}

export function HostCard({ host, onFriendlyNameUpdate, onHostUpdate }: HostCardProps) {
  const [showAllPorts, setShowAllPorts] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [friendlyName, setFriendlyName] = useState(host.friendlyName || '')
  const [isSaving, setIsSaving] = useState(false)
  const [copiedPort, setCopiedPort] = useState<number | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isScanningVulns, setIsScanningVulns] = useState(false)
  const [showAllVulns, setShowAllVulns] = useState(false)
  const [localHost, setLocalHost] = useState(host)
  
  const displayedPorts = showAllPorts ? localHost.ports : localHost.ports.slice(0, 8)
  const hasMorePorts = localHost.ports.length > 8
  
  // Check if host has been scanned and is secure
  const hasBeenScanned = localHost.lastVulnScan !== undefined
  const isSecure = hasBeenScanned && (!localHost.vulnerabilities || localHost.vulnerabilities.length === 0)

  const saveFriendlyName = async () => {
    if (!friendlyName.trim()) {
      console.error('Friendly name is empty')
      return
    }

    setIsSaving(true)
    try {
      console.log('Saving friendly name:', { ip: host.ip, friendlyName })
      const response = await fetch('/api/friendly-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: host.ip, friendlyName }),
      })
      
      console.log('Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Save successful:', data)
        host.friendlyName = friendlyName
        setIsEditingName(false)
        toast.success(`Friendly name saved: ${friendlyName}`)
        onFriendlyNameUpdate?.()
      } else {
        const errorData = await response.json()
        console.error('Failed to save friendly name:', errorData)
        toast.error(`Failed to save: ${errorData.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Failed to save friendly name:', err)
      toast.error(`Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const deleteFriendlyName = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/friendly-names?ip=${encodeURIComponent(host.ip)}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        host.friendlyName = undefined
        setFriendlyName('')
        setIsEditingName(false)
        onFriendlyNameUpdate?.()
      }
    } catch (err) {
      console.error('Failed to delete friendly name:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const copyPortToClipboard = async (port: number) => {
    const textToCopy = `${localHost.ip}:${port}`
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopiedPort(port)
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopiedPort(null), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const scanSingleHost = async () => {
    if (isScanning) return
    
    setIsScanning(true)
    toast.info(`Starting comprehensive scan on ${localHost.ip}...`)
    
    try {
      const response = await fetch(`/api/hosts/${encodeURIComponent(localHost.ip)}/scan`, {
        method: 'POST',
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          // Update local state with new host data
          setLocalHost(data.data)
          toast.success(`Scan completed! Found ${data.data.ports.length} open ports`)
          // Notify parent to refresh if needed
          onHostUpdate?.(data.data)
          onFriendlyNameUpdate?.()
        } else {
          toast.error(`Scan failed: ${data.error || 'Unknown error'}`)
        }
      } else {
        const errorData = await response.json()
        toast.error(`Scan failed: ${errorData.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Failed to scan host:', err)
      toast.error(`Failed to scan host: ${err instanceof Error ? err.message : 'Network error'}`)
    } finally {
      setIsScanning(false)
    }
  }

  const scanVulnerabilities = async () => {
    setIsScanningVulns(true)
    toast.info(`Starting vulnerability scan on ${host.ip}...`, {
      description: 'This may take 2-10 minutes',
      duration: 5000,
    })
    
    try {
      const response = await fetch(`/api/hosts/${host.ip}/nuclei`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Nuclei scan failed:', error)
        toast.error('Vulnerability scan failed', {
          description: error.error || 'Unknown error',
          duration: 6000,
        })
        return
      }

      const data = await response.json()
      if (data.success && data.data) {
        // Update local host state with vulnerabilities
        setLocalHost(prev => ({
          ...prev,
          vulnerabilities: data.data.vulnerabilities,
          lastVulnScan: new Date(data.data.scannedAt)
        }))
        
        const vulnCount = data.data.vulnerabilities.length
        
        if (vulnCount > 0) {
          // Keep vulnerabilities collapsed by default
          setShowAllVulns(false)
          
          const criticalCount = data.data.vulnerabilities.filter((v: { severity: string }) => v.severity === 'critical').length
          const highCount = data.data.vulnerabilities.filter((v: { severity: string }) => v.severity === 'high').length
          
          if (criticalCount > 0 || highCount > 0) {
            toast.error(`Found ${vulnCount} vulnerabilities!`, {
              description: `${criticalCount} critical, ${highCount} high severity`,
              duration: 8000,
            })
          } else {
            toast.warning(`Found ${vulnCount} vulnerabilities`, {
              description: 'Review the findings in the card below',
              duration: 6000,
            })
          }
        } else {
          toast.success('No vulnerabilities found', {
            description: 'Target appears secure',
            duration: 4000,
          })
        }
        
        // Refresh dashboard
        if (onHostUpdate) {
          onHostUpdate({
            ...localHost,
            vulnerabilities: data.data.vulnerabilities,
            lastVulnScan: new Date(data.data.scannedAt)
          })
        }
      }
    } catch (error) {
      console.error('Failed to scan vulnerabilities:', error)
      toast.error('Vulnerability scan failed', {
        description: 'Make sure Nuclei is installed: brew install nuclei',
        duration: 6000,
      })
    } finally {
      setIsScanningVulns(false)
    }
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Monitor className="h-5 w-5 text-primary flex-shrink-0" />
            <CardTitle className="text-lg truncate">{localHost.ip}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isSecure && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20">
                <ShieldCheck className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
                <span className="text-xs font-medium text-green-700 dark:text-green-400">Secure</span>
              </div>
            )}
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 flex-shrink-0"
              onClick={scanSingleHost}
              disabled={isScanning}
              title="Run comprehensive Nmap scan (all ports, OS, hostname)"
            >
              {isScanning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 flex-shrink-0"
              onClick={scanVulnerabilities}
              disabled={isScanningVulns}
              title="Run Nuclei vulnerability scan"
            >
              {isScanningVulns ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldAlert className="h-4 w-4" />
              )}
            </Button>
            <Badge variant={localHost.status === "up" ? "default" : "secondary"}>
              {localHost.status}
            </Badge>
          </div>
        </div>
        
        {/* Friendly Name Section */}
        {isEditingName ? (
          <div className="flex items-center gap-2 mt-2">
            <Tag className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <Input
              value={friendlyName}
              onChange={(e) => setFriendlyName(e.target.value)}
              placeholder="Enter friendly name..."
              className="h-7 text-sm"
              disabled={isSaving}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveFriendlyName()
                if (e.key === 'Escape') setIsEditingName(false)
              }}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 flex-shrink-0"
              onClick={saveFriendlyName}
              disabled={isSaving || !friendlyName.trim()}
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 flex-shrink-0"
              onClick={() => {
                setIsEditingName(false)
                setFriendlyName(host.friendlyName || '')
              }}
              disabled={isSaving}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 mt-2">
            {host.friendlyName ? (
              <div className="flex items-center gap-1 text-sm font-medium text-primary min-w-0 flex-1">
                <Tag className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{host.friendlyName}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-sm text-muted-foreground min-w-0 flex-1">
                <Tag className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">No friendly name</span>
              </div>
            )}
            <div className="flex gap-1 flex-shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => {
                  setIsEditingName(true)
                  setFriendlyName(host.friendlyName || '')
                }}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              {host.friendlyName && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={deleteFriendlyName}
                  disabled={isSaving}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        )}
        
        {/* Hostname Section */}
        {localHost.hostname && localHost.hostname !== localHost.ip ? (
          <CardDescription className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            {localHost.hostname}
          </CardDescription>
        ) : (
          <CardDescription className="flex items-center gap-1 text-muted-foreground/50">
            <Globe className="h-3 w-3" />
            No hostname resolved
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Operating System Detection */}
        <div className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">OS:</span>
          {localHost.os ? (
            <span className="font-medium text-primary">{localHost.os}</span>
          ) : (
            <span className="text-xs text-muted-foreground italic">
              Not detected (requires sudo scan)
            </span>
          )}
        </div>
        
        {localHost.ports.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Server className="h-4 w-4 text-muted-foreground" />
              <span>Open Ports ({localHost.ports.length})</span>
            </div>
            <div className="space-y-1.5 ml-6">
              {displayedPorts.map((port, idx) => (
                <div key={idx} className="flex items-center text-sm gap-2 group">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => copyPortToClipboard(port.port)}
                    title={`Copy ${localHost.ip}:${port.port}`}
                  >
                    {copiedPort === port.port ? (
                      <CheckCheck className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                  <span className="text-muted-foreground font-mono min-w-[80px] flex-shrink-0">
                    {port.port}/{port.protocol}
                  </span>
                  <div className="flex gap-2 items-center flex-wrap flex-1 min-w-0">
                    <Badge variant="outline" className="text-xs">
                      {port.service}
                    </Badge>
                    {port.version && (
                      <span className="text-xs text-muted-foreground max-w-[200px] truncate" title={port.version}>
                        {port.version}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {hasMorePorts && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs w-full mt-1"
                  onClick={() => setShowAllPorts(!showAllPorts)}
                >
                  {showAllPorts ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Show {localHost.ports.length - 8} More Ports
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            No open ports detected
          </div>
        )}

        {/* Vulnerabilities Section */}
        {localHost.vulnerabilities && localHost.vulnerabilities.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-destructive flex-shrink-0" />
                <span className="text-sm font-semibold">Vulnerabilities</span>
                <Badge variant="destructive" className="text-xs">
                  {localHost.vulnerabilities.length}
                </Badge>
              </div>
              {localHost.lastVulnScan && (
                <span className="text-xs text-muted-foreground">
                  Scanned {new Date(localHost.lastVulnScan).toLocaleTimeString()}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {(showAllVulns ? localHost.vulnerabilities : localHost.vulnerabilities.slice(0, 3)).map((vuln, idx) => (
                <div key={idx} className="p-2 rounded-md bg-muted/50 border border-muted">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-medium flex-1">{vuln.name}</span>
                    <Badge 
                      variant={
                        vuln.severity === 'critical' ? 'destructive' : 
                        vuln.severity === 'high' ? 'destructive' : 
                        vuln.severity === 'medium' ? 'default' : 
                        'secondary'
                      }
                      className="text-xs flex-shrink-0"
                    >
                      {vuln.severity.toUpperCase()}
                    </Badge>
                  </div>
                  {vuln.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {vuln.description}
                    </p>
                  )}
                  {vuln.tags && vuln.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {vuln.tags.slice(0, 3).map((tag, tagIdx) => (
                        <span key={tagIdx} className="text-[10px] px-1.5 py-0.5 rounded bg-background text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {localHost.vulnerabilities.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs w-full mt-1"
                  onClick={() => setShowAllVulns(!showAllVulns)}
                >
                  {showAllVulns ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Show {localHost.vulnerabilities.length - 3} More Vulnerabilities
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-4">
          <span>Last seen: {new Date(localHost.lastSeen).toLocaleString()}</span>
          {(isScanning || isScanningVulns) && (
            <span className="text-primary font-medium flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {isScanning ? 'Scanning ports...' : 'Scanning vulnerabilities...'}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

