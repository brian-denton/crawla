import { exec } from 'child_process';
import { promisify } from 'util';
import * as dns from 'dns';
import { Host, Port, ScanResult } from './types';
import { DatabaseManager } from './database';
import { getScanProfile } from './scan-profiles';
import { ScanLogger } from './scan-logger';

const execAsync = promisify(exec);
const dnsReverse = promisify(dns.reverse);

export class NetworkScanner {
  private static instance: NetworkScanner;
  private isScanning: boolean = false;
  private db: DatabaseManager;
  private logger: ScanLogger;
  private scanStatus: {
    phase: 'idle' | 'discovery' | 'port_scan' | 'processing';
    message: string;
    hostsFound?: number;
  } = {
    phase: 'idle',
    message: 'Ready',
  };

  private constructor() {
    this.db = DatabaseManager.getInstance();
    this.logger = ScanLogger.getInstance();
  }

  static getInstance(): NetworkScanner {
    if (!NetworkScanner.instance) {
      NetworkScanner.instance = new NetworkScanner();
    }
    return NetworkScanner.instance;
  }

  async scan(network: string, profileName: string = 'quick'): Promise<ScanResult> {
    if (this.isScanning) {
      const msg = 'Scan already in progress';
      this.logger.warning(msg);
      throw new Error(msg);
    }

    this.isScanning = true;
    const startTime = Date.now();

    try {
      // Check if nmap is installed
      this.logger.info('Checking for nmap installation...');
      try {
        await execAsync('which nmap');
        this.logger.success('nmap found');
      } catch {
        const msg = 'nmap is not installed. Please install nmap to use this feature.';
        this.logger.error(msg);
        throw new Error(msg);
      }

      const profile = getScanProfile(profileName);
      this.logger.info(`Starting ${profile.name} on ${network}`);
      this.logger.info(`Expected duration: ${profile.estimatedTime}`);

      // Phase 1: Host Discovery (Ping Scan)
      this.scanStatus = {
        phase: 'discovery',
        message: 'Performing host discovery (ping scan)...',
      };
      this.logger.info('Phase 1: Performing host discovery (ping scan)...');
      const liveHosts = await this.discoverLiveHosts(network);
      
      if (liveHosts.length === 0) {
        this.logger.warning('No live hosts found during discovery phase');
        this.scanStatus = { phase: 'idle', message: 'Ready' };
        const scanDuration = Date.now() - startTime;
        const emptyResult: ScanResult = {
          id: `scan_${Date.now()}`,
          timestamp: new Date(),
          hosts: [],
          totalHosts: 0,
          activeHosts: 0,
          scanDuration,
          network,
        };
        this.db.saveScanResult(emptyResult);
        return emptyResult;
      }

      this.logger.success(`✓ Discovered ${liveHosts.length} live hosts`);
      
      // Phase 2: Port Scanning
      this.scanStatus = {
        phase: 'port_scan',
        message: `Scanning ports on ${liveHosts.length} hosts`,
        hostsFound: liveHosts.length,
      };
      this.logger.info(`Phase 2: Port scanning ${liveHosts.length} hosts`);

      // Build nmap command for live hosts only
      const targets = liveHosts.join(' ');
      const nmapCommand = `nmap ${profile.command} ${targets} -oX -`;
      this.logger.info(`Executing: ${nmapCommand}`);

      // Set timeout based on profile (comprehensive scans need more time)
      const timeout = profile.requiresRoot || profileName.includes('comprehensive') 
        ? 15 * 60 * 1000  // 15 minutes for comprehensive/root scans
        : 10 * 60 * 1000; // 10 minutes for others

      const { stdout, stderr } = await execAsync(
        nmapCommand,
        { 
          maxBuffer: 1024 * 1024 * 10, // 10MB buffer
          timeout,
          // Don't reject on non-zero exit if we got output (nmap sometimes exits non-zero with RTTVAR warnings)
          encoding: 'utf8'
        }
      ).catch((error) => {
        // If command failed but we have stdout with XML, use it
        if (error.stdout && error.stdout.includes('<?xml')) {
          this.logger.warning('Nmap completed with warnings, but output is valid');
          return { stdout: error.stdout, stderr: error.stderr || '' };
        }
        throw error;
      });

      if (stderr) {
        // Filter out common nmap warnings that aren't actual errors
        const filteredStderr = stderr
          .split('\n')
          .filter(line => {
            const trimmed = line.trim();
            // Filter out RTTVAR timing warnings (these are normal for slow networks)
            if (trimmed.includes('RTTVAR has grown')) return false;
            if (trimmed.includes('decreasing to')) return false;
            // Filter out timing adjustment messages
            if (trimmed.includes('Timing:')) return false;
            // Filter out stats updates
            if (trimmed.includes('Stats:')) return false;
            // Filter out other common benign messages
            if (trimmed.includes('Increasing send delay')) return false;
            if (trimmed.includes('Discovered open port')) return false;
            return trimmed.length > 0;
          })
          .join('\n');

        if (filteredStderr) {
          this.logger.warning(`nmap warnings: ${filteredStderr.substring(0, 300)}`);
        } else {
          this.logger.info('nmap completed with only benign timing adjustments (filtered)');
        }
      }

      // Phase 3: Processing Results
      this.scanStatus = {
        phase: 'processing',
        message: 'Processing scan results...',
        hostsFound: liveHosts.length,
      };
      this.logger.info('nmap scan completed, parsing results...');

      // Validate we have XML output
      if (!stdout || !stdout.includes('<?xml')) {
        const msg = 'No valid XML output from nmap. The scan may have failed.';
        this.logger.error(msg);
        throw new Error(msg);
      }

      const hosts = this.parseNmapXML(stdout);
      const upHosts = hosts.filter(h => h.status === 'up').length;
      const downHosts = hosts.filter(h => h.status === 'down').length;
      
      this.logger.success(`Parsed ${hosts.length} total hosts (${upHosts} up, ${downHosts} down)`);
      
      // Try to resolve hostnames for hosts that don't have one
      this.logger.info('Resolving hostnames...');
      await this.resolveHostnames(hosts);
      this.logger.success('Hostname resolution complete');

      const scanDuration = Date.now() - startTime;
      const activeHosts = hosts.filter(h => h.status === 'up').length;

      const scanResult: ScanResult = {
        id: `scan_${Date.now()}`,
        timestamp: new Date(),
        hosts,
        totalHosts: hosts.length,
        activeHosts,
        scanDuration,
        network,
      };

      // Apply friendly names to hosts
      const friendlyNames = this.db.getAllFriendlyNames();
      hosts.forEach(host => {
        if (friendlyNames[host.ip]) {
          host.friendlyName = friendlyNames[host.ip];
        }
      });

      // Save scan result to database
      this.logger.info('Saving scan results to database...');
      this.db.saveScanResult(scanResult);
      
      this.logger.success(`✓ Scan completed in ${(scanDuration / 1000).toFixed(1)}s`);
      this.logger.success(`✓ Found ${activeHosts} active hosts with ${hosts.reduce((sum, h) => sum + h.ports.length, 0)} open ports`);

      return scanResult;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Scan failed: ${errorMsg}`);
      throw new Error(`Scan failed: ${errorMsg}`);
    } finally {
      this.isScanning = false;
      this.scanStatus = { phase: 'idle', message: 'Ready' };
    }
  }

  private async resolveHostnames(hosts: Host[]): Promise<void> {
    const resolutionPromises = hosts.map(async (host) => {
      // Skip if we already have a good hostname
      if (host.hostname && host.hostname !== host.ip) {
        return;
      }

      try {
        // Try reverse DNS lookup using Node's DNS resolver
        const hostnames = await dnsReverse(host.ip);
        if (hostnames && hostnames.length > 0) {
          // Use the first hostname, removing trailing dots
          host.hostname = hostnames[0].replace(/\.$/, '');
          this.logger.info(`Resolved ${host.ip} → ${host.hostname}`);
        }
      } catch {
        // DNS resolution failed - hostname will remain unresolved
        // Don't log every failure to avoid spam
      }
    });

    // Wait for all resolutions to complete (with a timeout)
    await Promise.allSettled(resolutionPromises);
  }

  private parseNmapXML(xmlData: string): Host[] {
    const hosts: Host[] = [];
    
    console.log('Parsing XML data...');
    
    // Simple XML parsing - in production, use a proper XML parser
    const hostMatches = xmlData.matchAll(/<host[^>]*>[\s\S]*?<\/host>/g);
    
    let hostCount = 0;
    for (const hostMatch of hostMatches) {
      const hostXML = hostMatch[0];
      
      // Extract IP address
      const ipMatch = hostXML.match(/<address addr="([^"]+)" addrtype="ipv4"/);
      if (!ipMatch) continue;
      const ip = ipMatch[1];
      
      // Extract hostname (try multiple patterns)
      let hostname: string | undefined;
      const hostnameMatch = hostXML.match(/<hostname name="([^"]+)"/);
      if (hostnameMatch) {
        hostname = hostnameMatch[1];
      } else {
        // Try to get from hostnames section
        const hostnamesMatch = hostXML.match(/<hostnames>[\s\S]*?<hostname[^>]*name="([^"]+)"[\s\S]*?<\/hostnames>/);
        if (hostnamesMatch) {
          hostname = hostnamesMatch[1];
        }
      }
      
      // Extract MAC address vendor info as fallback identifier
      let macVendor: string | undefined;
      const macMatch = hostXML.match(/<address addr="([^"]+)" addrtype="mac"[^>]*vendor="([^"]+)"/);
      if (macMatch) {
        macVendor = macMatch[2];
        // If no hostname, use vendor as a friendly identifier
        if (!hostname) {
          hostname = `${macVendor} Device`;
        }
      }
      
      // Extract status
      const statusMatch = hostXML.match(/<status state="([^"]+)"/);
      const status = statusMatch ? statusMatch[1] : 'unknown';
      
      // Log all discovered hosts (including down ones)
      this.logger.info(`Found host ${ip} with status: ${status}`);
      
      // Extract OS (may not be present in simple scans)
      const osMatch = hostXML.match(/<osmatch name="([^"]+)"/);
      const os = osMatch ? osMatch[1] : undefined;
      
      // Extract ports
      const ports: Port[] = [];
      const portMatches = hostXML.matchAll(/<port protocol="([^"]+)" portid="([^"]+)">[\s\S]*?<\/port>/g);
      
      for (const portMatch of portMatches) {
        const portXML = portMatch[0];
        const protocol = portMatch[1];
        const portNumber = parseInt(portMatch[2]);
        
        const stateMatch = portXML.match(/<state state="([^"]+)"/);
        const state = stateMatch ? stateMatch[1] : 'unknown';
        
        // Only include open ports
        if (state !== 'open' && state !== 'filtered') {
          continue;
        }
        
        // Extract service information
        const serviceMatch = portXML.match(/<service name="([^"]+)"(?:[^>]*product="([^"]+)")?(?:[^>]*version="([^"]+)")?/);
        const service = serviceMatch ? serviceMatch[1] : 'unknown';
        
        let version: string | undefined;
        if (serviceMatch && serviceMatch[2]) {
          version = serviceMatch[2];
          if (serviceMatch[3]) {
            version += ` ${serviceMatch[3]}`;
          }
          version = version.trim();
        }
        
        ports.push({
          port: portNumber,
          protocol,
          state,
          service,
          version,
        });
      }
      
      hosts.push({
        ip,
        hostname,
        status,
        os,
        ports,
        lastSeen: new Date(),
      });
      
      hostCount++;
      console.log(`Parsed host ${hostCount}: ${ip}${hostname ? ` (${hostname})` : ''} - ${ports.length} open ports`);
    }
    
    console.log(`Total hosts parsed: ${hostCount}`);
    
    // Remove duplicates by IP (keep the last occurrence which has the most complete data)
    const uniqueHosts = hosts.reduce((acc, host) => {
      acc.set(host.ip, host);
      return acc;
    }, new Map<string, Host>());
    
    const deduplicatedHosts = Array.from(uniqueHosts.values());
    
    if (hosts.length !== deduplicatedHosts.length) {
      this.logger.warning(`Removed ${hosts.length - deduplicatedHosts.length} duplicate host entries`);
    }
    
    return deduplicatedHosts;
  }

  getCurrentScan(): ScanResult | null {
    const scan = this.db.getLatestScan();
    if (scan) {
      // Apply friendly names and vulnerabilities to hosts
      const friendlyNames = this.db.getAllFriendlyNames();
      scan.hosts.forEach(host => {
        if (friendlyNames[host.ip]) {
          host.friendlyName = friendlyNames[host.ip];
        }
        // Load vulnerabilities for this host
        host.vulnerabilities = this.db.getVulnerabilities(host.ip);
        host.lastVulnScan = this.db.getLastVulnScanTime(host.ip) || undefined;
      });
    }
    return scan;
  }

  getScanHistory(): ScanResult[] {
    const history = this.db.getScanHistory(10);
    const friendlyNames = this.db.getAllFriendlyNames();
    
    // Apply friendly names to all scans in history
    history.forEach(scan => {
      scan.hosts.forEach(host => {
        if (friendlyNames[host.ip]) {
          host.friendlyName = friendlyNames[host.ip];
        }
      });
    });
    
    return history;
  }

  isCurrentlyScanning(): boolean {
    return this.isScanning;
  }

  getScanStatus() {
    return {
      isScanning: this.isScanning,
      ...this.scanStatus,
    };
  }

  private async discoverLiveHosts(network: string): Promise<string[]> {
    this.logger.info(`Discovering live hosts on ${network}...`);
    
    // Fast ping scan: -sn (no port scan), -T4 (aggressive timing), -PE -PP -PM (multiple ping types)
    // --min-rate 100: Fast discovery
    const discoveryCommand = `nmap -sn -T4 -PE -PP -PM --min-rate 100 ${network} -oX -`;
    this.logger.info(`Discovery command: ${discoveryCommand}`);

    try {
      const { stdout } = await execAsync(
        discoveryCommand,
        {
          maxBuffer: 1024 * 1024 * 10,
          timeout: 2 * 60 * 1000, // 2 minute timeout for host discovery
          encoding: 'utf8'
        }
      ).catch((error) => {
        if (error.stdout && error.stdout.includes('<?xml')) {
          return { stdout: error.stdout, stderr: error.stderr || '' };
        }
        throw error;
      });

      // Parse XML to extract live hosts
      const liveHosts: string[] = [];
      const hostMatches = stdout.matchAll(/<host[^>]*>[\s\S]*?<\/host>/g);

      for (const hostMatch of hostMatches) {
        const hostXML = hostMatch[0];
        
        // Extract IP address
        const ipMatch = hostXML.match(/<address addr="([^"]+)" addrtype="ipv4"/);
        if (!ipMatch) continue;
        const ip = ipMatch[1];
        
        // Check if host is up
        const statusMatch = hostXML.match(/<status state="([^"]+)"/);
        const status = statusMatch ? statusMatch[1] : 'unknown';
        
        if (status === 'up') {
          liveHosts.push(ip);
          this.logger.info(`  ✓ ${ip} is alive`);
        }
      }

      this.logger.success(`Host discovery complete: ${liveHosts.length} live hosts found`);
      return liveHosts;

    } catch (error) {
      this.logger.error(`Host discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Fall back to scanning the full network if discovery fails
      this.logger.warning('Falling back to full network scan');
      return [network];
    }
  }

