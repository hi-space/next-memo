// src/app/api/memos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  UpdateCommand,
  DeleteCommand,
  GetCommand,
  QueryCommand,
  PutCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient } from '@/lib/dynamodb';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, generatePresignedUrl, generateCdnUrl } from '@/lib/s3';
import { escapeRegExp, isImageFile } from '@/utils/format';
import { generateSummary } from '@/lib/bedrock';
import { FileInfo, Memo } from '@/types/memo';

export async function PUT(request: NextRequest & { params: { id: string } }) {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop() || '';
    const formData = await request.formData();
    const title = formData.get('title') as string;
    let content = formData.get('content') as string;
    const prefix = formData.get('prefix') as string;
    const priority = parseInt(formData.get('priority') as string);
    const deletedFileUrls = formData.get('deletedFileUrls')
      ? JSON.parse(formData.get('deletedFileUrls') as string)
      : [];

    // 기존 메모 조회
    const getMemoResult = await docClient.send(
      new QueryCommand({
        TableName: 'Memos',
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: {
          ':id': id,
        },
      })
    );

    const existingMemo = getMemoResult.Items?.[0];
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

      existingFiles = existingFiles.filter(
        (file: { fileUrl: string }) => !deletedFileUrls.includes(file.fileUrl)
      );
    }

    // 새로운 파일 업로드 및 URL 매핑
    const newFiles: FileInfo[] = [];
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

        const s3Url = `${process.env.AWS_CLOUDFRONT_URL}/${fileKey}`;
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
    const updatedAt = new Date().toISOString();

    // 새로운 sortKey 생성
    const newSortKey = `${priority}#${updatedAt}`;

    // 메모 업데이트
    const updatedMemo: Memo = {
      id,
      sortKey: newSortKey,
      title,
      content,
      prefix,
      priority,
      files: updatedFiles,
      fileCount: updatedFiles.length,
      createdAt: existingMemo.createdAt,
      updatedAt,
    };

    // await docClient.send(
    //   new PutCommand({
    //     TableName: 'Memos',
    //     Item: updatedMemo,
    //   })
    // );

    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Delete: {
              TableName: 'Memos',
              Key: {
                id: id,
                sortKey: existingMemo.sortKey,
              },
            },
          },
          {
            Put: {
              TableName: 'Memos',
              Item: updatedMemo,
            },
          },
        ],
      })
    );

    return NextResponse.json(updatedMemo);
  } catch (error) {
    console.error('Memo update failed:', error);
    return NextResponse.json(
      { error: 'Failed to update memo' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest & { params: { id: string } }
) {
  try {
    const url = request.nextUrl.pathname;
    const id = url.split('/').pop();

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // 메모 정보 조회
    const getMemoResult = await docClient.send(
      new QueryCommand({
        TableName: 'Memos',
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: {
          ':id': id,
        },
      })
    );

    const memo = getMemoResult.Items?.[0];
    if (!memo) {
      return NextResponse.json(
        { error: '메모를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // S3에 업로드된 파일들이 있다면 모두 삭제
    if (memo.files && Array.isArray(memo.files)) {
      const deletePromises = memo.files.map((file: FileInfo) => {
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
          id: id,
          sortKey: memo.sortKey,
        },
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('메모 삭제 실패:', error);
    return NextResponse.json(
      { error: '메모 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}
