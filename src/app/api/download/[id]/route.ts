import { NextRequest, NextResponse } from 'next/server';
import { s3Client } from '@/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = await context.params;

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

    // 이미지 데이터를 직접 반환
    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline', // 이미지가 브라우저에 바로 표시되도록 설정
      },
    });
  } catch (error) {
    console.error('Error during file download:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
