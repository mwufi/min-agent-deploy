import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import pd from '@/lib/server/pipedream_client';

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = await pd.createConnectToken({
      external_user_id: userId,
    });

    console.log('Token created:', token);

    return NextResponse.json(token);
  } catch (error) {
    console.error('Token creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create token' },
      { status: 500 }
    );
  }
}