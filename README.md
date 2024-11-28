# NEXT Memo

## AWS 리소스 설정

<details>
<summary>DynamoDB Table</summary>

```json
aws dynamodb create-table \
  --table-name next-memo \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=priority,AttributeType=N \
    AttributeName=updatedAt,AttributeType=N \
    AttributeName=gsiPartitionKey,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
    '[{
      "IndexName": "UpdatedIndex",
      "KeySchema": [
        {"AttributeName": "gsiPartitionKey", "KeyType": "HASH"},
        {"AttributeName": "updatedAt", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    },
    {
      "IndexName": "PriorityUpdatedIndex",
      "KeySchema": [
        {"AttributeName": "priority", "KeyType": "HASH"},
        {"AttributeName": "updatedAt", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    }]'
```
</detail>
