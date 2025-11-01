import { NextRequest, NextResponse } from 'next/server';
import { NetworkScanner } from '@/lib/scanner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{
    ip: string;
  }>;
}

// POST: Trigger a comprehensive scan on a single host
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params;
    const ip = params.ip;

    if (!ip) {
      return NextResponse.json(
        { error: 'IP address is required', success: false },
        { status: 400 }
      );
    }

    // Validate IP format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
      return NextResponse.json(
        { error: 'Invalid IP address format', success: false },
        { status: 400 }
      );
    }

    console.log(`Starting comprehensive scan on single host: ${ip}`);

    const scanner = NetworkScanner.getInstance();

    if (scanner.isCurrentlyScanning()) {
      return NextResponse.json(
        { error: 'A scan is already in progress', success: false },
        { status: 409 }
      );
    }

    // Perform comprehensive single-host scan
    const result = await scanner.scanSingleHost(ip);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Scan completed for ${ip}`,
    });
  } catch (error) {
    console.error('Single host scan error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to scan host',
        success: false,
      },
      { status: 500 }
    );
  }
}

