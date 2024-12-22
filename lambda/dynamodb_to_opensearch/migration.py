import sys, os
import time
import json
import boto3
from opensearchpy import OpenSearch, RequestsHttpConnection
from requests_aws4auth import AWS4Auth
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'packages'))

COLLECTION_NAME = "next_memo"
MAX_RETRIES = 10
RETRY_DELAY = 2  # seconds


AWS_OPENSEARCH_ENDPOINT="https://69jgxbfclj25cww04bk4.ap-northeast-2.aoss.amazonaws.com"
AWS_REGION="ap-northeast-2"

def get_aws_auth():
    credentials = boto3.Session().get_credentials()
    region = AWS_REGION
    return AWS4Auth(
        credentials.access_key,
        credentials.secret_key,
        region,
        'aoss',
        session_token=credentials.token
    )

def create_opensearch_client():
    host = AWS_OPENSEARCH_ENDPOINT.replace('https://', '')
    region = AWS_REGION
    
    return OpenSearch(
        hosts=[{'host': host, 'port': 443}],
        http_auth=get_aws_auth(),
        use_ssl=True,
        verify_certs=True,
        connection_class=RequestsHttpConnection
    )

def wait_for_index_ready(client, index_name):
    """인덱스가 생성되고 사용 가능한 상태가 될 때까지 대기"""
    for attempt in range(MAX_RETRIES):
        try:
            # 인덱스 상태 확인
            response = client.cluster.health(index=index_name, wait_for_status='yellow', timeout='30s')
            status = response.get('status')
            
            if status in ['yellow', 'green']:
                print(f"Index {index_name} is ready with status: {status}")
                return True
                
            print(f"Waiting for index to be ready... Status: {status}, Attempt: {attempt + 1}/{MAX_RETRIES}")
            time.sleep(RETRY_DELAY)
            
        except Exception as e:
            print(f"Error checking index status (attempt {attempt + 1}/{MAX_RETRIES}): {str(e)}")
            time.sleep(RETRY_DELAY)
            continue
            
    print(f"Index did not become ready after {MAX_RETRIES} attempts")
    return False


def process_item(doc, opensearch_client):
    try:   
        document = {
            'title': doc['title']['S'],
            'content': doc['content']['S'],
            'summary': doc.get('summary', {}).get('S', ''),
            'tags': [item.get('S', '') for item in doc.get('tags', {}).get('L', [])],
            'prefix': doc.get('prefix', {}).get('S', ''),
            'priority': int(doc.get('priority', {}).get('N', '0')),
            'updatedAt': int(doc['updatedAt']['N'])
        }
    
        opensearch_client.index(
            index=COLLECTION_NAME,
            body=document,
            id=doc['id']['S']
        )
        return True
    except Exception as e:
        print(f"Error processing item {doc.get('id', {}).get('S')}: {str(e)}")
        return False

def migrate_data():
    # DynamoDB 클라이언트 생성
    dynamodb = boto3.client('dynamodb', region_name=AWS_REGION)
    opensearch_client = create_opensearch_client()
    
    # 페이지네이션을 위한 변수들
    last_evaluated_key = None
    processed_count = 0
    error_count = 0
    batch_size = 25  # 한 번에 처리할 항목 수
    
    print("Starting migration...")
    
    try:
        while True:
            # DynamoDB 스캔 파라미터 설정
            scan_params = {
                'TableName': 'next-memo',
                'Limit': batch_size
            }
            
            if last_evaluated_key:
                scan_params['ExclusiveStartKey'] = last_evaluated_key
            
            # DynamoDB 테이블 스캔
            response = dynamodb.scan(**scan_params)
            items = response.get('Items', [])
            
            if not items:
                break
            
            for item in items:
                res = process_item(item, opensearch_client)
                processed_count += 1
                
                if not res:
                    error_count += 1
            
            # 다음 페이지 존재 여부 확인
            last_evaluated_key = response.get('LastEvaluatedKey')
            if not last_evaluated_key:
                break
            
            # API 제한을 위한 잠시 대기
            time.sleep(1)
    
    except Exception as e:
        print(f"Migration failed: {str(e)}")
        return False
    
    print(f"\nMigration completed:")
    print(f"Total processed: {processed_count}")
    print(f"Total errors: {error_count}")
    return True

def create_index_if_not_exists(client):
    try:
        if not client.indices.exists(COLLECTION_NAME):
            print(f"Creating index {COLLECTION_NAME}...")
            index_body = {
                'settings': {
                    'index': {
                        'number_of_shards': 1,
                        'number_of_replicas': 1
                    },
                    "analysis": {
                        "analyzer": {
                            "ngram_analyzer": {
                                "type": "custom",
                                "tokenizer": "ngram_tokenizer",
                                "filter": ["lowercase"]
                            },
                            "standard_with_lowercase": {
                                "type": "custom",
                                "tokenizer": "standard",
                                "filter": ["lowercase"]
                            }
                        },
                        "tokenizer": {
                            "ngram_tokenizer": {
                                "type": "ngram",
                                "min_gram": 2,
                                "max_gram": 3,
                                "token_chars": ["letter", "digit"]
                            }
                        }
                    }
                },
                'mappings': {
                    'properties': {
                        'title': {
                            'type': 'text',
                            'analyzer': 'standard_with_lowercase',
                            'fields': {
                                'ngram': {
                                    'type': 'text',
                                    'analyzer': 'ngram_analyzer'
                                },
                                'keyword': {
                                    'type': 'keyword',
                                    'ignore_above': 256
                                }
                            }
                        },
                        'content': {
                            'type': 'text',
                            'analyzer': 'standard_with_lowercase',
                            'fields': {
                                'ngram': {
                                    'type': 'text',
                                    'analyzer': 'ngram_analyzer'
                                }
                            }
                        },
                        'summary': {
                            'type': 'text',
                            'analyzer': 'standard_with_lowercase',
                            'fields': {
                                'ngram': {
                                    'type': 'text',
                                    'analyzer': 'ngram_analyzer'
                                }
                            }
                        },
                        'tags': {
                            'type': 'text',
                            'fields': {
                                'keyword': {
                                    'type': 'keyword'
                                }
                            }
                        },
                        'prefix': {
                            'type': 'keyword'
                        },
                        'priority': {
                            'type': 'integer'
                        },
                        'updatedAt': {
                            'type': 'date',
                            'format': 'epoch_millis'
                        }
                    }
                }
            }
            
            client.indices.create(COLLECTION_NAME, body=index_body)
            return wait_for_index_ready(client, COLLECTION_NAME)
        else:
            print(f"Index {COLLECTION_NAME} already exists")
            return True
            
    except Exception as e:
        print(f"Error creating index: {str(e)}")
        return False

if __name__ == "__main__":
    client = create_opensearch_client()
        
    try:
        # index_ready = create_index_if_not_exists(client)
        # if index_ready:
        migrate_data()
            
    except Exception as e:
        print(f"Error in handler: {str(e)}")
        raise e
    