import { NextRequest, NextResponse } from 'next/server';
import { s3Client } from '@/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export async function GET(request: NextRequest & { params: { id: string } }) {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const fileKey = `files/${id}`;
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: fileKey,
    });

    // S3에서 파일 데이터 가져오기
    const response = await s3Client.send(command);
    const body = await response.Body?.transformToByteArray();

    if (!body) {
      return NextResponse.json(
        { error: 'Failed to fetch file content' },
        { status: 500 }
      );
    }

    // Content-Type 설정
    const contentType = response.ContentType || 'application/octet-stream';

    // 캐시 제어 헤더 추가
    const headers = {
      'Content-Type': contentType,
      'Content-Disposition': 'inline',
      'Cache-Control': 'public, max-age=86400, immutable',
    };

    return new NextResponse(body, { headers });
  } catch (error) {
    console.error('Error during file download:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
