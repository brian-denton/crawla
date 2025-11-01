export interface ScanProfile {
  name: string;
  description: string;
  command: string;
  requiresRoot: boolean;
  estimatedTime: string;
}

export const SCAN_PROFILES: Record<string, ScanProfile> = {
  // Note: NSE scripts (-sC flag) removed from default profiles due to common installation issues
  // If you want to use NSE scripts, ensure nmap is fully installed with: brew install nmap
  // Or use the 'vuln' profile which includes vulnerability scanning scripts
  quick: {
    name: 'Quick Discovery',
    description: 'Fast host and port discovery (100 most common ports)',
    command: '-sT -T4 -F --top-ports 100 -Pn --max-retries 1 --min-rate 100',
    requiresRoot: false,
    estimatedTime: '15-30 seconds',
  },

  comprehensive_noroot: {
    name: 'Comprehensive (No Root)',
    description: 'Service version detection on top 1000 ports',
    command: '-sT -sV -T4 --top-ports 1000 -Pn --version-intensity 5 --max-retries 2 --min-rate 50',
    requiresRoot: false,
    estimatedTime: '3-6 minutes',
  },
  
  standard: {
    name: 'Standard SYN Scan',
    description: 'Fast SYN stealth scan with service detection (requires sudo)',
    command: '-sS -sV -T4 -F --version-light -Pn --max-retries 1 --min-rate 100',
    requiresRoot: true,
    estimatedTime: '45-90 seconds',
  },
  
  detailed: {
    name: 'Detailed Analysis',
    description: 'Thorough service detection with deep version probing',
    command: '-sT -sV -T4 --top-ports 1000 --version-intensity 7 --max-retries 2 -Pn',
    requiresRoot: false,
    estimatedTime: '4-8 minutes',
  },
  
  comprehensive: {
    name: 'Comprehensive with OS Detection',
    description: 'Full scan: services, OS detection on top 1000 ports (requires sudo)',
    command: '-sS -sV -O -T4 --top-ports 1000 --osscan-guess --version-intensity 6 -Pn --max-retries 2 --defeat-rst-ratelimit --min-rate 50',
    requiresRoot: true,
    estimatedTime: '4-8 minutes',
  },

  allports: {
    name: 'Complete Port Scan',
    description: 'All 65,535 ports with service detection (very thorough)',
    command: '-sT -sV -p- -T4 -Pn --version-intensity 5 --max-retries 2 --min-rate 300',
    requiresRoot: false,
    estimatedTime: '10-20 minutes',
  },
  
  stealth: {
    name: 'Stealth Scan',
    description: 'Slow, quiet scan to evade detection (requires sudo)',
    command: '-sS -T2 -F --max-retries 1 -Pn --data-length 25',
    requiresRoot: true,
    estimatedTime: '5-10 minutes',
  },
  
  udp: {
    name: 'UDP Service Scan',
    description: 'Scan most common UDP ports and services',
    command: '-sU -T4 --top-ports 100 -Pn --max-retries 1 --version-intensity 0',
    requiresRoot: true,
    estimatedTime: '3-5 minutes',
  },
  
  vuln: {
    name: 'Vulnerability Scan (Advanced)',
    description: 'NSE vulnerability scripts on common ports (requires full nmap install)',
    command: '-sT -sV -sC -T4 --top-ports 100 -Pn --script vuln --max-retries 2',
    requiresRoot: false,
    estimatedTime: '5-10 minutes',
  },
};

export function getScanProfile(profileName: string = 'quick'): ScanProfile {
  return SCAN_PROFILES[profileName] || SCAN_PROFILES.quick;
}

