// src/lib/bedrock.ts
import { BedrockChat } from '@langchain/community/chat_models/bedrock';
import { PromptTemplate } from '@langchain/core/prompts';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '@/lib/dynamodb';
import { Memo } from '@/types/memo';
import json from 'json';

// Bedrock 모델 설정
export const llm = new BedrockChat({
  model: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
  region: process.env.AWS_BEDROCK_REGION,
});

export async function generateSummary(memo: Memo) {
  const TEMPLATE_SUMMARY = `다음 메모의 내용을 나타낼 수 있는 제목을 한 줄 이내로 작성하고, 핵심 키워드도 3개 추출하세요.

    <content>
    {content}
    </content>

    응답은 반드시 다음과 같은 JSON 형식으로 출력하세요:
    {{
        "title": "제목",
        "keywords": ["keyword1", "keyword2", "keyword3"]
    }}`;

  try {
    const prompt = PromptTemplate.fromTemplate(TEMPLATE_SUMMARY);
    const chain = prompt.pipe(llm);
    const result = await chain.invoke({
      content: memo.content,
    });

    console.log(result);

    let summaryResult;
    try {
      summaryResult = JSON.parse(result.content as string); // JSON 파싱
    } catch (parseError) {
      throw new Error('Failed to parse result content as JSON');
    }

    // DynamoDB 업데이트 명령 실행
    await docClient.send(
      new UpdateCommand({
        TableName: 'Memos',
        Key: {
          type: memo.type,
          createdAt: memo.createdAt,
        },
        UpdateExpression: 'SET summary = :summary',
        ExpressionAttributeValues: {
          ':summary': {
            title: summaryResult.title,
            keywords: summaryResult.keywords,
          },
        },
      })
    );

    return result;
  } catch (error) {
    console.error('요약 생성 중 에러 발생:', error);
    throw error;
  }
}
