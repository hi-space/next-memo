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
import { escapeRegExp, isImageFile } from '@/utils/format';

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

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = await context.params;
    const formData = await request.formData();
    let content = formData.get('content') as string;
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

    // 기존 메모 조회
    const getMemoResult = await docClient.send(
      new GetCommand({
        TableName: 'Memos',
        Key: { type: 'MEMO', createdAt },
      })
    );

    const existingMemo = getMemoResult.Item;
    if (!existingMemo) {
      return NextResponse.json({ error: 'Memo not found' }, { status: 404 });
    }

    let existingFiles = existingMemo.files || [];

    // 삭제할 파일 처리
    if (deletedFileUrls.length > 0) {
      const deletePromises = deletedFileUrls.map(async (fileUrl: string) => {
        const fileKey = decodeURIComponent(fileUrl.split('.com/')[1]);
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET!,
            Key: fileKey,
          })
        );
      });

      await Promise.all(deletePromises);

      // 삭제된 파일을 제외한 나머지 파일만 유지
      existingFiles = existingFiles.filter(
        (file: { fileUrl: string }) => !deletedFileUrls.includes(file.fileUrl)
      );
    }

    // 새로운 파일 업로드 및 URL 매핑
    const newFiles: { fileName: string; fileUrl: string; fileType: string }[] =
      [];
    const urlMapping: { [key: string]: string } = {};

    const fileEntries = Array.from(formData.entries()).filter(([key]) =>
      key.startsWith('files[')
    );

    for (const [_, file] of fileEntries) {
      if (file instanceof File) {
        const fileName = file.name;
        const fileKey = `files/${id}-${fileName}`;
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

        const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
        const markdownPattern = new RegExp(
          `!?\\[${escapeRegExp(fileName)}\\]\\(blob:[^)]+\\)`,
          'g'
        );
        const markdownReplacement = `${
          isImageFile(fileName) ? '!' : ''
        }[${fileName}](/api/download/${id}-${fileName})`;
        urlMapping[markdownPattern.source] = markdownReplacement;

        newFiles.push({
          fileName,
          fileUrl: s3Url,
          fileType: file.type,
        });
      }
    }

    // content 내의 blob URL을 `/api/download/{filename}` 형식으로 교체
    Object.entries(urlMapping).forEach(([pattern, replacement]) => {
      const regex = new RegExp(pattern, 'g');
      content = content.replace(regex, replacement);
    });

    // 기존 파일과 새 파일 병합
    const updatedFiles = [...existingFiles, ...newFiles];

    // 메모 업데이트
    await docClient.send(
      new UpdateCommand({
        TableName: 'Memos',
        Key: { type: 'MEMO', createdAt },
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

    // 응답에 presigned URL 포함
    const filesWithPresignedUrls = await Promise.all(
      updatedFiles.map(async (file) => {
        const fileKey = file.fileUrl.split('.com/')[1];
        return {
          ...file,
          fileUrl: await generatePresignedUrl(fileKey),
        };
      })
    );

    return NextResponse.json({
      id,
      content,
      files: filesWithPresignedUrls,
      fileCount: filesWithPresignedUrls.length,
      createdAt,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Memo update failed:', error);
    return NextResponse.json(
      { error: 'Failed to update memo' },
      { status: 500 }
    );
  }
}
