# Crawla - Network Scanner Dashboard

A modern, real-time network scanning dashboard built with Next.js, Shadcn UI, and Tailwind CSS. Crawla provides automated network monitoring using nmap to discover hosts, open ports, services, and operating systems on your network.

![Dashboard Preview](https://via.placeholder.com/800x400?text=Crawla+Dashboard)

## Features

- 🔍 **Network Scanning**: Automated nmap scanning of your network (configurable via environment variable)
- ⚙️ **Multiple Scan Profiles**: Choose from 6 scan profiles ranging from quick (30s) to comprehensive (30min)
- 💾 **Profile Persistence**: Your preferred scan profile is saved and used for all automatic scans
- ⏰ **Smart Scheduling**: Automatic scanning every 10 minutes using your chosen profile
- 🎯 **User-Controlled**: You trigger the first scan and choose the profile - no automatic scanning on startup
- 🌓 **Dark Mode**: Beautiful light and dark themes
- 📊 **Real-time Dashboard**: Live statistics and host information
- 🖥️ **Service Detection**: Identifies running services and versions on up to 1000 ports
- 🛡️ **OS Detection**: Detects operating systems on discovered hosts (with sudo)
- 📡 **Port Scanning**: Lists all open ports with service information
- 🏷️ **Friendly Names**: Add custom names to hosts that persist across scans
- 📝 **Live Logs**: View real-time nmap scan logs with download and clear options
- 💾 **SQLite Database**: Persistent storage for scan results and history
- 📈 **Scan History**: Track network changes over time
- 🔎 **Host History**: View historical data for individual hosts
- 🌐 **Hostname Resolution**: Multiple DNS resolution strategies including reverse DNS and MAC vendor lookup

## Prerequisites

Before running this application, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **pnpm** (or npm/yarn)
- **nmap** - Network scanning tool

### Installing nmap

**macOS:**
```bash
brew install nmap
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install nmap
```

**Windows:**
Download from [nmap.org](https://nmap.org/download.html)

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

3. **Run the development server**
```bash
pnpm dev
```

4. **Configure your network** (optional)
Create a `.env` file in the project root:
```bash
cp .env.example .env
```

Edit `.env` and set your network:
```env
SCAN_NETWORK=192.168.1.0/24
```

5. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### First Time Setup

When you first open Crawla, you'll see a welcome prompt asking you to:

1. **Select a Scan Profile** - Choose from 6 different profiles based on your needs (Quick, Comprehensive, etc.)
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

The button will show a spinning animation while scanning is in progress.

### Host Cards

Each discovered host is displayed in a card showing:
- IP address and hostname
- Online/offline status
- Detected operating system
- Open ports with service information
- Service versions
- Last seen timestamp

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

**Note**: The interval only starts after you run your first manual scan. You can change your scan profile at any time, and all future automatic scans will use your new preference.

### Scan Profiles

The application now supports **8 optimized scan profiles** based on nmap best practices. Each profile is tuned for specific use cases with improved timing, detection accuracy, and efficiency.

**Quick Discovery** ⚡
- Fast host and port discovery (100 most common ports)
- TCP connect scan with aggressive timing (T4)
- Minimal retries for speed
- No root required
- Estimated time: **15-30 seconds**
- Best for: Rapid network overview and host enumeration

**Comprehensive (No Root)** ⭐ **Default**
- Service version detection on top 1000 ports
- Includes NSE scripts (`-sC`) for vulnerability detection
- Version intensity 5 (balanced thoroughness)
- Optimized packet rate (min-rate 50)
- No root required (TCP connect scan)
- Estimated time: **3-6 minutes**
- Best for: Detailed service information without sudo privileges

**Standard SYN Scan** 🔐
- Fast SYN stealth scan with light version detection
- Uses TCP SYN packets (half-open scan)
- Quick service identification
- **Requires root/sudo**
- Estimated time: **45-90 seconds**
- Best for: Fast, stealthy scanning when you have root access

**Detailed Analysis** 🔬
- Thorough service detection with NSE scripts
- Version intensity 7 (very thorough)
- Custom user-agent for HTTP detection
- Default NSE scripts for enumeration
- No root required
- Estimated time: **4-8 minutes**
- Best for: In-depth service analysis and vulnerability discovery

**Comprehensive with OS Detection** 🎯 🔐
- Full scan: services, OS, NSE scripts on top 1000 ports
- SYN scan with version intensity 6
- OS fingerprinting with aggressive guessing
- RST rate limit defeat for accuracy
- **Requires root/sudo**
- Estimated time: **4-8 minutes**
- Best for: Complete host profiling including operating system

**Complete Port Scan** 📊
- Scans **all 65,535 ports**
- Service version detection (intensity 5)
- Optimized with min-rate 300 for speed
- No root required
- Estimated time: **10-20 minutes**
- Best for: Exhaustive port discovery and security audits

**Stealth Scan** 🥷 🔐
- Slow, quiet scan to evade IDS/IPS detection
- T2 timing (polite, low bandwidth)
- Adds random data to packets for evasion
- Minimal retries to reduce noise
- **Requires root/sudo**
- Estimated time: **5-10 minutes**
- Best for: Reconnaissance in monitored environments

**UDP Service Scan** 📡 🔐
- Scans top 100 UDP ports
- Identifies DNS, DHCP, SNMP, and other UDP services
- Fast timing with minimal version detection
- **Requires root/sudo** (UDP scan requires raw packets)
- Estimated time: **3-5 minutes**
- Best for: Discovering UDP-based services

#### Running Scans with Root Access

Several scan profiles require root privileges for advanced features. Run the application with sudo:

```bash
sudo pnpm dev
```

🔐 **Profiles Requiring Root/Sudo:**
- **Standard SYN Scan** - SYN stealth scanning (`-sS`)
- **Comprehensive with OS Detection** - OS fingerprinting (`-O`) + SYN scan
- **Stealth Scan** - SYN scan with evasion techniques
- **UDP Service Scan** - UDP scanning (`-sU`)

✅ **Profiles Working Without Root:**
- **Quick Discovery** - TCP connect scan
- **Comprehensive (No Root)** - TCP connect with service detection ⭐ **Default**
- **Detailed Analysis** - TCP connect with NSE scripts
- **Complete Port Scan** - TCP connect on all ports

💡 **Recommendation**: Use "Comprehensive (No Root)" for excellent results without sudo. It provides service version detection, vulnerability scanning via NSE scripts, and comprehensive port coverage.

## API Routes

### GET /api/scan
Retrieve current scan results and status

**Response:**
```json
{
  "success": true,
  "data": {
    "currentScan": { /* scan results */ },
    "isScanning": false,
    "lastScan": "2025-11-01T10:30:00.000Z"
  }
}
```

### POST /api/scan
Trigger a manual network scan with a specific profile

**Request:**
```json
{
  "network": "192.168.1.0/24",
  "profile": "comprehensive_noroot"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* scan results */ }
}
```

**Available Profiles:**
- `quick` - Fast discovery (15-30s)
- `comprehensive_noroot` ⭐ - Detailed service detection with NSE scripts (3-6 min) **Default**
- `standard` - SYN scan with service detection (requires root, 45-90s)
- `detailed` - Thorough analysis with NSE scripts (4-8 min)
- `comprehensive` - Full OS, services, scripts (requires root, 4-8 min)
- `allports` - All 65,535 ports (10-20 min)
- `stealth` - Slow, quiet scan for IDS evasion (requires root, 5-10 min)
- `udp` - UDP service discovery (requires root, 3-5 min)

### GET /api/scan/history
Get scan history (last 10 scans)

**Response:**
```json
{
  "success": true,
  "data": [ /* array of scan results */ ]
}
```

### GET /api/scan/scheduled
Get scheduled scan status

**Response:**
```json
{
  "success": true,
  "data": {
    "scheduledScanning": true,
    "interval": "10 minutes",
    "currentProfile": "comprehensive_noroot"
  }
}
```

### POST /api/scan/scheduled
Start or update scheduled scanning with a specific profile

**Request:**
```json
{
  "profile": "comprehensive_noroot",
  "runImmediately": false
}
```

**Parameters:**
- `profile` (string) - The scan profile to use for scheduled scans
- `runImmediately` (boolean, default: true) - Whether to run a scan immediately or wait for the next interval

**Response:**
```json
{
  "success": true,
  "message": "Scheduled scanning started",
  "data": {
    "profile": "comprehensive_noroot",
    "interval": "10 minutes",
    "scheduledScanning": true
  }
}
```

### DELETE /api/scan/scheduled
Stop scheduled scanning

**Response:**
```json
{
  "success": true,
  "message": "Scheduled scanning stopped"
}
```

### GET /api/stats
Get overall statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "totalScans": 42,
    "uniqueHostsSeen": 15,
    "currentActiveHosts": 8,
    "lastScanTime": "2025-11-01T10:30:00.000Z"
  }
}
```

### GET /api/hosts/[ip]
Get history for a specific host

**Response:**
```json
{
  "success": true,
  "data": {
    "ip": "192.168.1.100",
    "history": [ /* array of host snapshots */ ]
  }
}
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Components**: Shadcn UI
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Language**: TypeScript
- **Database**: SQLite (better-sqlite3)
- **Scanning**: nmap

