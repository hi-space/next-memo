// src/app/api/memos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  UpdateCommand,
  DeleteCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient } from '@/lib/dynamodb';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, generatePresignedUrl } from '@/lib/s3';

export async function DELETE(
  request: NextRequest & { params: { id: string } }
) {
  try {
    const url = request.nextUrl.pathname;
    const id = url.split('/').pop();
    const { searchParams } = new URL(request.url);
    const createdAt = searchParams.get('createdAt') || '';
    const type = 'MEMO';

    if (!createdAt) {
      return NextResponse.json(
        { error: 'createdAt is required' },
        { status: 400 }
      );
    }

    // 메모 정보 조회
    const getMemoResult = await docClient.send(
      new GetCommand({
        TableName: 'Memos',
        Key: {
          type,
          createdAt,
        },
      })
    );

    if (!getMemoResult.Item) {
      return NextResponse.json(
        { error: '메모를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // S3에 업로드된 파일들이 있다면 모두 삭제
    if (getMemoResult.Item?.files && Array.isArray(getMemoResult.Item.files)) {
      const deletePromises = getMemoResult.Item.files.map((file) => {
        const fileKey = file.fileUrl.split('.com/')[1];
        return s3Client.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET!,
            Key: fileKey,
          })
        );
      });

      await Promise.all(deletePromises);
    }

    // DynamoDB에서 메모 삭제
    await docClient.send(
      new DeleteCommand({
        TableName: 'Memos',
        Key: {
          type,
          createdAt,
        },
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: '메모 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest & { params: { id: string } }) {
  try {
    const url = request.nextUrl.pathname;
    const id = url.split('/').pop();
    const formData = await request.formData();
    const content = formData.get('content') as string;
    const type = 'MEMO';
    const createdAt = formData.get('createdAt') as string;
    const deletedFileUrls = formData.get('deletedFileUrls')
      ? JSON.parse(formData.get('deletedFileUrls') as string)
      : [];

    if (!createdAt) {
      return NextResponse.json(
        { error: 'createdAt is required' },
        { status: 400 }
      );
    }

    // 기존 메모 정보 조회
    const getMemoResult = await docClient.send(
      new GetCommand({
        TableName: 'Memos',
        Key: {
          type,
          createdAt,
        },
      })
    );

    const existingMemo = getMemoResult.Item;
    if (!existingMemo) {
      return NextResponse.json(
        { error: '메모를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 기존 파일 정보 가져오기
    let existingFiles = existingMemo.files || [];

    if (deletedFileUrls.length > 0) {
      const normalizeUrl = (url: string) => {
        try {
          const parts = url.split('uploads/');
          const encodedPath = parts.length > 1 ? parts[1].split('?')[0] : url;
          return `uploads/${decodeURIComponent(encodedPath)}`;
        } catch (error) {
          console.error('Error decoding URL:', url, error);
          return url;
        }
      };

      // S3에서 파일 삭제
      const deletePromises = deletedFileUrls.map(async (fileUrl: string) => {
        try {
          const normalizedKey = normalizeUrl(fileUrl).replace('uploads/', '');

          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: process.env.AWS_S3_BUCKET!,
              Key: normalizedKey,
            })
          );
          console.log('Successfully deleted file from S3:', normalizedKey);
        } catch (error) {
          console.error('Failed to delete file from S3:', error);
          throw error;
        }
      });

      await Promise.all(deletePromises);

      // 삭제된 파일을 제외한 나머지 파일들만 유지
      const filteredFiles = existingFiles.filter(
        (file: { fileUrl: string }) => {
          const normalizedExistingUrl = normalizeUrl(file.fileUrl);
          return !deletedFileUrls
            .map((url: string) => normalizeUrl(url))
            .includes(normalizedExistingUrl);
        }
      );

      existingFiles = filteredFiles;
    }

    // 새 파일들 처리
    const newFiles: { fileName: string; fileUrl: string; fileType: string }[] =
      [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('files[') && value instanceof File) {
        const file = value as File;
        const fileName = file.name;
        const fileKey = `uploads/${id}-${fileName}`;
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

        newFiles.push({
          fileName: fileName,
          fileUrl: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`,
          fileType: file.type,
        });
      }
    }

    // 기존 파일과 새 파일을 합침
    const updatedFiles = [...existingFiles, ...newFiles];

    // 메모 업데이트
    await docClient.send(
      new UpdateCommand({
        TableName: 'Memos',
        Key: {
          type,
          createdAt,
        },
        UpdateExpression:
          'SET content = :content, updatedAt = :updatedAt, files = :files, fileCount = :fileCount',
        ExpressionAttributeValues: {
          ':content': content,
          ':updatedAt': new Date().toISOString(),
          ':files': updatedFiles,
          ':fileCount': updatedFiles.length,
        },
      })
    );

    // 응답을 위해 모든 파일의 URL을 presigned URL로 변환
    const filesWithPresignedUrls = await Promise.all(
      updatedFiles.map(async (file) => {
        const fileKey = file.fileUrl.split('.com/')[1];
        return {
          ...file,
          fileUrl: await generatePresignedUrl(fileKey),
        };
      })
    );

    // 수정된 메모 데이터 반환 (presigned URL 포함)
    return NextResponse.json({
      id,
      type,
      content,
      files: filesWithPresignedUrls,
      fileCount: filesWithPresignedUrls.length,
      createdAt,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: '메모 수정에 실패했습니다.' },
      { status: 500 }
    );
  }
}
