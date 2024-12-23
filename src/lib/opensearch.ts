const { Client } = require('@opensearch-project/opensearch');
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import { defaultProvider } from '@aws-sdk/credential-provider-node';

const osClient = new Client({
  ...AwsSigv4Signer({
    region: process.env.AWS_REGION || 'ap-northeast-2',
    service: 'aoss',
    getCredentials: () => {
      const credentialsProvider = defaultProvider();
      return credentialsProvider();
    },
  }),
  node: process.env.AWS_OPENSEARCH_ENDPOINT || 'https://69jgxbfclj25cww04bk4.ap-northeast-2.aoss.amazonaws.com',
});

export default osClient;
