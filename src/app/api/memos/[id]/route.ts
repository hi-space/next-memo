// src/app/api/memos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient } from '@/lib/dynamodb';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@/lib/s3';
import { escapeRegExp, isImageFile } from '@/utils/format';
import { FileInfo, Memo } from '@/types/memo';
import { DYNAMODB_TABLE } from '@/lib/constants';

export async function PUT(request: NextRequest & { params: { id: string } }) {
  try {
    const formData = await request.formData();
    const id = formData.get('id') as string;
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
        TableName: DYNAMODB_TABLE,
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
      await deleteS3Files(
        deletedFileUrls.map((url: string) => ({ fileUrl: url }))
      );
      existingFiles = existingFiles.filter(
        (file: FileInfo) => !deletedFileUrls.includes(file.fileUrl)
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
    const updatedAt = Date.now(); // Unix timestamp

    // 메모 업데이트
    const updatedMemo: Memo = {
      id: existingMemo.id, // 기존 메모의 id 유지
      createdAt: existingMemo.createdAt, // 기존 메모의 createdAt 유지
      gsiPartitionKey: 'ALL', // GSI 고정값 설정
      title,
      content,
      prefix,
      priority,
      files: updatedFiles,
      fileCount: updatedFiles.length,
      updatedAt, // 수정된 시간 갱신
    };

    // DynamoDB에 업데이트
    await docClient.send(
      new PutCommand({
        TableName: DYNAMODB_TABLE,
        Item: updatedMemo,
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== 'string') {
      console.error('Invalid id format:', id);
      return NextResponse.json({ error: 'Invalid id format' }, { status: 400 });
    }

    console.log('Received ID for deletion:', id);

    // 메모 정보 조회
    const getMemoResult = await docClient.send(
      new GetCommand({
        TableName: 'next-memo', // 테이블 이름
        Key: { id }, // 단일 Partition Key로 조회
      })
    );

    const memo = getMemoResult.Item;
    if (!memo) {
      console.error('Memo not found:', id);
      return NextResponse.json(
        { error: '메모를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    console.log('Memo found for deletion:', memo);

    // S3에 업로드된 파일 삭제
    if (memo.files && Array.isArray(memo.files)) {
      await deleteS3Files(memo.files);
      console.log('S3 files deleted successfully');
    }

    // DynamoDB에서 메모 삭제
    await docClient.send(
      new DeleteCommand({
        TableName: 'next-memo', // 테이블 이름
        Key: { id }, // 단일 Partition Key로 삭제
      })
    );

    console.log('Memo deleted successfully:', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('메모 삭제 실패:', error);
    return NextResponse.json(
      { error: '메모 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// S3에서 파일 삭제
async function deleteS3Files(files: FileInfo[]) {
  if (!files || !Array.isArray(files) || files.length === 0) return;

  const deletePromises = files.map((file) => {
    const fileKey = file.fileUrl
      .split(process.env.AWS_CLOUDFRONT_URL!)[1]
      ?.substring(1);

    if (!fileKey) {
      console.error('파일 키 추출 실패:', file.fileUrl);
      return Promise.resolve(); // Skip this file
    }

    console.log('Deleting S3 file:', fileKey);

    return s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: fileKey,
      })
    );
  });

  await Promise.all(deletePromises);
}
