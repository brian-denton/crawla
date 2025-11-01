/**
 * Application configuration
 * Loads from environment variables with sensible defaults
 */

export const config = {
  /**
   * Network to scan in CIDR notation
   * Default: 192.168.1.0/24 (common home network)
   */
  scanNetwork: process.env.SCAN_NETWORK || '192.168.1.0/24',
} as const;

