# NEXT Memo

## AWS 리소스 설정

<details>
<summary>DynamoDB Table</summary>

```json
aws dynamodb update-table \
    --table-name Memos \
    --attribute-definitions AttributeName=createdAt,AttributeType=S \
    --global-secondary-index-updates \
        "[{\"Create\":{\"IndexName\": \"CreatedAtIndex\",\"KeySchema\":[{\"AttributeName\":\"id\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"createdAt\",\"KeyType\":\"RANGE\"}],\"ProvisionedThroughput\":{\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}}}]"
```
</detail>
