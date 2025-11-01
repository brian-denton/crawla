import Database from 'better-sqlite3';
import path from 'path';
import { Host, Port, ScanResult, DatabaseRow, Stats } from './types';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: Database.Database;

  private constructor() {
    try {
      // Store database in project root for persistence
      const dbPath = path.join(process.cwd(), 'crawla.db');
      console.log(`Initializing database at: ${dbPath}`);
      
      // Create database with proper permissions (mode 0o644 = rw-r--r--)
      this.db = new Database(dbPath, { 
        fileMustExist: false 
      });
      
      this.db.pragma('journal_mode = WAL');
      this.initializeDatabase();
      
      console.log(`Database initialized successfully at: ${dbPath}`);
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private initializeDatabase() {
    try {
      console.log('Creating database tables...');
      
      // Create scans table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS scans (
          id TEXT PRIMARY KEY,
          timestamp DATETIME NOT NULL,
          total_hosts INTEGER NOT NULL,
          active_hosts INTEGER NOT NULL,
          scan_duration INTEGER NOT NULL,
          network TEXT NOT NULL
        )
      `);
      console.log('Scans table created');

      // Create hosts table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS hosts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          scan_id TEXT NOT NULL,
          ip TEXT NOT NULL,
          hostname TEXT,
          status TEXT NOT NULL,
          os TEXT,
          last_seen DATETIME NOT NULL,
          FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE,
          UNIQUE(scan_id, ip)
        )
      `);
      console.log('Hosts table created');

      // Create ports table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS ports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          host_id INTEGER NOT NULL,
          port INTEGER NOT NULL,
          protocol TEXT NOT NULL,
          state TEXT NOT NULL,
          service TEXT NOT NULL,
          version TEXT,
          FOREIGN KEY (host_id) REFERENCES hosts(id) ON DELETE CASCADE
        )
      `);
      console.log('Ports table created');

      // Create friendly names table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS friendly_names (
          ip TEXT PRIMARY KEY,
          friendly_name TEXT NOT NULL,
          created_at DATETIME NOT NULL,
          updated_at DATETIME NOT NULL
        )
      `);
      console.log('Friendly names table created');

      // Create vulnerabilities table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS vulnerabilities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ip TEXT NOT NULL,
          vuln_id TEXT NOT NULL,
          name TEXT NOT NULL,
          severity TEXT NOT NULL,
          description TEXT,
          reference TEXT,
          matched_at TEXT,
          curl_command TEXT,
          tags TEXT,
          discovered_at DATETIME NOT NULL,
          UNIQUE(ip, vuln_id)
        )
      `);
      console.log('Vulnerabilities table created');

      // Create indexes for better query performance
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_hosts_scan_id ON hosts(scan_id);
        CREATE INDEX IF NOT EXISTS idx_hosts_ip ON hosts(ip);
        CREATE INDEX IF NOT EXISTS idx_ports_host_id ON ports(host_id);
        CREATE INDEX IF NOT EXISTS idx_scans_timestamp ON scans(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_vulnerabilities_ip ON vulnerabilities(ip);
        CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON vulnerabilities(severity);
      `);
      console.log('Database indexes created');
      console.log('Database initialization complete');
    } catch (error) {
      console.error('Error initializing database tables:', error);
      throw error;
    }
  }

  updateHost(host: Host): void {
    // Get the most recent scan ID
    const recentScan = this.db.prepare(`
      SELECT id FROM scans ORDER BY timestamp DESC LIMIT 1
    `).get() as DatabaseRow | undefined;

    const scanId = recentScan?.id as string || `scan_${Date.now()}`;

    // Delete existing host data for this IP
    const existingHost = this.db.prepare(`
      SELECT id FROM hosts WHERE ip = ? ORDER BY last_seen DESC LIMIT 1
    `).get(host.ip) as DatabaseRow | undefined;

    if (existingHost) {
      // Delete existing ports for this host
      this.db.prepare(`DELETE FROM ports WHERE host_id = ?`).run(existingHost.id);
      // Delete existing host
      this.db.prepare(`DELETE FROM hosts WHERE id = ?`).run(existingHost.id);
    }

    // Insert updated host
    const hostResult = this.db.prepare(`
      INSERT INTO hosts (scan_id, ip, hostname, status, os, last_seen)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      scanId,
      host.ip,
      host.hostname || null,
      host.status,
      host.os || null,
      host.lastSeen.toISOString()
    );

    const hostId = hostResult.lastInsertRowid;

    // Insert ports
    const insertPort = this.db.prepare(`
      INSERT INTO ports (host_id, port, protocol, state, service, version)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const port of host.ports) {
      insertPort.run(
        hostId,
        port.port,
        port.protocol,
        port.state,
        port.service,
        port.version || null
      );
    }

    console.log(`Updated host ${host.ip} in database with ${host.ports.length} ports`);
  }

  saveScanResult(scanResult: ScanResult): void {
    const insertScan = this.db.prepare(`
      INSERT INTO scans (id, timestamp, total_hosts, active_hosts, scan_duration, network)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertHost = this.db.prepare(`
      INSERT OR REPLACE INTO hosts (scan_id, ip, hostname, status, os, last_seen)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertPort = this.db.prepare(`
      INSERT INTO ports (host_id, port, protocol, state, service, version)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Use transaction for atomicity
    const transaction = this.db.transaction((result: ScanResult) => {
      // Insert scan
      insertScan.run(
        result.id,
        result.timestamp.toISOString(),
        result.totalHosts,
        result.activeHosts,
        result.scanDuration,
        result.network
      );

      // Insert hosts and their ports
      for (const host of result.hosts) {
        const hostResult = insertHost.run(
          result.id,
          host.ip,
          host.hostname || null,
          host.status,
          host.os || null,
          host.lastSeen.toISOString()
        );

        const hostId = hostResult.lastInsertRowid;

        // Insert ports for this host
        for (const port of host.ports) {
          insertPort.run(
            hostId,
            port.port,
            port.protocol,
            port.state,
            port.service,
            port.version || null
          );
        }
      }
    });

    transaction(scanResult);
  }

  getLatestScan(): ScanResult | null {
    const scanRow = this.db.prepare(`
      SELECT * FROM scans
      ORDER BY timestamp DESC
      LIMIT 1
    `).get() as DatabaseRow | undefined;

    if (!scanRow) {
      return null;
    }

    return this.buildScanResult(scanRow);
  }

  getScanById(scanId: string): ScanResult | null {
    const scanRow = this.db.prepare(`
      SELECT * FROM scans
      WHERE id = ?
    `).get(scanId) as DatabaseRow | undefined;

    if (!scanRow) {
      return null;
    }

    return this.buildScanResult(scanRow);
  }

  getScanHistory(limit: number = 10): ScanResult[] {
    const scanRows = this.db.prepare(`
      SELECT * FROM scans
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit) as DatabaseRow[];

    return scanRows.map(row => this.buildScanResult(row));
  }

  private buildScanResult(scanRow: DatabaseRow): ScanResult {
    const hosts = this.getHostsForScan(scanRow.id as string);

    return {
      id: scanRow.id as string,
      timestamp: new Date(scanRow.timestamp as string),
      totalHosts: scanRow.total_hosts as number,
      activeHosts: scanRow.active_hosts as number,
      scanDuration: scanRow.scan_duration as number,
      network: scanRow.network as string || 'unknown',
      hosts,
    };
  }

  private getHostsForScan(scanId: string): Host[] {
    const hostRows = this.db.prepare(`
      SELECT * FROM hosts
      WHERE scan_id = ?
    `).all(scanId) as DatabaseRow[];

    return hostRows.map(hostRow => {
      const ports = this.getPortsForHost(hostRow.id as number);

      return {
        ip: hostRow.ip as string,
        hostname: hostRow.hostname || undefined,
        status: hostRow.status as string,
        os: hostRow.os || undefined,
        lastSeen: new Date(hostRow.last_seen as string),
        ports,
      };
    });
  }

  private getPortsForHost(hostId: number): Port[] {
    const portRows = this.db.prepare(`
      SELECT * FROM ports
      WHERE host_id = ?
    `).all(hostId) as DatabaseRow[];

    return portRows.map(portRow => ({
      port: portRow.port as number,
      protocol: portRow.protocol as string,
      state: portRow.state as string,
      service: portRow.service as string,
      version: portRow.version || undefined,
    }));
  }

  getHostHistory(ip: string, limit: number = 10): Host[] {
    const hostRows = this.db.prepare(`
      SELECT h.*, s.timestamp as scan_timestamp
      FROM hosts h
      JOIN scans s ON h.scan_id = s.id
      WHERE h.ip = ?
      ORDER BY s.timestamp DESC
      LIMIT ?
    `).all(ip, limit) as DatabaseRow[];

    return hostRows.map(hostRow => {
      const ports = this.getPortsForHost(hostRow.id as number);

      return {
        ip: hostRow.ip as string,
        hostname: hostRow.hostname || undefined,
        status: hostRow.status as string,
        os: hostRow.os || undefined,
        lastSeen: new Date(hostRow.last_seen as string),
        ports,
      };
    });
  }

  getAllActiveHosts(): Host[] {
    // Get the latest scan
    const latestScan = this.getLatestScan();
    if (!latestScan) {
      return [];
    }

    // Return only hosts with status 'up'
    return latestScan.hosts.filter(host => host.status === 'up');
  }

  getStats(): Stats {
    try {
      const totalScans = this.db.prepare('SELECT COUNT(*) as count FROM scans').get() as DatabaseRow;
      const totalHosts = this.db.prepare('SELECT COUNT(DISTINCT ip) as count FROM hosts').get() as DatabaseRow;
      
      const latestScan = this.getLatestScan();
      
      return {
        totalScans: (totalScans?.count as number) || 0,
        uniqueHostsSeen: (totalHosts?.count as number) || 0,
        currentActiveHosts: latestScan?.activeHosts || 0,
        lastScanTime: latestScan?.timestamp || null,
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      // Return default stats if there's an error
      return {
        totalScans: 0,
        uniqueHostsSeen: 0,
        currentActiveHosts: 0,
        lastScanTime: null,
      };
    }
  }

  setFriendlyName(ip: string, friendlyName: string): void {
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO friendly_names (ip, friendly_name, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(ip) DO UPDATE SET
        friendly_name = excluded.friendly_name,
        updated_at = excluded.updated_at
    `);
    
    stmt.run(ip, friendlyName, now, now);
    console.log(`Set friendly name for ${ip}: ${friendlyName}`);
  }

  getFriendlyName(ip: string): string | null {
    const stmt = this.db.prepare('SELECT friendly_name FROM friendly_names WHERE ip = ?');
    const result = stmt.get(ip) as { friendly_name: string } | undefined;
    return result?.friendly_name || null;
  }

  getAllFriendlyNames(): Record<string, string> {
    const stmt = this.db.prepare('SELECT ip, friendly_name FROM friendly_names');
    const results = stmt.all() as Array<{ ip: string; friendly_name: string }>;
    
    const friendlyNames: Record<string, string> = {};
    for (const row of results) {
      friendlyNames[row.ip] = row.friendly_name;
    }
    return friendlyNames;
  }

  deleteFriendlyName(ip: string): void {
    const stmt = this.db.prepare('DELETE FROM friendly_names WHERE ip = ?');
    stmt.run(ip);
    console.log(`Deleted friendly name for ${ip}`);
  }

  saveVulnerabilities(ip: string, vulnerabilities: import('./types').Vulnerability[]): void {
    if (vulnerabilities.length === 0) {
      console.log(`No vulnerabilities to save for ${ip}`);
      return;
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO vulnerabilities 
      (ip, vuln_id, name, severity, description, reference, matched_at, curl_command, tags, discovered_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();

    const transaction = this.db.transaction((vulns: import('./types').Vulnerability[]) => {
      for (const vuln of vulns) {
        stmt.run(
          ip,
          vuln.id,
          vuln.name,
          vuln.severity,
          vuln.description || null,
          vuln.reference ? JSON.stringify(vuln.reference) : null,
          vuln.matched_at || null,
          vuln.curl_command || null,
          vuln.tags ? JSON.stringify(vuln.tags) : null,
          now
        );
      }
    });

    transaction(vulnerabilities);
    console.log(`Saved ${vulnerabilities.length} vulnerabilities for ${ip}`);
  }

  getVulnerabilities(ip: string): import('./types').Vulnerability[] {
    const stmt = this.db.prepare(`
      SELECT * FROM vulnerabilities WHERE ip = ? ORDER BY 
      CASE severity 
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
        WHEN 'info' THEN 5
      END
    `);
    const rows = stmt.all(ip) as Array<{
      vuln_id: string;
      name: string;
      severity: string;
      description: string | null;
      reference: string | null;
      matched_at: string | null;
      curl_command: string | null;
      tags: string | null;
      discovered_at: string;
    }>;

    return rows.map(row => ({
      id: row.vuln_id,
      name: row.name,
      severity: row.severity as 'info' | 'low' | 'medium' | 'high' | 'critical',
      description: row.description || undefined,
      reference: row.reference ? JSON.parse(row.reference) : undefined,
      matched_at: row.matched_at || undefined,
      curl_command: row.curl_command || undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
    }));
  }

  getLastVulnScanTime(ip: string): Date | null {
    const stmt = this.db.prepare(`
      SELECT MAX(discovered_at) as last_scan FROM vulnerabilities WHERE ip = ?
    `);
    const result = stmt.get(ip) as { last_scan: string | null } | undefined;
    return result?.last_scan ? new Date(result.last_scan) : null;
  }

  close() {
    this.db.close();
  }
}

