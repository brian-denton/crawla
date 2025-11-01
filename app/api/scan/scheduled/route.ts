import { NextRequest, NextResponse } from 'next/server';
import { NetworkScanner } from '@/lib/scanner';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

let scheduledScanInterval: NodeJS.Timeout | null = null;
let currentProfile: string = 'comprehensive_noroot'; // Default profile

// Initialize scheduled scanning with a profile
function initializeScheduledScanning(profile: string = 'comprehensive_noroot', runImmediately: boolean = false) {
  // Clear existing interval if any
  if (scheduledScanInterval) {
    clearInterval(scheduledScanInterval);
    scheduledScanInterval = null;
  }

  currentProfile = profile;
  const scanner = NetworkScanner.getInstance();

  // Run scan immediately only if requested
  if (runImmediately) {
    console.log(`Running initial scan with ${profile} profile on ${config.scanNetwork}...`);
    scanner.scan(config.scanNetwork, profile).catch(console.error);
  }

  // Schedule scans every 10 minutes (600000 ms)
  scheduledScanInterval = setInterval(async () => {
    try {
      console.log(`Running scheduled network scan with ${currentProfile} profile on ${config.scanNetwork}...`);
      await scanner.scan(config.scanNetwork, currentProfile);
      console.log('Scheduled scan completed successfully');
    } catch (error) {
      console.error('Scheduled scan failed:', error);
    }
  }, 10 * 60 * 1000);

  console.log(`Scheduled scanning initialized with ${profile} profile - running every 10 minutes`);
}

// Note: We no longer auto-start scanning on module load
// The user must trigger the first scan manually

// GET: Get scheduled scan status
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      scheduledScanning: scheduledScanInterval !== null,
      interval: '10 minutes',
      currentProfile,
    },
  });
}

// POST: Start/update scheduled scanning with a specific profile
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const profile = body.profile || 'comprehensive_noroot';
    const runImmediately = body.runImmediately !== false; // Default to true

    console.log(`Initializing scheduled scans with profile: ${profile}`);
    
    initializeScheduledScanning(profile, runImmediately);

    return NextResponse.json({
      success: true,
      message: 'Scheduled scanning started',
      data: {
        profile,
        interval: '10 minutes',
        scheduledScanning: true,
      },
    });
  } catch (error) {
    console.error('Failed to start scheduled scanning:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to start scheduled scanning',
        success: false,
      },
      { status: 500 }
    );
  }
}

// DELETE: Stop scheduled scanning
export async function DELETE() {
  if (scheduledScanInterval) {
    clearInterval(scheduledScanInterval);
    scheduledScanInterval = null;
    console.log('Scheduled scanning stopped');
  }

  return NextResponse.json({
    success: true,
    message: 'Scheduled scanning stopped',
  });
}

