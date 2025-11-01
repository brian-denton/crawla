"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { HostCard } from "@/components/host-card"
import { ThemeToggle } from "@/components/theme-toggle"
import { ScanLogsViewer } from "@/components/scan-logs-viewer"
import { ScanProfileSelector } from "@/components/scan-profile-selector"
import { ScanResult, Stats } from "@/lib/types"
import { RefreshCw, Network, Activity, Server, Clock, Terminal } from "lucide-react"

export function ScanDashboard() {
  const [scanData, setScanData] = useState<ScanResult | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [lastScan, setLastScan] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nextScan, setNextScan] = useState<Date | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [showLogs, setShowLogs] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState('comprehensive_noroot')
  const [scheduledScanActive, setScheduledScanActive] = useState(false)
  const [hasRunInitialScan, setHasRunInitialScan] = useState(false)
  const [scanStatusMessage, setScanStatusMessage] = useState('Scanning...')

  // Load preferred profile from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('preferredScanProfile')
    if (savedProfile) {
      setSelectedProfile(savedProfile)
    }
    
    // Check if user has run a scan before
    const hasScanned = localStorage.getItem('hasRunScan')
    setHasRunInitialScan(hasScanned === 'true')
  }, [])

  const fetchScanData = useCallback(async () => {
    try {
      const response = await fetch('/api/scan')
      
      if (!response.ok) {
        console.error('API error:', response.status, response.statusText)
        return
      }
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Invalid content type:', contentType)
        const text = await response.text()
        console.error('Response body:', text.substring(0, 200))
        return
      }
      
      const data = await response.json()
      
      if (data.success && data.data) {
        if (data.data.currentScan) {
          setScanData(data.data.currentScan)
          setLastScan(new Date(data.data.lastScan))
        }
        setIsScanning(data.data.isScanning || false)
        
        // Update scan status message
        if (data.data.scanStatus) {
          const status = data.data.scanStatus
          if (status.phase === 'discovery') {
            setScanStatusMessage('Discovering hosts...')
          } else if (status.phase === 'port_scan' && status.hostsFound) {
            setScanStatusMessage(`Scanning ports on ${status.hostsFound} hosts`)
          } else if (status.phase === 'processing') {
            setScanStatusMessage('Processing results...')
          } else {
            setScanStatusMessage('Scanning...')
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch scan data:', err)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/stats')
      
      if (!response.ok) {
        console.error('Stats API error:', response.status, response.statusText)
        return
      }
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Invalid stats content type:', contentType)
        return
      }
      
      const data = await response.json()
      
      if (data.success) {
        setStats(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }, [])

  const triggerManualScan = async () => {
    setIsScanning(true)
    setError(null)
    
    try {
      // Save the selected profile to localStorage
      localStorage.setItem('preferredScanProfile', selectedProfile)
      
      // Run the manual scan (network will use server-side env variable)
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          profile: selectedProfile 
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setScanData(data.data)
        setLastScan(new Date(data.data.timestamp))
        setError(null)
        
        // If this is the first scan, start scheduled scanning with this profile
        if (!hasRunInitialScan) {
          await startScheduledScanning(selectedProfile)
          localStorage.setItem('hasRunScan', 'true')
          setHasRunInitialScan(true)
        } else {
          // Update the scheduled scan profile to match user's choice
          await updateScheduledScanProfile(selectedProfile)
        }
      } else {
        setError(data.error || 'Scan failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger scan')
    } finally {
      setIsScanning(false)
    }
  }

  const startScheduledScanning = async (profile: string) => {
    try {
      const response = await fetch('/api/scan/scheduled', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          profile,
          runImmediately: false // Don't run immediately, we just ran a manual scan
        }),
      })
      
      if (response.ok) {
        setScheduledScanActive(true)
        console.log(`Scheduled scanning started with ${profile} profile`)
      }
    } catch (err) {
      console.error('Failed to start scheduled scanning:', err)
    }
  }

  const updateScheduledScanProfile = async (profile: string) => {
    try {
      await fetch('/api/scan/scheduled', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          profile,
          runImmediately: false
        }),
      })
      console.log(`Updated scheduled scan profile to: ${profile}`)
    } catch (err) {
      console.error('Failed to update scheduled scan profile:', err)
    }
  }

  const handleProfileChange = (profile: string) => {
    setSelectedProfile(profile)
    localStorage.setItem('preferredScanProfile', profile)
  }

  // Initial data fetch and polling
  useEffect(() => {
    // Initial fetch
    fetchScanData()
    fetchStats()
    
    // Check scheduled scan status
    const checkScheduledStatus = async () => {
      try {
        const response = await fetch('/api/scan/scheduled')
        if (response.ok) {
          const data = await response.json()
          setScheduledScanActive(data.data.scheduledScanning)
        }
      } catch (err) {
        console.error('Failed to check scheduled scan status:', err)
      }
    }
    checkScheduledStatus()
    
    // Poll for updates every 5 seconds
    const interval = setInterval(() => {
      fetchScanData()
      fetchStats()
    }, 5000)
    
    return () => {
      clearInterval(interval)
    }
  }, [fetchScanData, fetchStats])

  // Update next scan countdown
  useEffect(() => {
    if (!lastScan) return

    const updateNextScan = () => {
      const next = new Date(lastScan.getTime() + 10 * 60 * 1000)
      setNextScan(next)
    }
    
    updateNextScan()
    const nextScanInterval = setInterval(updateNextScan, 1000)
    
    return () => {
      clearInterval(nextScanInterval)
    }
  }, [lastScan]) // Only update when lastScan changes

  const formatTimeUntilNextScan = () => {
    if (!nextScan) return 'N/A'
    
    const now = new Date()
    const diff = nextScan.getTime() - now.getTime()
    
    if (diff < 0) return 'Due now'
    
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    
    return `${minutes}m ${seconds}s`
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Crawla</h1>
                <p className="text-sm text-muted-foreground">Network Scanner Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowLogs(true)}
                variant="outline"
                size="lg"
              >
                <Terminal className="h-4 w-4 mr-2" />
                View Logs
              </Button>
              <Button
                onClick={triggerManualScan}
                disabled={isScanning}
                size="lg"
                className="min-w-[200px]"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
                {isScanning ? scanStatusMessage : 'Run Scan'}
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive">
            <p className="font-medium">Error: {error}</p>
          </div>
        )}

        {/* First Scan Prompt */}
        {!hasRunInitialScan && !scanData && (
          <div className="mb-6 p-6 bg-primary/10 border-2 border-primary rounded-lg">
            <div className="flex items-start gap-4">
              <div className="bg-primary text-primary-foreground rounded-full p-3 flex-shrink-0">
                <Network className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Welcome to Crawla!</h3>
                <p className="text-muted-foreground mb-4">
                  To get started, select a scan profile below and click &ldquo;Run Scan&rdquo;. 
                  Your chosen profile will be used for all future automatic scans (every 10 minutes).
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>After your first scan, automatic scanning will begin every 10 minutes</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scan Profile Selector */}
        <div className="mb-6 max-w-2xl">
          <ScanProfileSelector 
            onProfileChange={handleProfileChange}
            defaultProfile={selectedProfile}
          />
          {scheduledScanActive && hasRunInitialScan && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-3 w-3 text-green-500" />
              <span>Automatic scans enabled with <strong>{selectedProfile}</strong> profile</span>
            </div>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hosts</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{scanData?.totalHosts || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.uniqueHostsSeen ? `${stats.uniqueHostsSeen} unique hosts seen` : 'Discovered on network'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Hosts</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{scanData?.activeHosts || 0}</div>
              <p className="text-xs text-muted-foreground">
                Currently online
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Scan</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {lastScan ? lastScan.toLocaleTimeString() : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                {scanData?.scanDuration ? `Took ${(scanData.scanDuration / 1000).toFixed(1)}s` : 'No scan yet'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Scan</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatTimeUntilNextScan()}
              </div>
              <p className="text-xs text-muted-foreground">
                Auto-scan every 10 minutes
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Discovered Hosts</h2>
            {isScanning && (
              <Badge variant="secondary" className="animate-pulse">
                Scanning...
              </Badge>
            )}
          </div>
          
          {!scanData && !isScanning && (
            <Card>
              <CardHeader>
                <CardTitle>No Scan Data Available</CardTitle>
                <CardDescription>
                  Click the &ldquo;Run Scan&rdquo; button to perform your first network scan.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
          
          {scanData && (
            <>
              {scanData.hosts.filter(h => h.status !== 'up').length > 0 && (
                <div className="mb-4 p-3 bg-muted rounded-lg text-sm">
                  <span className="font-medium">Note:</span> Showing {scanData.hosts.filter(h => h.status === 'up').length} active hosts. 
                  {scanData.hosts.filter(h => h.status === 'down').length > 0 && (
                    <span> {scanData.hosts.filter(h => h.status === 'down').length} hosts are down or unreachable.</span>
                  )}
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {scanData.hosts.map((host, idx) => (
                  <HostCard 
                    key={idx} 
                    host={host}
                    onFriendlyNameUpdate={fetchScanData}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <ScanLogsViewer isOpen={showLogs} onClose={() => setShowLogs(false)} />
    </div>
  )
}

