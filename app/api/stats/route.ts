import { NextResponse } from 'next/server';
import { NetworkScanner } from '@/lib/scanner';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('GET /api/stats - Fetching stats...');
    const scanner = NetworkScanner.getInstance();
    console.log('GET /api/stats - Scanner instance obtained');
    
    const stats = scanner.getStats();
    console.log('GET /api/stats - Stats obtained:', stats);
    
    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('GET /api/stats - Error:', error);
    console.error('GET /api/stats - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Return default stats instead of error
    return NextResponse.json({
      success: true,
      data: {
        totalScans: 0,
        uniqueHostsSeen: 0,
        currentActiveHosts: 0,
        lastScanTime: null,
      },
    });
  }
}

