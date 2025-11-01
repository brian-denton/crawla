# Crawla - Network Scanner & Vulnerability Assessment Dashboard

A modern, real-time network scanning and vulnerability assessment dashboard built with Next.js, Shadcn UI, and Tailwind CSS. Crawla provides automated network monitoring using Nmap to discover hosts, open ports, services, and operating systems, plus integrated Nuclei vulnerability scanning for security assessment.

![Dashboard Preview](https://via.placeholder.com/800x400?text=Crawla+Dashboard)

## Features

- 🔍 **Network Scanning**: Automated two-phase Nmap scanning (ping discovery + targeted port scanning)
- 🛡️ **Vulnerability Scanning**: Integrated Nuclei scanner for CVE detection and security assessment
- ⚙️ **Multiple Scan Profiles**: Choose from 8 optimized scan profiles ranging from quick (30s) to comprehensive (30min)
- 💾 **Profile Persistence**: Your preferred scan profile is saved and used for all automatic scans
- ⏰ **Smart Scheduling**: Automatic scanning every 10 minutes using your chosen profile
- 🎯 **User-Controlled**: You trigger the first scan and choose the profile - no automatic scanning on startup
- 🌓 **Dark Mode**: Beautiful light and dark themes
- 📊 **Real-time Dashboard**: Live statistics and host information with severity-based vulnerability alerts
- 🖥️ **Service Detection**: Identifies running services and versions on up to 1000 ports
- 🛡️ **OS Detection**: Detects operating systems on discovered hosts (with sudo)
- 📡 **Port Scanning**: Lists all open ports with service information
- 🏷️ **Friendly Names**: Add custom names to hosts that persist across scans
- 📝 **Live Logs**: View real-time Nmap scan logs with download and clear options
- ⚠️ **Security Alerts**: View discovered vulnerabilities with CVSS severity ratings (CRITICAL, HIGH, MEDIUM, LOW, INFO)
- 💾 **SQLite Database**: Persistent storage for scan results, host data, and vulnerabilities
- 📈 **Scan History**: Track network changes over time
- 🔎 **Host History**: View historical data for individual hosts
- 🌐 **Hostname Resolution**: Multiple DNS resolution strategies including reverse DNS and MAC vendor lookup

## Prerequisites

Before running this application, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **pnpm** (or npm/yarn)
- **Nmap** - Network scanning tool
- **Nuclei** - Vulnerability scanning tool (optional but recommended)

### Installing Nmap

**macOS:**
```bash
brew install nmap
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install nmap
```

**Fedora/RHEL:**
```bash
sudo dnf install nmap
```

**Windows:**
Download from [nmap.org](https://nmap.org/download.html)

### Installing Nuclei

Nuclei is a fast, customizable vulnerability scanner powered by the global security community. It's used for detecting security issues, CVEs, misconfigurations, and more.

**macOS:**
```bash
brew install nuclei

# Update Nuclei templates (recommended)
nuclei -update-templates
```

**Linux:**
```bash
# Using Go (requires Go 1.21+)
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# Or download binary directly
wget https://github.com/projectdiscovery/nuclei/releases/latest/download/nuclei_3.4.10_linux_amd64.zip
unzip nuclei_3.4.10_linux_amd64.zip
sudo mv nuclei /usr/local/bin/

# Update templates
nuclei -update-templates
```

**Windows:**
```powershell
# Using scoop
scoop install nuclei

# Update templates
nuclei -update-templates
```

**Docker:**
```bash
docker pull projectdiscovery/nuclei:latest
```

**Verify Installation:**
```bash
nuclei -version
nuclei -update-templates
```

For more installation options, see the [official Nuclei documentation](https://docs.projectdiscovery.io/tools/nuclei/install).

**Note:** Nuclei is optional. If not installed, the vulnerability scanning feature will be disabled, but all other features will work normally.

## Getting Started

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd crawla
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Configure your network** (optional)
Create a `.env` file in the project root:
```bash
cp .env.example .env
```

Edit `.env` and set your network:
```env
SCAN_NETWORK=192.168.1.0/24
```

4. **Run the development server**
```bash
pnpm dev
```

5. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### First Time Setup

When you first open Crawla, you'll see a welcome prompt asking you to:

1. **Select a Scan Profile** - Choose from 8 different profiles based on your needs (Quick, Comprehensive, etc.)
2. **Run Your First Scan** - Click the "Run Scan" button to start

Your chosen profile will be saved and used for all future automatic scans. The application will then automatically scan your network every 10 minutes using your preferred profile.

### Dashboard Overview

The dashboard displays:
- **Total Hosts**: Number of devices discovered on the network
- **Active Hosts**: Number of devices currently online
- **Last Scan**: Timestamp and duration of the most recent scan
- **Next Scan**: Countdown to the next scheduled scan
- **Profile Status**: Shows which profile is being used for automatic scans

### Manual Scanning

Click the **"Run Scan"** button in the top-right corner to trigger an immediate network scan. You can change the scan profile at any time:

1. Select a different profile from the dropdown
2. Click "Run Scan"
3. The new profile will be saved and used for all future automatic scans

The button will show:
- **"Discovering hosts..."** - During ping discovery phase
- **"Scanning ports on X hosts"** - During port scanning phase
- **"Processing results..."** - While parsing and saving results

### Host Cards

Each discovered host is displayed in a card showing:
- IP address and hostname
- Online/offline status
- Detected operating system
- Open ports with service information
- Service versions
- Discovered vulnerabilities (if scanned with Nuclei)
- Last seen timestamp

**Host Card Actions:**
- 🔍 **Nmap Scan Button**: Run a comprehensive Nmap scan on this specific host (all 65,535 ports, OS detection, service versions)
- 🛡️ **Nuclei Scan Button**: Run a vulnerability scan on this host to detect CVEs and security issues
- 📋 **Copy Port Button**: Click the copy icon next to any port to copy `IP:PORT` to clipboard
- ✏️ **Edit Friendly Name**: Add or edit a custom name for the host

### Vulnerability Scanning

Crawla integrates Nuclei for professional-grade vulnerability assessment:

1. **Click the shield icon (🛡️)** on any host card
2. **Wait for the scan** to complete (typically 2-10 minutes)
3. **View results** displayed directly in the card with severity badges

**Vulnerability Information Includes:**
- Vulnerability name and ID (CVE-XXXX-XXXXX)
- Severity level (CRITICAL, HIGH, MEDIUM, LOW, INFO)
- Description and reference links
- Tags (cve, rce, xss, sql, etc.)
- Discovery timestamp

**Severity Color Coding:**
- 🔴 **CRITICAL/HIGH**: Red badges (immediate action required)
- 🟡 **MEDIUM**: Blue badges (review and patch)
- ⚪ **LOW/INFO**: Gray badges (informational)

**What Nuclei Scans For:**
- Known CVEs and security vulnerabilities
- Misconfigurations and exposed services
- Default credentials and weak authentication
- Information disclosure
- SQL injection, XSS, and other web vulnerabilities
- Subdomain takeovers
- SSL/TLS issues
- And much more (10,000+ templates)

### Dark Mode Toggle

Click the sun/moon icon in the top-right corner to switch between light and dark themes. Your preference is saved automatically.

## Configuration

### Network Range

The target network is configured via the `SCAN_NETWORK` environment variable.

1. **Create a `.env` file** in the project root:
```bash
cp .env.example .env
```

2. **Edit the `.env` file** and set your network:
```env
# Scan your home network (default)
SCAN_NETWORK=192.168.1.0/24

# Or scan a different network
SCAN_NETWORK=10.0.0.0/24

# Or a larger network (warning: takes longer)
SCAN_NETWORK=192.168.0.0/16
```

3. **Restart the development server** for changes to take effect:
```bash
pnpm dev
```

**Common Network Ranges:**
- `192.168.1.0/24` - Scans 254 hosts (192.168.1.1 to 192.168.1.254)
- `10.0.0.0/24` - Scans 254 hosts (10.0.0.1 to 10.0.0.254)
- `192.168.0.0/16` - Scans 65,534 hosts ⚠️ **WARNING: Very large scan, may take hours**

### Scan Interval

The default scan frequency is **10 minutes**. To change this:

1. Open `app/api/scan/scheduled/route.ts`
2. Find the line with `setInterval` in the `initializeScheduledScanning` function
3. Change `10 * 60 * 1000` to your desired interval in milliseconds

```typescript
// Example: Change to 5 minutes
scheduledScanInterval = setInterval(async () => {
  // ...
}, 5 * 60 * 1000); // 5 minutes
```

### Scan Profiles

The application supports **8 optimized scan profiles** based on Nmap best practices.

**Quick Discovery** ⚡
- Fast host and port discovery (100 most common ports)
- TCP connect scan with aggressive timing (T4)
- No root required
- Estimated time: **15-30 seconds**
- Best for: Rapid network overview

**Comprehensive (No Root)** ⭐ **Default**
- Service version detection on top 1000 ports
- Optimized packet rate (min-rate 50)
- No root required (TCP connect scan)
- Estimated time: **3-6 minutes**
- Best for: Detailed service information without sudo

**Standard SYN Scan** 🔐
- Fast SYN stealth scan with light version detection
- Quick service identification
- **Requires root/sudo**
- Estimated time: **45-90 seconds**
- Best for: Fast, stealthy scanning

**Detailed Analysis** 🔬
- Thorough service detection
- Version intensity 7 (very thorough)
- No root required
- Estimated time: **4-8 minutes**
- Best for: In-depth service analysis

**Comprehensive with OS Detection** 🎯 🔐
- Full scan: services, OS on top 1000 ports
- OS fingerprinting with aggressive guessing
- **Requires root/sudo**
- Estimated time: **4-8 minutes**
- Best for: Complete host profiling

**Complete Port Scan** 📊
- Scans **all 65,535 ports**
- Service version detection
- No root required
- Estimated time: **10-20 minutes**
- Best for: Exhaustive port discovery

**Stealth Scan** 🥷 🔐
- Slow, quiet scan to evade IDS/IPS
- T2 timing (polite, low bandwidth)
- **Requires root/sudo**
- Estimated time: **5-10 minutes**
- Best for: Reconnaissance in monitored environments

**UDP Service Scan** 📡 🔐
- Scans top 100 UDP ports
- Identifies DNS, DHCP, SNMP services
- **Requires root/sudo**
- Estimated time: **3-5 minutes**
- Best for: Discovering UDP-based services

#### Running Scans with Root Access

Several scan profiles require root privileges for advanced features:

```bash
sudo pnpm dev
```

🔐 **Profiles Requiring Root/Sudo:**
- Standard SYN Scan, Comprehensive with OS Detection, Stealth Scan, UDP Service Scan

✅ **Profiles Working Without Root:**
- Quick Discovery, Comprehensive (No Root) ⭐, Detailed Analysis, Complete Port Scan

## API Routes

### Network Scanning
- `GET /api/scan` - Get current scan results and status
- `POST /api/scan` - Trigger a manual network scan with specific profile
- `GET /api/scan/history` - Get scan history (last 10 scans)
- `GET /api/scan/scheduled` - Get scheduled scan status
- `POST /api/scan/scheduled` - Start/update scheduled scanning
- `DELETE /api/scan/scheduled` - Stop scheduled scanning

### Host Management
- `GET /api/hosts/[ip]` - Get specific host history
- `POST /api/hosts/[ip]/scan` - Run comprehensive Nmap scan on single host
- `POST /api/hosts/[ip]/nuclei` - Run Nuclei vulnerability scan on single host

### Data & Logs
- `GET /api/stats` - Get overall statistics
- `GET /api/logs` - Get scan logs
- `DELETE /api/logs` - Clear scan logs
- `POST /api/friendly-names` - Set/update friendly name
- `DELETE /api/friendly-names` - Delete friendly name

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Components**: Shadcn UI
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Language**: TypeScript
- **Database**: SQLite (better-sqlite3)
- **Network Scanning**: Nmap
- **Vulnerability Scanning**: Nuclei

## Architecture

```
crawla/
├── app/
│   ├── api/
│   │   ├── hosts/
│   │   │   └── [ip]/
│   │   │       ├── route.ts          # Host history
│   │   │       ├── scan/route.ts     # Single-host Nmap scan
│   │   │       └── nuclei/route.ts   # Nuclei vulnerability scan
│   │   ├── scan/
│   │   │   ├── route.ts              # Main scan endpoint
│   │   │   ├── history/route.ts      # Scan history
│   │   │   └── scheduled/route.ts    # Scheduled scanning
│   │   ├── stats/route.ts            # Statistics
│   │   ├── logs/route.ts             # Scan logs
│   │   └── friendly-names/route.ts   # Host friendly names
│   ├── layout.tsx                    # Root layout with theme
│   └── page.tsx                      # Main dashboard
├── components/
│   ├── ui/                           # Shadcn UI components
│   ├── host-card.tsx                 # Host card with vulnerability display
│   ├── scan-dashboard.tsx            # Main dashboard
│   ├── scan-profile-selector.tsx    # Profile selection dropdown
│   ├── scan-logs-viewer.tsx         # Live log viewer
│   ├── theme-provider.tsx            # Theme context
│   └── theme-toggle.tsx              # Dark mode toggle
├── lib/
│   ├── database.ts                   # SQLite manager
│   ├── scanner.ts                    # Nmap scanner logic
│   ├── nuclei-scanner.ts             # Nuclei scanner logic
│   ├── scan-logger.ts                # Centralized logging
│   ├── scan-profiles.ts              # Scan profile definitions
│   ├── config.ts                     # Environment config
│   ├── types.ts                      # TypeScript types
│   └── utils.ts                      # Utility functions
└── crawla.db                         # SQLite database (auto-generated)
```

## Security Considerations

⚠️ **Important**: This application performs network scanning and vulnerability assessment which may:
- Require elevated privileges (root/admin) depending on scan type
- Be flagged by security software or intrusion detection systems
- Be restricted by network policies
- Be considered intrusive on networks you don't own/manage
- Generate significant network traffic

**Best Practices:**
- **Only scan networks you own or have explicit permission to scan**
- Be aware of legal implications in your jurisdiction
- Consider firewall rules and security policies
- Run with appropriate user permissions
- **Don't expose this dashboard to the public internet without authentication**
- Use responsibly - vulnerability scanning can be detected by IDS/IPS
- Keep Nuclei templates updated: `nuclei -update-templates`
- Review and verify all vulnerability findings before taking action

**Legal Notice:**
Unauthorized network scanning and vulnerability assessment may be illegal in your jurisdiction. Always obtain proper authorization before scanning any network or system.

## Database

### Storage Location

The SQLite database is stored at the project root as `crawla.db`. This file contains:
- All scan results and metadata
- Host discovery history
- Port and service information
- Operating system detections
- Vulnerability findings from Nuclei scans
- Friendly names for hosts

### Database Schema

**scans** - Stores scan metadata
- id, timestamp, total_hosts, active_hosts, scan_duration, network

**hosts** - Stores discovered hosts
- id, scan_id, ip, hostname, status, os, last_seen

**ports** - Stores open ports for each host
- id, host_id, port, protocol, state, service, version

**vulnerabilities** - Stores discovered vulnerabilities
- id, ip, vuln_id, name, severity, description, reference, matched_at, curl_command, tags, discovered_at

**friendly_names** - Stores custom host labels
- ip, friendly_name, created_at, updated_at

### Backup and Maintenance

To backup your scan data:
```bash
cp crawla.db crawla.db.backup
```

To reset the database:
```bash
rm crawla.db
# Database will be recreated on next app start
```

## Troubleshooting

### Nmap not found
Ensure Nmap is installed and in your system PATH:
```bash
which nmap  # macOS/Linux
where nmap  # Windows
```

### Nuclei not found
If vulnerability scanning doesn't work:
```bash
# Check if installed
nuclei -version

# Install if missing (macOS)
brew install nuclei

# Update templates
nuclei -update-templates
```

### Permission denied errors
Some Nmap features require elevated privileges. Run with sudo or modify scan options to use non-privileged features.

### No hosts discovered
- Verify the network range is correct in `.env`
- Check if your firewall is blocking scans
- Ensure Nmap has necessary permissions
- Try the "Quick Discovery" profile first

### Database errors

**"readonly database" error:**
```bash
# Delete and recreate (loses history)
sudo rm -f crawla.db crawla.db-shm crawla.db-wal

# Or fix permissions (preserves history)
sudo chown $(whoami):staff crawla.db crawla.db-shm crawla.db-wal
sudo chmod 644 crawla.db crawla.db-shm crawla.db-wal
```

### better-sqlite3 bindings not found
```bash
cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3
npm run build-release
cd ../../../../..
```

### NSE Script Engine Errors
If you see `could not locate nse_main.lua` errors:
- This is fixed in the latest version
- NSE scripts (`-sC` flag) have been removed from default profiles
- Use the "Vulnerability Scan (Advanced)" profile if you need NSE scripts
- Ensure full Nmap installation: `brew install nmap` or reinstall from [nmap.org](https://nmap.org)

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more detailed troubleshooting steps.

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [Shadcn UI](https://ui.shadcn.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Network scanning by [Nmap](https://nmap.org/)
- Vulnerability scanning by [Nuclei](https://github.com/projectdiscovery/nuclei) from [ProjectDiscovery](https://projectdiscovery.io/)
- Icons from [Lucide](https://lucide.dev/)

## Resources

- **Nmap Documentation**: [https://nmap.org/book/man.html](https://nmap.org/book/man.html)
- **Nuclei Documentation**: [https://docs.projectdiscovery.io/tools/nuclei](https://docs.projectdiscovery.io/tools/nuclei)
- **Nuclei Templates**: [https://github.com/projectdiscovery/nuclei-templates](https://github.com/projectdiscovery/nuclei-templates)
- **ProjectDiscovery Cloud**: [https://cloud.projectdiscovery.io/](https://cloud.projectdiscovery.io/)
