// src/app/api/memos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { s3Client, generatePresignedUrl } from '@/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get('fileUrl');
    const fileName = searchParams.get('fileName');

    if (!fileUrl || !fileName) {
      return NextResponse.json(
        { error: 'Missing fileUrl or fileName' },
        { status: 400 }
      );
    }

    // S3 URL에서 bucket과 key 추출
    const s3Url = new URL(fileUrl);
    const bucket = s3Url.hostname.split('.')[0];
    const key = decodeURIComponent(s3Url.pathname.slice(1)); // 첫 번째 '/' 제거

    // GetObject 커맨드 생성
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    // 서명된 URL 생성
    const signedUrl = await generatePresignedUrl(key);

    // 파일 다운로드를 위한 Response 헤더 설정
    const response = await fetch(signedUrl);
    const blob = await response.blob();

    return new NextResponse(blob, {
      headers: {
        'Content-Type':
          response.headers.get('content-type') || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(
          fileName
        )}"`,
        'Content-Length': response.headers.get('content-length') || '',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
