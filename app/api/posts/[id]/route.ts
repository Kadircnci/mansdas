import { NextRequest, NextResponse } from 'next/server';

// Get Single Post
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    return NextResponse.json({ 
      success: true, 
      message: `Post ${resolvedParams.id} retrieved (Demo)`,
      data: {
        id: resolvedParams.id,
        title: "Demo Post",
        content: "Demo content",
        status: "published"
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Update Post
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    return NextResponse.json({ 
      success: true, 
      message: `Post ${resolvedParams.id} updated (Demo)` 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Delete Post
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    return NextResponse.json({ 
      success: true, 
      message: `Post ${resolvedParams.id} deleted (Demo)` 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}