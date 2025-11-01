import { NextRequest, NextResponse } from 'next/server';
import { NucleiScanner } from '@/lib/nuclei-scanner';
import { DatabaseManager } from '@/lib/database';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 600; // 10 minutes for Nuclei scans

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ ip: string }> }
) {
  let ip: string | undefined;
  
  try {
    // Await params first
    const params = await context.params;
    ip = params.ip;

    console.log(`[Nuclei API] Received request for IP: ${ip}`);

    if (!ip) {
      console.error('[Nuclei API] No IP address provided');
      return NextResponse.json(
        { error: 'IP address is required', success: false },
        { status: 400 }
      );
    }

    console.log(`[Nuclei API] Starting Nuclei vulnerability scan for ${ip}`);

    const scanner = new NucleiScanner();
    const vulnerabilities = await scanner.scanHost(ip);

    console.log(`[Nuclei API] Scan completed. Found ${vulnerabilities.length} vulnerabilities`);

    // Save vulnerabilities to database
    try {
      const db = DatabaseManager.getInstance();
      db.saveVulnerabilities(ip, vulnerabilities);
      console.log(`[Nuclei API] Vulnerabilities saved to database`);
    } catch (dbError) {
      console.error('[Nuclei API] Database save error:', dbError);
      // Continue anyway - we still want to return the results
    }

    return NextResponse.json({
      success: true,
      data: {
        ip,
        vulnerabilities,
        scannedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error(`[Nuclei API] Error scanning ${ip || 'unknown'}:`, {
      message: errorMessage,
      stack: errorStack,
      error: error,
    });

    return NextResponse.json(
      {
        error: errorMessage,
        success: false,
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

