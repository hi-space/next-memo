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


def get_aws_auth():
    credentials = boto3.Session().get_credentials()
    region = os.environ['REGION']
    return AWS4Auth(
        credentials.access_key,
        credentials.secret_key,
        region,
        'aoss',
        session_token=credentials.token
    )

def create_opensearch_client():
    host = os.environ['OPENSEARCH_ENDPOINT'].replace('https://', '')
    region = os.environ['REGION']
    
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

def process_record(record, client):
    if record['eventName'] == 'REMOVE':
        document_id = record['dynamodb']['OldImage']['id']['S']
        try:
            client.delete(
                index=COLLECTION_NAME,
                id=document_id
            )
        except Exception as e:
            print(f"Error deleting document {document_id}: {str(e)}")
    else: # INSERT, MODIFY
        new_image = record['dynamodb']['NewImage']
        
        document = {
            'title': new_image['title']['S'],
            'content': new_image['content']['S'],
            'summary': new_image.get('summary', {}).get('S', ''),
            'tags': new_image.get('tags', {}).get('SS', []),
            'prefix': new_image.get('prefix', {}).get('S', ''),
            'priority': int(new_image.get('priority', {}).get('N', '0')),
            'updatedAt': int(new_image['updatedAt']['N'])
        }
        
        try:
            client.index(
                index=COLLECTION_NAME,
                body=document,
                id=new_image['id']['S'],
            )
        except Exception as e:
            print(f"Error indexing document: {str(e)}")

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

def handler(event, context):
    client = create_opensearch_client()
        
    try:
        # 인덱스 생성 및 준비 상태 확인
        index_ready = create_index_if_not_exists(client)
        
        if index_ready:
            # DynamoDB 스트림 이벤트 처리
            for record in event['Records']:
                process_record(record, client)
            
    except Exception as e:
        print(f"Error in handler: {str(e)}")
        raise e
    
    return {
        'statusCode': 200,
        'body': json.dumps('Processing complete')
    }