// src/lib/bedrock.ts
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import axios from 'axios';
import { PromptTemplate } from '@langchain/core/prompts';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '@/lib/dynamodb';
import { Memo } from '@/types/memo';
import { generatePresignedUrl } from './s3';
import { isImageFile } from '@/utils/format';

// Bedrock 모델 설정
// export const llm = new BedrockChat({
//   model: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
//   region: process.env.AWS_BEDROCK_REGION ?? 'us-east-1',
// });

const MODEL_HAIKU = 'us.anthropic.claude-3-5-haiku-20241022-v1:0';
const MODEL_SONNET = 'us.anthropic.claude-3-5-sonnet-20241022-v2:0';

interface ImageSource {
  type: 'base64';
  media_type: string;
  data: string;
}

interface MessageContent {
  type: 'text' | 'image';
  text?: string;
  source?: ImageSource;
}

export async function generateSummary(memo: Memo) {
  const TEMPLATE_SUMMARY = `다음 메모의 내용과 이미지를 나타낼 수 있는 제목을 한 줄 이내로 작성하고, 핵심 내용을 100자 이내로 요약하세요. 그리고 핵심 내용을 바탕으로 태그도 3개 추출하세요. 내용이 없다면 빈 칸으로 값을 채우세요.

    <content>
    {content}
    </content>

    응답은 반드시 다음과 같은 JSON 형식으로 출력하세요:
    {{
        "title": "제목",
        "summary": "요약 내용",
        "tags": ["tag1", "tag2", "tag3"]
    }}`;

  try {
    const prompt = PromptTemplate.fromTemplate(TEMPLATE_SUMMARY);
    const text = await prompt.format({ content: memo.content });

    const bedrock = new BedrockRuntimeClient({
      region: process.env.AWS_BEDROCK_REGION ?? 'us-east-1',
    });
    const payload: {
      anthropic_version: string;
      max_tokens: number;
      messages: Array<{
        role: string;
        content: MessageContent[];
      }>;
    } = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: text.toString() }],
        },
      ],
    };

    let modelId = MODEL_HAIKU;

    if (memo.fileCount && memo.files && memo.files.length > 0) {
      try {
        const file = memo.files[0];

        if (isImageFile(file.fileName)) {
          const s3Url = new URL(file.fileUrl);
          const key = decodeURIComponent(s3Url.pathname.slice(1));

          const signedUrl = await generatePresignedUrl(key);
          const response = await fetch(signedUrl);
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');

          payload.messages[0].content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: file.fileType,
              data: base64,
            },
          });

          modelId = MODEL_SONNET;
        }
      } catch (error) {
        console.error('Failed to process file:', error);
        throw error;
      }
    }

    let summaryResult;
    const command = new InvokeModelCommand({
      body: JSON.stringify(payload),
      modelId: modelId,
      contentType: 'application/json',
      accept: 'application/json',
    });

    try {
      const response = await bedrock.send(command);
      const responseBody = await response.body?.transformToString();
      const result = JSON.parse(responseBody!);

      summaryResult = JSON.parse(result.content[0].text as string);
    } catch (error) {
      console.error('Failed to generate answer:', error);
      throw error;
    }

    console.log(summaryResult);

    // DynamoDB 업데이트 명령 실행
    await docClient.send(
      new UpdateCommand({
        TableName: 'Memos',
        Key: {
          type: memo.type,
          createdAt: memo.createdAt,
        },
        UpdateExpression:
          'SET title = :title, tags = :tags, summary = :summary',
        ExpressionAttributeValues: {
          ':title': memo.title || summaryResult.title,
          ':tags': summaryResult.tags,
          ':summary': summaryResult.summary,
        },
      })
    );

    return summaryResult;
  } catch (error) {
    console.error('요약 생성 중 에러 발생:', error);

    return {
      title: '',
      summary: '',
      tags: [],
      error: 'Failed to generate summary',
    };
  }
}
