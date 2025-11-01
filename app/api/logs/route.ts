import { NextResponse } from 'next/server';
import { ScanLogger } from '@/lib/scan-logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const logger = ScanLogger.getInstance();
    const logs = logger.getLogs();
    
    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch logs',
        success: false,
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const logger = ScanLogger.getInstance();
    logger.clear();
    
    return NextResponse.json({
      success: true,
      message: 'Logs cleared',
    });
  } catch (error) {
    console.error('Error clearing logs:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to clear logs',
        success: false,
      },
      { status: 500 }
    );
  }
}

