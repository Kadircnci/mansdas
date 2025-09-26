import { NextRequest, NextResponse } from 'next/server';

// Get Single Account
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    return NextResponse.json({ 
      success: true, 
      message: `Account ${resolvedParams.id} retrieved (Demo)` 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Update Account
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    return NextResponse.json({ 
      success: true, 
      message: `Account ${resolvedParams.id} updated (Demo)` 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Delete Account
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    return NextResponse.json({ 
      success: true, 
      message: `Account ${resolvedParams.id} deleted (Demo)` 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}