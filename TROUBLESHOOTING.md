# Troubleshooting Guide

## Common Issues and Solutions

### 1. NSE Script Engine Error

**Error Message:**
```
NSE: failed to initialize the script engine: could not locate nse_main.lua
QUITTING!
```

**Cause:** Nmap's scripting engine (NSE) files are missing or not properly installed.

**Solutions:**

#### macOS (Homebrew)
```bash
# Reinstall nmap with full support
brew uninstall nmap
brew install nmap

# Verify NSE is working
nmap --script-help vuln
```

#### Linux (Ubuntu/Debian)
```bash
# Install complete nmap package
sudo apt-get remove nmap
sudo apt-get update
sudo apt-get install nmap

# Verify NSE installation
ls /usr/share/nmap/scripts/
nmap --script-help vuln
```

#### Verify Installation
```bash
# Check nmap version and paths
nmap --version

# Expected output should include:
# - Nmap version 7.x or higher
# - Compiled with: liblua-x.x
# - NSE script directory path

# Test NSE scripts
nmap --script=banner localhost -p 80
```

**Workaround:** Use profiles without NSE scripts:
- ✅ Quick Discovery
- ✅ Comprehensive (No Root) - **Default, works without NSE**
- ✅ Standard SYN Scan
- ✅ Complete Port Scan
- ❌ Vulnerability Scan (Advanced) - Requires NSE

---

### 2. Database Permission Errors

**Error Message:**
```
Error: attempt to write a readonly database
```

**Solutions:**

```bash
# Option 1: Delete and recreate database
rm -f crawla.db crawla.db-shm crawla.db-wal

# Option 2: Fix permissions
chmod 644 crawla.db*
chown $(whoami):staff crawla.db*
```

---

### 3. Scan Requires Root/Sudo

**Error Message:**
```
You requested a scan type which requires root privileges.
QUITTING!
```

**Affected Profiles:**
- Standard SYN Scan (`-sS`)
- Comprehensive with OS Detection (`-O`)
- Stealth Scan (`-sS`)
- UDP Service Scan (`-sU`)

**Solution:**
```bash
# Run with sudo
sudo pnpm dev

# Or use profiles that don't require root:
# - Quick Discovery
# - Comprehensive (No Root) ⭐ Recommended
# - Detailed Analysis
# - Complete Port Scan
```

---

### 4. Scan Returns 0 Hosts

**Possible Causes:**

1. **Firewall blocking ICMP:** Use `-Pn` flag (already included in all profiles)
2. **Wrong network range:** Check your `SCAN_NETWORK` in `.env`
3. **Network interface issue:** Ensure you're connected to the network

**Solutions:**

```bash
# Verify your network
ifconfig | grep "inet "
# or
ip addr show

# Test nmap manually
nmap -sn 192.168.1.0/24

# Update .env with correct network
echo "SCAN_NETWORK=192.168.1.0/24" > .env
```

---

### 5. Hostname Not Resolving

**Issue:** Cards show "No hostname resolved"

**Causes:**
- No reverse DNS (PTR) records on local network (common)
- Firewall blocking DNS queries

**Solutions:**

1. **Use Friendly Names:** Click the edit icon on any card to add a custom name
2. **Check DNS:** Verify DNS is working:
   ```bash
   nslookup 192.168.1.1
   dig -x 192.168.1.1
   ```

**Note:** This is normal on home networks without proper reverse DNS setup.

---

### 6. Scan Timing Out

**Error Message:**
```
Scan failed: Command timed out after X minutes
```

**Solutions:**

1. **Use a faster profile:**
   - Switch from "Complete Port Scan" → "Comprehensive (No Root)"
   - Switch from "Detailed Analysis" → "Quick Discovery"

2. **Reduce network range:**
   ```bash
   # Instead of full /24 (254 hosts)
   SCAN_NETWORK=192.168.1.0/24
   
   # Scan smaller range
   SCAN_NETWORK=192.168.1.0/26  # 62 hosts
   SCAN_NETWORK=192.168.1.1-50  # 50 hosts
   ```

3. **Increase timeout** in `lib/scanner.ts`:
   ```typescript
   timeout: 30 * 60 * 1000, // 30 minutes
   ```

---

### 7. RTTVAR Warnings

**Warning Message:**
```
RTTVAR has grown to over 2.3 seconds, decreasing to 2.0
```

**Explanation:** This is **normal** on:
- WiFi networks
- Networks with slow-responding devices
- Networks with many devices

**Solution:** These warnings are automatically filtered. If scans fail:
1. Use `-T3` (normal timing) instead of `-T4`
2. Reduce `--min-rate` values
3. Increase `--max-retries`

---

### 8. Better-sqlite3 Binding Errors

**Error Message:**
```
Error: Could not locate the bindings file
```

**Solution:**
```bash
# Rebuild native modules
cd node_modules/better-sqlite3
pnpm run build-release
cd ../..

# Or reinstall
rm -rf node_modules
pnpm install
pnpm approve-builds
```

---

### 9. Port Copy Not Working

**Issue:** Copy button doesn't copy IP:PORT to clipboard

**Cause:** Clipboard API requires HTTPS or localhost

**Solution:** Access via `localhost` not `127.0.0.1`:
```
✅ http://localhost:3000
❌ http://127.0.0.1:3000
```

---

## Performance Tips

### Speed Up Scans

1. **Use Quick Discovery** for initial overview (15-30s)
2. **Reduce scan range** in `.env`:
   ```env
   SCAN_NETWORK=192.168.1.1-100  # Only scan first 100 IPs
   ```
3. **Increase min-rate** in scan profiles (trade accuracy for speed)
4. **Use Standard SYN Scan** with sudo (fastest with root)

### Improve Accuracy

1. **Use Detailed Analysis** for thorough service detection
2. **Run single-host scans** on important devices (🔍 button)
3. **Increase --max-retries** in profiles
4. **Use Comprehensive with OS** when you need OS detection

---

## Getting Help

If you're still experiencing issues:

1. **Check Nmap Version:**
   ```bash
   nmap --version
   # Should be 7.x or higher
   ```

2. **Test Nmap Manually:**
   ```bash
   nmap -sV -T4 --top-ports 10 192.168.1.1 -oX -
   ```

3. **Check Logs:**
   - Click "View Logs" button in dashboard
   - Check terminal output for detailed errors

4. **Verify Environment:**
   ```bash
   which nmap
   ls -la crawla.db*
   cat .env
   ```

---

## Useful Commands

```bash
# Quick nmap installation check
nmap --version && nmap --script-help vuln

# Test specific scan profile
nmap -sT -sV -T4 --top-ports 100 -Pn 192.168.1.0/24

# Check database
sqlite3 crawla.db "SELECT COUNT(*) FROM hosts;"

# Reset everything
rm -f crawla.db* && pnpm dev

# Run with sudo for advanced features
sudo pnpm dev
```

