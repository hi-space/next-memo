// src/app/api/memos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PutCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '@/lib/dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, generateCdnUrl } from '@/lib/s3';
import { FileInfo, Memo } from '@/types/memo';
import { escapeRegExp, isImageFile } from '@/utils/format';
import { generateSummary } from '@/lib/bedrock';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const title = formData.get('title') as string;
    let content = formData.get('content') as string;
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    const files: FileInfo[] = [];
    const urlMapping: { [key: string]: string } = {};

    // 새로운 파일들 처리
    const fileEntries = Array.from(formData.entries()).filter(([key]) =>
      key.startsWith('files[')
    );

    for (const [_, file] of fileEntries) {
      if (file instanceof File) {
        try {
          const fileName = file.name;
          const fileKey = `files/${id}-${fileName}`;
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // S3에 파일 업로드
          await s3Client.send(
            new PutObjectCommand({
              Bucket: process.env.AWS_S3_BUCKET!,
              Key: fileKey,
              Body: buffer,
              ContentType: file.type,
            })
          );

          const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

          // URL 매핑 생성
          const markdownPattern = new RegExp(
            `!?\\[${escapeRegExp(fileName)}\\]\\(blob:[^)]+\\)`,
            'g'
          );
          const markdownReplacement = `${
            isImageFile(fileName) ? '!' : ''
          }[${fileName}](/api/download/${id}-${fileName})`;
          urlMapping[markdownPattern.source] = markdownReplacement;

          // 파일 정보 저장
          files.push({
            fileName: fileName,
            fileUrl: s3Url,
            fileType: file.type,
          });
        } catch (error) {
          console.error(`파일 업로드 실패: ${file.name}`, error);
          continue;
        }
      }
    }

    // content 내의 blob URL들을 S3 URL로 치환
    Object.entries(urlMapping).forEach(([pattern, replacement]) => {
      const regex = new RegExp(pattern, 'g');
      content = content.replace(regex, replacement);
    });
    const memo: Memo = {
      id,
      type: 'MEMO',
      title,
      content,
      files, // 파일 정보 배열 저장
      fileCount: files.length, // 파일 개수 저장
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await docClient.send(
      new PutCommand({
        TableName: 'Memos',
        Item: memo,
      })
    );

    return NextResponse.json(memo);
  } catch (error) {
    console.error('메모 작성 실패:', error);
    return NextResponse.json(
      { error: '메모 작성에 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lastEvaluatedKey = searchParams.get('lastKey');
    const limit = 10;

    const result = await docClient.send(
      new QueryCommand({
        TableName: 'Memos',
        KeyConditionExpression: '#type = :type',
        ExpressionAttributeNames: {
          '#type': 'type',
        },
        ExpressionAttributeValues: {
          ':type': 'MEMO',
        },
        Limit: limit,
        ScanIndexForward: false,
        ...(lastEvaluatedKey && {
          ExclusiveStartKey: JSON.parse(lastEvaluatedKey),
        }),
      })
    );

    // 각 메모의 files 배열 내 fileUrl들을 presigned URL로 변환
    const items = await Promise.all(
      (result.Items || []).map(async (item) => {
        if (item.files && Array.isArray(item.files)) {
          const updatedFiles = await Promise.all(
            item.files.map(async (file: FileInfo) => {
              if (file.fileUrl) {
                const fileKey = file.fileUrl.split('.com/')[1];
                return {
                  ...file,
                  fileUrl: generateCdnUrl(fileKey),
                };
              }
              return file;
            })
          );
          return {
            ...item,
            files: updatedFiles,
          };
        }
        return item;
      })
    );

    return NextResponse.json({
      items: items,
      lastEvaluatedKey: result.LastEvaluatedKey || null,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: '메모 불러오기에 실패했습니다.' },
      { status: 500 }
    );
  }
}