## Architecture

```
crawla/
├── app/
│   ├── api/
│   │   ├── hosts/
│   │   │   └── [ip]/route.ts     # Host history endpoint
│   │   ├── scan/
│   │   │   ├── route.ts          # Main scan endpoint
│   │   │   ├── history/route.ts  # Scan history
│   │   │   └── scheduled/route.ts# Scheduled scanning
│   │   └── stats/route.ts        # Statistics endpoint
│   ├── layout.tsx                # Root layout with theme provider
│   └── page.tsx                  # Main dashboard page
├── components/
│   ├── ui/                       # Shadcn UI components
│   ├── host-card.tsx             # Host information card
│   ├── scan-dashboard.tsx        # Main dashboard component
│   ├── scan-initializer.tsx      # Scheduled scan initializer
│   ├── theme-provider.tsx        # Theme context provider
│   └── theme-toggle.tsx          # Dark mode toggle
├── lib/
│   ├── database.ts               # SQLite database manager
│   ├── scanner.ts                # Network scanner logic
│   ├── types.ts                  # TypeScript type definitions
│   └── utils.ts                  # Utility functions
└── crawla.db                     # SQLite database (auto-generated)
```

## Security Considerations

⚠️ **Important**: This application performs network scanning which may:
- Require elevated privileges (root/admin) depending on scan type
- Be flagged by security software
- Be restricted by network policies
- Be considered intrusive on networks you don't own/manage

