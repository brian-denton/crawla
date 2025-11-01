import { NextResponse } from 'next/server';
import { NetworkScanner } from '@/lib/scanner';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const scanner = NetworkScanner.getInstance();
    const history = scanner.getScanHistory();
    
    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Error fetching scan history:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch scan history',
        success: false,
      },
      { status: 500 }
    );
  }
}