  async scanSingleHost(ip: string): Promise<Host> {
    if (this.isScanning) {
      const msg = 'Scan already in progress';
      this.logger.warning(msg);
      throw new Error(msg);
    }

    this.isScanning = true;
    const startTime = Date.now();

    try {
      // Check if nmap is installed
      this.logger.info('Checking for nmap installation...');
      try {
        await execAsync('which nmap');
        this.logger.success('nmap found');
      } catch {
        const msg = 'nmap is not installed. Please install nmap to use this feature.';
        this.logger.error(msg);
        throw new Error(msg);
      }

      this.logger.info(`Starting comprehensive scan on single host: ${ip}`);
      this.logger.info('Scanning all 65,535 ports with OS and service detection');

      // Comprehensive single-host scan: all ports, OS detection, service versions
      // Optimized for thorough analysis of a single host
      // -p-: All 65,535 ports
      // -sV: Version detection (intensity 7 = thorough but not exhaustive)
      // -O: OS detection with aggressive guessing
      // -T4: Aggressive timing (suitable for reliable networks)
      // -Pn: Skip host discovery (we know host is up)
      // --version-intensity 7: Thorough version probing
      // --osscan-guess: Aggressively guess OS
      // --max-retries 3: More retries for accuracy on single host
      // --min-rate 100: Minimum packet send rate
      // --defeat-rst-ratelimit: More accurate results when RST rate limiting is in effect
      // Note: -sC (NSE scripts) removed to avoid dependency issues. Add manually if needed.
      const nmapCommand = `nmap -p- -sV -O -T4 -Pn --version-intensity 7 --osscan-guess --max-retries 3 --min-rate 100 --defeat-rst-ratelimit ${ip} -oX -`;
      this.logger.info(`Executing: ${nmapCommand}`);

      const { stdout, stderr } = await execAsync(
        nmapCommand,
        {
          maxBuffer: 1024 * 1024 * 10, // 10MB buffer
          timeout: 30 * 60 * 1000, // 30 minute timeout for full port scan
          encoding: 'utf8'
        }
      ).catch((error) => {
        // If command failed but we have stdout with XML, use it
        if (error.stdout && error.stdout.includes('<?xml')) {
          this.logger.warning('Nmap completed with warnings, but output is valid');
          return { stdout: error.stdout, stderr: error.stderr || '' };
        }
        throw error;
      });

      if (stderr) {
        // Filter out common nmap warnings
        const filteredStderr = stderr
          .split('\n')
          .filter(line => {
            const trimmed = line.trim();
            if (trimmed.includes('RTTVAR has grown')) return false;
            if (trimmed.includes('decreasing to')) return false;
            if (trimmed.includes('Timing:')) return false;
            if (trimmed.includes('Stats:')) return false;
            if (trimmed.includes('Increasing send delay')) return false;
            if (trimmed.includes('Discovered open port')) return false;
            return trimmed.length > 0;
          })
          .join('\n');

        if (filteredStderr) {
          this.logger.warning(`nmap warnings: ${filteredStderr.substring(0, 300)}`);
        }
      }

      this.logger.info('Single host scan completed, parsing results...');

      // Validate we have XML output
      if (!stdout || !stdout.includes('<?xml')) {
        const msg = 'No valid XML output from nmap. The scan may have failed.';
        this.logger.error(msg);
        throw new Error(msg);
      }

      const hosts = this.parseNmapXML(stdout);
      
      if (hosts.length === 0) {
        const msg = `No host data returned for ${ip}`;
        this.logger.error(msg);
        throw new Error(msg);
      }

      const host = hosts[0];
      const scanDuration = Date.now() - startTime;

      this.logger.success(`✓ Single host scan completed in ${(scanDuration / 1000).toFixed(1)}s`);
      this.logger.success(`✓ Found ${host.ports.length} open ports`);
      if (host.os) {
        this.logger.success(`✓ Detected OS: ${host.os}`);
      }

      // Try to resolve hostname if not already detected
      if (!host.hostname || host.hostname === host.ip) {
        this.logger.info('Resolving hostname...');
        await this.resolveHostnames([host]);
      }

      // Apply friendly name if exists
      const friendlyNames = this.db.getAllFriendlyNames();
      if (friendlyNames[host.ip]) {
        host.friendlyName = friendlyNames[host.ip];
      }

      // Update the host in the database
      this.db.updateHost(host);

      this.logger.success('✓ Database updated with new host information');

      return host;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Single host scan failed: ${errorMsg}`);
      throw new Error(`Single host scan failed: ${errorMsg}`);
    } finally {
      this.isScanning = false;
    }
  }

  getStats() {
    return this.db.getStats();
  }

  getHostHistory(ip: string) {
    return this.db.getHostHistory(ip);
  }

  getAllActiveHosts(): Host[] {
    return this.db.getAllActiveHosts();
  }
}