**Best Practices:**
- Only scan networks you own or have permission to scan
- Be aware of legal implications in your jurisdiction
- Consider firewall rules and security policies
- Run with appropriate user permissions
- Don't expose this dashboard to the public internet without authentication

## Database

### Storage Location

The SQLite database is stored at the project root as `crawla.db`. This file contains:
- All scan results
- Host discovery history
- Port and service information
- Operating system detections

### Database Schema

**scans** - Stores scan metadata
- id, timestamp, total_hosts, active_hosts, scan_duration, network

**hosts** - Stores discovered hosts
- id, scan_id, ip, hostname, status, os, last_seen

**ports** - Stores open ports for each host
- id, host_id, port, protocol, state, service, version

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

### nmap not found
Ensure nmap is installed and in your system PATH:
```bash
which nmap  # macOS/Linux
where nmap  # Windows
```

### Permission denied errors
Some nmap features require elevated privileges. Run with appropriate permissions or modify scan options to use non-privileged features.

### No hosts discovered
- Verify the network range is correct
- Check if your firewall is blocking scans
- Ensure nmap has necessary permissions
- Try a simpler scan with fewer options

### Database errors

**"readonly database" error:**
This happens when the database files are owned by root or have incorrect permissions:
```bash
# Option 1: Delete and recreate (loses all scan history)
sudo rm -f crawla.db crawla.db-shm crawla.db-wal
# Restart the app to recreate the database

# Option 2: Fix permissions (preserves scan history)
sudo chown $(whoami):staff crawla.db crawla.db-shm crawla.db-wal
sudo chmod 644 crawla.db crawla.db-shm crawla.db-wal
```

**Other database issues:**
```bash
# Stop the application
# Delete the database
rm crawla.db crawla.db-shm crawla.db-wal
# Restart the application (database will be recreated)
```

### better-sqlite3 bindings not found
If you see an error about missing bindings file, you need to build the native module:
```bash
cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3
npm run build-release
cd ../../../../..
```

Or simply reinstall dependencies:
```bash
rm -rf node_modules
pnpm install
cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 && npm run build-release
```

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
- Network scanning by [nmap](https://nmap.org/)
