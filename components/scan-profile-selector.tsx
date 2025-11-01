"use client"

import { useState } from "react"
import { SCAN_PROFILES } from "@/lib/scan-profiles"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Info } from "lucide-react"

interface ScanProfileSelectorProps {
  onProfileChange: (profile: string) => void
  defaultProfile?: string
}

export function ScanProfileSelector({ onProfileChange, defaultProfile = 'comprehensive_noroot' }: ScanProfileSelectorProps) {
  const [selectedProfile, setSelectedProfile] = useState(defaultProfile)
  
  const handleChange = (value: string) => {
    setSelectedProfile(value)
    onProfileChange(value)
  }
  
  const currentProfile = SCAN_PROFILES[selectedProfile]
  
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Scan Profile</label>
      <Select value={selectedProfile} onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select a scan profile" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(SCAN_PROFILES).map(([key, profile]) => (
            <SelectItem key={key} value={key}>
              <div className="flex items-center gap-2">
                <span>{profile.name}</span>
                {profile.requiresRoot && (
                  <span className="text-xs text-destructive">(needs sudo)</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {currentProfile && (
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md text-sm">
          <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-muted-foreground">{currentProfile.description}</p>
            <p className="text-xs text-muted-foreground">
              Estimated time: {currentProfile.estimatedTime}
            </p>
            {currentProfile.requiresRoot && (
              <p className="text-xs text-destructive font-medium">
                ⚠️ This scan requires sudo privileges. Run the app with: <code className="bg-background px-1 py-0.5 rounded">sudo pnpm dev</code>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

