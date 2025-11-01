export interface ScanProfile {
  name: string;
  description: string;
  command: string;
  requiresRoot: boolean;
  estimatedTime: string;
}

export const SCAN_PROFILES: Record<string, ScanProfile> = {
  quick: {
    name: 'Quick Discovery',
    description: 'Fast host discovery with top 100 ports',
    command: '-sT -T3 -F --top-ports 100 -R --system-dns -Pn --max-retries 2',
    requiresRoot: false,
    estimatedTime: '30-60 seconds',
  },

  comprehensive_noroot: {
    name: 'Comprehensive (No Root)',
    description: 'Service detection on top 1000 ports without OS detection',
    command: '-sT -sV -T3 --top-ports 1000 -R --system-dns -Pn --version-intensity 5 --max-retries 2',
    requiresRoot: false,
    estimatedTime: '5-8 minutes',
  },
  
  standard: {
    name: 'Standard Scan',
    description: 'Host discovery with common port scanning',
    command: '-sS -T4 -F',
    requiresRoot: true,
    estimatedTime: '1-2 minutes',
  },
  
  detailed: {
    name: 'Detailed Scan',
    description: 'Comprehensive scan with service detection',
    command: '-sV -T3 --top-ports 1000 --max-retries 2',
    requiresRoot: false,
    estimatedTime: '2-5 minutes',
  },
  
  comprehensive: {
    name: 'Comprehensive Scan with OS',
    description: 'Full scan with OS and service detection (requires sudo)',
    command: '-sS -sV -O -T3 --osscan-guess --top-ports 1000 -R --system-dns -Pn --version-intensity 5 --max-retries 2',
    requiresRoot: true,
    estimatedTime: '5-10 minutes',
  },

  allports: {
    name: 'All Ports Scan',
    description: 'Scan all 65535 ports with service detection (very slow)',
    command: '-sT -sV -p- -T3 -R --system-dns -Pn --version-intensity 5 --max-retries 2',
    requiresRoot: false,
    estimatedTime: '15-30 minutes',
  },
};

export function getScanProfile(profileName: string = 'quick'): ScanProfile {
  return SCAN_PROFILES[profileName] || SCAN_PROFILES.quick;
}

