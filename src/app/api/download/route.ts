// src/app/api/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { s3Client, generatePresignedUrl } from '@/lib/s3';
import { v4 as uuidv4 } from 'uuid';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    console.log(formData);

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
    }

    const fileName = file.name;
    const id = uuidv4();
    const fileKey = `files/${id}-${fileName}`;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET!,
          Key: fileKey,
          Body: buffer,
          ContentType: file.type,
        })
      );

      const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
      // const fileUrl = `${process.env.AWS_CLOUDFRONT_URL}/${fileKey}`;

      return NextResponse.json({
        success: true,
        data: {
          fileName,
          fileUrl,
          fileType: file.type,
        },
      });
    } catch (error) {
      console.error(`파일 업로드 실패: ${fileName}`, error);
      return NextResponse.json(
        { error: '파일 업로드에 실패했습니다.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('파일 업로드 실패:', error);
    return NextResponse.json(
      { error: '파일 업로드에 실패했습니다.' },
      { status: 500 }
    );
  }
}
