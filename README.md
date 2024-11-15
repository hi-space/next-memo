# NEXT Memo

## AWS 리소스 설정

<details>
<summary>DynamoDB Table</summary>

```json
{
    "Table": {
        "AttributeDefinitions": [
            {
                "AttributeName": "createdAt",
                "AttributeType": "S"
            },
            {
                "AttributeName": "id",
                "AttributeType": "S"
            },
            {
                "AttributeName": "type",
                "AttributeType": "S"
            }
        ],
        "TableName": "Memos",
        "KeySchema": [
            {
                "AttributeName": "type",
                "KeyType": "HASH"
            },
            {
                "AttributeName": "createdAt",
                "KeyType": "RANGE"
            }
        ],
        "TableStatus": "ACTIVE",
        "CreationDateTime": 1731042576.756,
        "ProvisionedThroughput": {
            "NumberOfDecreasesToday": 0,
            "ReadCapacityUnits": 5,
            "WriteCapacityUnits": 5
        },
        "TableSizeBytes": 5595,
        "ItemCount": 8,
        "TableArn": "arn:aws:dynamodb:ap-northeast-2:913524902871:table/Memos",
        "TableId": "5ff2aab4-195e-4f72-a434-a2b15d068870",
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "IdIndex",
                "KeySchema": [
                    {
                        "AttributeName": "id",
                        "KeyType": "HASH"
                    }
                ],
                "Projection": {
                    "ProjectionType": "ALL"
                },
                "IndexStatus": "ACTIVE",
                "ProvisionedThroughput": {
                    "NumberOfDecreasesToday": 0,
                    "ReadCapacityUnits": 5,
                    "WriteCapacityUnits": 5
                },
                "IndexSizeBytes": 5595,
                "ItemCount": 8,
                "IndexArn": "arn:aws:dynamodb:ap-northeast-2:913524902871:table/Memos/index/IdIndex"
            }
        ],
        "DeletionProtectionEnabled": false
    }
}
```
</detail>
