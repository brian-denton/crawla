import { NextRequest, NextResponse } from 'next/server';
import { NetworkScanner } from '@/lib/scanner';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST: Trigger a manual scan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const network = body.network || config.scanNetwork;
    const profile = body.profile || 'comprehensive_noroot';
    
    console.log(`Starting scan with profile: ${profile}`);
    
    const scanner = NetworkScanner.getInstance();
    
    if (scanner.isCurrentlyScanning()) {
      return NextResponse.json(
        { error: 'A scan is already in progress' },
        { status: 409 }
      );
    }

    const result = await scanner.scan(network, profile);
    
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to perform scan',
        success: false,
      },
      { status: 500 }
    );
  }
}

// GET: Get current scan results and status
export async function GET() {
  try {
    console.log('GET /api/scan - Fetching scan data...');
    const scanner = NetworkScanner.getInstance();
    const currentScan = scanner.getCurrentScan();
    const isScanning = scanner.isCurrentlyScanning();
    
    console.log('GET /api/scan - Success');
    return NextResponse.json({
      success: true,
      data: {
        currentScan: currentScan || null,
        isScanning: isScanning || false,
        lastScan: currentScan?.timestamp || null,
      },
    });
  } catch (error) {
    console.error('GET /api/scan - Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch scan data',
        success: false,
        data: {
          currentScan: null,
          isScanning: false,
          lastScan: null,
        },
      },
      { status: 500 }
    );
  }
}

