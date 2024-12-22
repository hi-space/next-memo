
import json
from aws_cdk import (
    aws_ec2 as ec2,
    RemovalPolicy,
    aws_dynamodb as dynamodb,
    aws_lambda as lambda_,
    aws_iam as iam,
    aws_opensearchserverless as opensearch,
    aws_lambda_event_sources as lambda_event_sources,
    Stack,
    Duration,
    CfnOutput
)
from constructs import Construct

class NextMemoDataStack(Stack):
    def __init__(self, scope: Construct, id: str, **kwargs):
        super().__init__(scope, id, **kwargs)

        # Resource Names
        DYNAMODB_TABLE = "next-memo"
        COLLECTION_NAME = "memo-search"
        SG_NAME = "next-memos-sg"
        
        vpc = ec2.Vpc.from_lookup(
            self, "ExistingVPC",
            is_default=True
            # vpc_id=""
        )
        sg = ec2.SecurityGroup.from_lookup_by_name(
            self, SG_NAME,
            vpc=vpc,
            security_group_name=SG_NAME
        )

        # DynamoDB 테이블 생성
        table = dynamodb.Table.from_table_attributes(
            self, "MemoTable",
            table_name=DYNAMODB_TABLE,
        )
        
        # Collection에 Security Policy 연결
        security_policy = opensearch.CfnSecurityPolicy(
            self, "SearchSecurityPolicy",
            name=f"{COLLECTION_NAME}-security",
            type="encryption",
            policy=json.dumps({
                "Rules": [{
                    "Resource": [f"collection/{COLLECTION_NAME}"],
                    "ResourceType": "collection"
                }],
                "AWSOwnedKey": True
            }),
            description="Encryption policy for memo search collection"
        )

        # OpenSearch Serverless Collection 생성
        collection = opensearch.CfnCollection(
            self, "MemoSearchCollection",
            name=COLLECTION_NAME,
            type="SEARCH",
            description="Collection for memo search"
        )

        collection.add_dependency(security_policy)
        
        # OpenSearch Serverless 데이터 접근 정책
        access_policy = opensearch.CfnAccessPolicy(
            self, "SearchAccessPolicy",
            name="memo-search-access",
            type="data",
            description="Access policy for memo search collection",
            policy=json.dumps([{
                "Rules": [{
                    "Resource": [f"index/{COLLECTION_NAME}/*"],
                    "Permission": [
                        "aoss:ReadDocument",
                        "aoss:WriteDocument",
                        "aoss:CreateIndex",
                        "aoss:DeleteIndex",
                        "aoss:UpdateIndex",
                        "aoss:DescribeIndex"
                    ],
                    "ResourceType": "index"
                }],
                "Principal": [
                    f"arn:aws:iam::{self.account}:root"
                ],
                "Description": "Allow access to memo search collection"
            }])
        )

        collection.node.add_dependency(access_policy)
       
        # security_policy.node.add_dependency(collection)
        
        # Network 정책 설정
        vpc_endpoint = opensearch.CfnVpcEndpoint(
            self, "SearchVPCEndpoint",
            name="memo-search-vpc-endpoint",
            vpc_id=vpc.vpc_id,
            subnet_ids=vpc.select_subnets(
                subnet_type=ec2.SubnetType.PUBLIC
            ).subnet_ids,
            security_group_ids=[sg.security_group_id]
        )
        
        vpc_endpoint.node.add_dependency(collection)

        # Lambda 함수를 위한 IAM 역할 생성
        lambda_role = iam.Role(
            self, "LambdaRole",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AWSLambdaBasicExecutionRole"
                ),
                # VPC 접근을 위한 정책 추가
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AWSLambdaVPCAccessExecutionRole"
                )
            ]
        )

        # Bedrock 권한 추가
        lambda_role.add_to_policy(
            iam.PolicyStatement(
                actions=["bedrock:InvokeModel"],
                resources=["*"]
            )
        )

        # OpenSearch Serverless 권한 추가
        lambda_role.add_to_policy(
            iam.PolicyStatement(
                actions=["aoss:APIAccessAll"],
                resources=[f"arn:aws:aoss:{self.region}:{self.account}:collection/{collection.attr_arn}"]
            )
        )

        # DynamoDB Stream 읽기 권한 추가
        table.grant_stream_read(lambda_role)

        # Lambda 함수 생성
        sync_function = lambda_.Function(
            self, "DynamoToOpenSearchFunction",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="index.handler",
            code=lambda_.Code.from_asset("../lambda/dynamodb_to_opensearch"),
            role=lambda_role,
            timeout=Duration.seconds(30),
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PUBLIC
            ),
            allow_public_subnet=True,
            security_groups=[sg],
            environment={
                "OPENSEARCH_ENDPOINT": collection.attr_collection_endpoint,
                "REGION": self.region,
            }
        )

        # DynamoDB Stream을 Lambda 함수의 이벤트 소스로 추가
        sync_function.add_event_source(
            lambda_event_sources.DynamoEventSource(
                table,
                starting_position=lambda_.StartingPosition.LATEST,
                batch_size=1,
                retry_attempts=3
            )
        )

        # Outputs
        CfnOutput(
            self, "OpenSearchEndpoint",
            value=collection.attr_collection_endpoint,
            description="OpenSearch Serverless collection endpoint"
        )
