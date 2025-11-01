import { NextRequest, NextResponse } from 'next/server';
import { NetworkScanner } from '@/lib/scanner';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ip: string }> }
) {
  try {
    const { ip } = await params;
    const scanner = NetworkScanner.getInstance();
    const history = scanner.getHostHistory(ip);
    
    return NextResponse.json({
      success: true,
      data: {
        ip,
        history,
      },
    });
  } catch (error) {
    console.error('Error fetching host history:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch host history',
        success: false,
      },
      { status: 500 }
    );
  }
}

