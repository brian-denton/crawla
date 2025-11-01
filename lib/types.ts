export interface Port {
  port: number;
  protocol: string;
  state: string;
  service: string;
  version?: string;
}

export interface Host {
  ip: string;
  hostname?: string;
  friendlyName?: string;
  status: string;
  os?: string;
  ports: Port[];
  lastSeen: Date;
}

export interface ScanResult {
  id: string;
  timestamp: Date;
  hosts: Host[];
  totalHosts: number;
  activeHosts: number;
  scanDuration: number;
  network: string;
}

export interface ScanStatus {
  isScanning: boolean;
  lastScan?: Date;
  nextScheduledScan?: Date;
  error?: string;
}

export interface Stats {
  totalScans: number;
  uniqueHostsSeen: number;
  currentActiveHosts: number;
  lastScanTime: Date | null;
}

export interface DatabaseRow {
  id?: number | string;
  scan_id?: string;
  ip?: string;
  hostname?: string | null;
  status?: string;
  os?: string | null;
  last_seen?: string;
  timestamp?: string;
  total_hosts?: number;
  active_hosts?: number;
  scan_duration?: number;
  network?: string;
  host_id?: number;
  port?: number;
  protocol?: string;
  state?: string;
  service?: string;
  version?: string | null;
  scan_timestamp?: string;
  count?: number;
}

