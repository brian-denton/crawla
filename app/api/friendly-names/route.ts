import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/database';

export const dynamic = 'force-dynamic';

// GET: Get all friendly names
export async function GET() {
  try {
    const db = DatabaseManager.getInstance();
    const friendlyNames = db.getAllFriendlyNames();
    
    return NextResponse.json({
      success: true,
      data: friendlyNames,
    });
  } catch (error) {
    console.error('Error fetching friendly names:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch friendly names',
        success: false,
      },
      { status: 500 }
    );
  }
}

// POST: Set a friendly name
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/friendly-names - Received request');
    const body = await request.json();
    console.log('Request body:', body);
    
    const { ip, friendlyName } = body;

    if (!ip || typeof ip !== 'string') {
      console.error('Invalid IP:', ip);
      return NextResponse.json(
        { error: 'IP address is required', success: false },
        { status: 400 }
      );
    }

    if (!friendlyName || typeof friendlyName !== 'string') {
      console.error('Invalid friendly name:', friendlyName);
      return NextResponse.json(
        { error: 'Friendly name is required', success: false },
        { status: 400 }
      );
    }

    console.log(`Setting friendly name for ${ip}: ${friendlyName}`);
    const db = DatabaseManager.getInstance();
    db.setFriendlyName(ip, friendlyName);
    
    console.log('Friendly name saved successfully');
    return NextResponse.json({
      success: true,
      message: 'Friendly name saved',
      data: { ip, friendlyName },
    });
  } catch (error) {
    console.error('Error setting friendly name:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to set friendly name',
        success: false,
      },
      { status: 500 }
    );
  }
}

// DELETE: Remove a friendly name
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ip = searchParams.get('ip');

    if (!ip) {
      return NextResponse.json(
        { error: 'IP address is required', success: false },
        { status: 400 }
      );
    }

    const db = DatabaseManager.getInstance();
    db.deleteFriendlyName(ip);
    
    return NextResponse.json({
      success: true,
      message: 'Friendly name deleted',
    });
  } catch (error) {
    console.error('Error deleting friendly name:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to delete friendly name',
        success: false,
      },
      { status: 500 }
    );
  }
}

