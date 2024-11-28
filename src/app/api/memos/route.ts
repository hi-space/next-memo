// src/app/api/memos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  PutCommand,
  ScanCommand,
  QueryCommand,
  QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { docClient } from '@/lib/dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, generateCdnUrl } from '@/lib/s3';
import { FileInfo, Memo } from '@/types/memo';
import { escapeRegExp, isImageFile } from '@/utils/format';
import { generateSummary } from '@/lib/bedrock';
import {
  DYNAMODB_TABLE,
  GSI_PARTITION_KEY,
  PRIORITY_UPDATED_INDEX,
  UPDATED_INDEX,
} from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const title = formData.get('title') as string;
    let content = formData.get('content') as string;
    const prefix = formData.get('prefix') as string;
    const priority = parseInt(formData.get('priority') as string) || 0;
    const id = uuidv4(); // 고유 ID 생성
    const timestamp = Date.now(); // 현재 시간 (Unix Timestamp)
    const files: FileInfo[] = [];
    const urlMapping: { [key: string]: string } = {};

    // 새로운 파일 처리
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

          const s3Url = `${process.env.AWS_CLOUDFRONT_URL}/${fileKey}`;

          // URL 매핑 생성
          const markdownPattern = new RegExp(
            `!?\\[${escapeRegExp(fileName)}\\]\\(blob:[^)]+\\)`,
            'g'
          );
          const markdownReplacement = `${
            isImageFile(fileName) ? '!' : ''
          }[${fileName}](/api/download/${id}-${fileName})`;
          urlMapping[markdownPattern.source] = markdownReplacement;

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

    // DynamoDB에 저장할 메모 데이터 생성
    const memo: Memo = {
      id, // Partition Key
      gsiPartitionKey: 'ALL', // GSI에서 사용하는 고정 Partition Key
      priority, // GSI의 Partition Key
      title,
      content,
      prefix,
      files,
      fileCount: files.length,
      createdAt: timestamp, // 생성 시각
      updatedAt: timestamp, // 수정 시각
    };

    // DynamoDB에 메모 삽입
    await docClient.send(
      new PutCommand({
        TableName: DYNAMODB_TABLE,
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
    const priority = searchParams.get('priority');
    const prefix = searchParams.get('prefix');
    const searchTerm = searchParams.get('searchTerm')?.toLowerCase();
    const lastEvaluatedKey = searchParams.get('lastKey');
    const limit = 10;

    const queryParams: QueryCommandInput = {
      TableName: DYNAMODB_TABLE,
      Limit: limit,
      ScanIndexForward: false,
    };

    const expressionAttributeValues: Record<string, any> = {};
    const expressionAttributeNames: Record<string, string> = {};
    let filterExpressions: string[] = [];

    if (priority) {
      queryParams.IndexName = PRIORITY_UPDATED_INDEX;
      queryParams.KeyConditionExpression = 'priority = :priority';
      expressionAttributeValues[':priority'] = Number(priority);
    } else {
      queryParams.IndexName = UPDATED_INDEX;
      queryParams.KeyConditionExpression = 'gsiPartitionKey = :key';
      expressionAttributeValues[':key'] = GSI_PARTITION_KEY;
    }

    if (prefix) {
      filterExpressions.push('prefix = :prefix');
      expressionAttributeValues[':prefix'] = prefix;
    }

    if (searchTerm) {
      filterExpressions.push(
        '(contains(#title, :searchTerm) OR ' +
          'contains(#content, :searchTerm) OR ' +
          'contains(#summary, :searchTerm) OR ' +
          'contains(#tags, :searchTerm))'
      );
      expressionAttributeValues[':searchTerm'] = searchTerm;
      expressionAttributeNames['#title'] = 'title';
      expressionAttributeNames['#content'] = 'content';
      expressionAttributeNames['#summary'] = 'summary';
      expressionAttributeNames['#tags'] = 'tags';
    }

    // 필터 표현식 조합
    if (filterExpressions.length > 0) {
      queryParams.FilterExpression = filterExpressions.join(' AND ');
    }

    // ExpressionAttributeValues 설정
    if (Object.keys(expressionAttributeValues).length > 0) {
      queryParams.ExpressionAttributeValues = expressionAttributeValues;
    }

    // ExpressionAttributeNames 설정
    if (Object.keys(expressionAttributeNames).length > 0) {
      queryParams.ExpressionAttributeNames = expressionAttributeNames;
    }

    if (lastEvaluatedKey) {
      queryParams.ExclusiveStartKey = JSON.parse(lastEvaluatedKey);
    }

    const result = await docClient.send(new QueryCommand(queryParams));

    return NextResponse.json({
      items: result.Items || [],
      lastEvaluatedKey: result.LastEvaluatedKey || null,
    });
  } catch (error) {
    console.error('메모 불러오기 실패:', error);
    return NextResponse.json(
      { error: '메모를 불러오는 데 실패했습니다.' },
      { status: 500 }
    );
  }
}
