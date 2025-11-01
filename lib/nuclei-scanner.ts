import { exec } from 'child_process';
import { promisify } from 'util';
import { Vulnerability } from './types';
import { ScanLogger } from './scan-logger';

const execAsync = promisify(exec);

interface NucleiResult {
  template: string;
  'template-url': string;
  'template-id': string;
  'template-path': string;
  info: {
    name: string;
    author: string[];
    tags: string[];
    description?: string;
    reference?: string[];
    severity: string;
    metadata?: Record<string, unknown>;
  };
  type: string;
  host: string;
  'matched-at': string;
  'extracted-results'?: string[];
  ip?: string;
  timestamp: string;
  'curl-command'?: string;
  'matcher-status'?: boolean;
}

export class NucleiScanner {
  private logger: ScanLogger;

  constructor() {
    this.logger = ScanLogger.getInstance();
  }

  async scanHost(target: string): Promise<Vulnerability[]> {
    console.log(`[NucleiScanner] Starting scan for target: ${target}`);
    this.logger.info(`Starting Nuclei vulnerability scan on ${target}`);

    try {
      // Check if nuclei is installed
      console.log('[NucleiScanner] Checking for Nuclei installation...');
      try {
        const { stdout } = await execAsync('which nuclei');
        console.log(`[NucleiScanner] Nuclei found at: ${stdout.trim()}`);
        this.logger.success('Nuclei found');
      } catch {
        const msg = 'Nuclei is not installed. Install it with: brew install nuclei';
        console.error('[NucleiScanner]', msg);
        this.logger.error(msg);
        throw new Error(msg);
      }

      // Verify target format (add http:// if missing for web scans)
      let scanTarget = target;
      if (!target.startsWith('http://') && !target.startsWith('https://')) {
        scanTarget = `http://${target}`;
        console.log(`[NucleiScanner] Formatted target as: ${scanTarget}`);
        this.logger.info(`Formatted target as: ${scanTarget}`);
      }

      // Run Nuclei scan with JSON output
      // -u: Specify the target URL
      // -jsonl: JSON Lines output format (one JSON per line)
      // -silent: Display only results
      // -severity: Scan for all severity levels
      // -timeout: 5 second timeout per template
      // -retries: Number of retries
      // -rate-limit: requests per second
      // -no-color: Remove ANSI color codes
      const nucleiCommand = `nuclei -u "${scanTarget}" -jsonl -silent -severity info,low,medium,high,critical -timeout 5 -retries 1 -rate-limit 150 -no-color 2>&1`;
      
      console.log(`[NucleiScanner] Executing command...`);
      this.logger.info(`Executing: nuclei -u "${scanTarget}" -jsonl -silent ...`);

      const { stdout, stderr } = await execAsync(nucleiCommand, {
        maxBuffer: 1024 * 1024 * 20, // 20MB buffer
        timeout: 10 * 60 * 1000, // 10 minute timeout
        encoding: 'utf8',
      }).catch((error) => {
        console.log(`[NucleiScanner] Command exited with code: ${error.code}`);
        
        // Nuclei exits with code 1 if vulnerabilities are found, which is normal
        // Also handle timeout and other errors gracefully
        this.logger.warning(`Nuclei command exited with code ${error.code || 'unknown'}`);
        
        if (error.stdout) {
          console.log(`[NucleiScanner] Got stdout despite error, length: ${error.stdout.length}`);
          this.logger.info('Using stdout from failed command');
          return { stdout: error.stdout, stderr: error.stderr || error.message || '' };
        }
        
        // Check for common error patterns
        const errMsg = error.message || error.stderr || '';
        console.error('[NucleiScanner] Error details:', errMsg);
        
        if (errMsg.includes('ETIMEDOUT') || errMsg.includes('timeout')) {
          throw new Error('Nuclei scan timed out. The target may be slow or unreachable.');
        }
        if (errMsg.includes('ECONNREFUSED')) {
          throw new Error('Connection refused. The target may be down or blocking connections.');
        }
        if (errMsg.includes('command not found') || errMsg.includes('not found')) {
          throw new Error('Nuclei command not found. Please install nuclei: brew install nuclei');
        }
        
        throw new Error(`Nuclei scan failed: ${errMsg.substring(0, 300)}`);
      });

      console.log(`[NucleiScanner] Scan complete. stdout length: ${stdout?.length || 0}, stderr length: ${stderr?.length || 0}`);

      if (stderr && !stderr.includes('No results found')) {
        console.log(`[NucleiScanner] Stderr: ${stderr.substring(0, 200)}`);
        this.logger.warning(`Nuclei warnings: ${stderr.substring(0, 200)}`);
      }

      if (!stdout || stdout.trim().length === 0) {
        console.log('[NucleiScanner] No output from scan');
        this.logger.info('No vulnerabilities found');
        return [];
      }

      console.log(`[NucleiScanner] Parsing output...`);
      // Parse JSON output (one JSON object per line)
      const vulnerabilities = this.parseNucleiOutput(stdout);
      console.log(`[NucleiScanner] Parsed ${vulnerabilities.length} vulnerabilities`);
      
      this.logger.success(`Found ${vulnerabilities.length} vulnerabilities`);
      
      // Log severity breakdown
      const severityCounts = this.countBySeverity(vulnerabilities);
      if (severityCounts.critical > 0) this.logger.error(`  ⚠️  ${severityCounts.critical} CRITICAL`);
      if (severityCounts.high > 0) this.logger.warning(`  ⚠️  ${severityCounts.high} HIGH`);
      if (severityCounts.medium > 0) this.logger.warning(`  ℹ️  ${severityCounts.medium} MEDIUM`);
      if (severityCounts.low > 0) this.logger.info(`  ℹ️  ${severityCounts.low} LOW`);
      if (severityCounts.info > 0) this.logger.info(`  ℹ️  ${severityCounts.info} INFO`);

      return vulnerabilities;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Nuclei scan failed: ${errorMsg}`);
      throw new Error(`Nuclei scan failed: ${errorMsg}`);
    }
  }

  private parseNucleiOutput(output: string): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    const lines = output.trim().split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const result: NucleiResult = JSON.parse(line);
        
        const vulnerability: Vulnerability = {
          id: result['template-id'],
          name: result.info.name,
          severity: this.normalizeSeverity(result.info.severity),
          description: result.info.description,
          reference: result.info.reference,
          matched_at: result['matched-at'],
          curl_command: result['curl-command'],
          tags: result.info.tags,
        };

        vulnerabilities.push(vulnerability);
      } catch {
        this.logger.warning(`Failed to parse Nuclei result line: ${line.substring(0, 100)}`);
      }
    }

    return vulnerabilities;
  }

  private normalizeSeverity(severity: string): 'info' | 'low' | 'medium' | 'high' | 'critical' {
    const normalized = severity.toLowerCase();
    if (['info', 'low', 'medium', 'high', 'critical'].includes(normalized)) {
      return normalized as 'info' | 'low' | 'medium' | 'high' | 'critical';
    }
    return 'info';
  }

  private countBySeverity(vulnerabilities: Vulnerability[]): Record<string, number> {
    return vulnerabilities.reduce((acc, vuln) => {
      acc[vuln.severity] = (acc[vuln.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}

