import { NextRequest, NextResponse } from 'next/server';
import { generateSummary } from '@/lib/bedrock';
import { Memo } from '@/types/memo';

export async function POST(request: NextRequest) {
  try {
    const memo: Memo = await request.json();
    const createdAt = memo.createdAt;

    if (!createdAt) {
      return NextResponse.json(
        { error: 'createdAt is required' },
        { status: 400 }
      );
    }

    const summary = await generateSummary(memo).catch((summaryError) => {
      console.error('Summary generation failed:', summaryError);
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Memo update failed:', error);
    return NextResponse.json(
      { error: 'Failed to update memo' },
      { status: 500 }
    );
  }
}
