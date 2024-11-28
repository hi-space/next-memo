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

// export async function GET(request: NextRequest) {
//   try {
//     const searchParams = request.nextUrl.searchParams;
//     const priority = searchParams.get('priority');
//     const lastEvaluatedKey = searchParams.get('lastKey');
//     const limit = 10;

//     // QueryCommandInput 생성
//     const queryParams: QueryCommandInput = {
//       TableName: DYNAMODB_TABLE,
//       Limit: limit,
//       ScanIndexForward: false, // 최신순 정렬
//     };

//     if (priority) {
//       // `priority`가 있는 경우 PRIORITY_UPDATED_INDEX를 사용
//       queryParams.IndexName = PRIORITY_UPDATED_INDEX;
//       queryParams.KeyConditionExpression = 'priority = :priority';
//       queryParams.ExpressionAttributeValues = {
//         ':priority': Number(priority),
//       };
//     } else {
//       // `priority`가 없는 경우 `UpdatedIndex`를 사용
//       queryParams.IndexName = UPDATED_INDEX;
//       queryParams.KeyConditionExpression = 'gsiPartitionKey = :key';
//       queryParams.ExpressionAttributeValues = {
//         ':key': GSI_PARTITION_KEY,
//       };
//     }

//     // 페이지네이션 처리
//     if (lastEvaluatedKey) {
//       queryParams.ExclusiveStartKey = JSON.parse(lastEvaluatedKey);
//     }

//     // DynamoDB 쿼리 실행
//     const result = await docClient.send(new QueryCommand(queryParams));

//     // 응답 반환
//     return NextResponse.json({
//       items: result.Items || [],
//       lastEvaluatedKey: result.LastEvaluatedKey || null,
//     });
//   } catch (error) {
//     console.error('메모 불러오기 실패:', error);
//     return NextResponse.json(
//       { error: '메모를 불러오는 데 실패했습니다.' },
//       { status: 500 }
//     );
//   }
// }

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const priority = searchParams.get('priority');
    const searchTerm = searchParams.get('searchTerm')?.toLowerCase();
    const lastEvaluatedKey = searchParams.get('lastKey');
    const limit = 10;

    // QueryCommandInput 생성
    const queryParams: QueryCommandInput = {
      TableName: DYNAMODB_TABLE,
      Limit: limit,
      ScanIndexForward: false, // 최신순 정렬
    };

    // ExpressionAttributeValues 초기화
    const expressionAttributeValues: Record<string, any> = {};

    // ExpressionAttributeNames 초기화
    const expressionAttributeNames: Record<string, string> = {};

    if (priority) {
      // priority가 있는 경우 PRIORITY_UPDATED_INDEX 사용
      queryParams.IndexName = PRIORITY_UPDATED_INDEX;
      queryParams.KeyConditionExpression = 'priority = :priority';
      expressionAttributeValues[':priority'] = Number(priority);
    } else {
      // priority가 없는 경우 UPDATED_INDEX 사용
      queryParams.IndexName = UPDATED_INDEX;
      queryParams.KeyConditionExpression = 'gsiPartitionKey = :key';
      expressionAttributeValues[':key'] = GSI_PARTITION_KEY;
    }

    // 검색어가 있는 경우 FilterExpression 추가
    if (searchTerm) {
      // 제목과 내용에서 검색
      queryParams.FilterExpression =
        'contains(#title, :searchTerm) OR ' +
        'contains(#content, :searchTerm) OR ' +
        'contains(#summary, :searchTerm) OR ' +
        'contains(#tags, :searchTerm)';

      expressionAttributeValues[':searchTerm'] = searchTerm;
      expressionAttributeNames['#title'] = 'title';
      expressionAttributeNames['#content'] = 'content';
      expressionAttributeNames['#summary'] = 'summary';
      expressionAttributeNames['#tags'] = 'tags';
    }

    // ExpressionAttributeValues 설정
    queryParams.ExpressionAttributeValues = expressionAttributeValues;

    // ExpressionAttributeNames가 있는 경우에만 추가
    if (Object.keys(expressionAttributeNames).length > 0) {
      queryParams.ExpressionAttributeNames = expressionAttributeNames;
    }

    // 페이지네이션 처리
    if (lastEvaluatedKey) {
      queryParams.ExclusiveStartKey = JSON.parse(lastEvaluatedKey);
    }

    // DynamoDB 쿼리 실행
    const result = await docClient.send(new QueryCommand(queryParams));

    // 응답 반환
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
