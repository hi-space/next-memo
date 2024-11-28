import { NextRequest, NextResponse } from 'next/server';
import { generateSummary } from '@/lib/bedrock';
import { Memo } from '@/types/memo';

export async function POST(request: NextRequest) {
  try {
    const memo: Memo = await request.json();

    if (!memo.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const summary = await generateSummary(memo).catch((summaryError) => {
      console.error('Summary generation failed:', summaryError);
      return NextResponse.json({ error: summaryError }, { status: 500 });
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Summary POST failed:', error);
    return NextResponse.json(
      { error: 'Failed to process summary' },
      { status: 500 }
    );
  }
}
