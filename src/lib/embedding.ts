import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

export class TextEmbedding {
  private bedrock: BedrockRuntimeClient;
  private textEmbeddingId: string;

  constructor() {
    this.bedrock = new BedrockRuntimeClient({
      region: process.env.AWS_BEDROCK_REGION ?? 'us-east-1',
    });
    this.textEmbeddingId = 'amazon.titan-embed-text-v2:0';
  }

  async get_embedding(text: string): Promise<number[] | null> {
    if (!text) return null;

    try {
      const command = new InvokeModelCommand({
        modelId: this.textEmbeddingId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({ inputText: text }),
      });

      const response = await this.bedrock.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return responseBody.embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return null;
    }
  }
}
