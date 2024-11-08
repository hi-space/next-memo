#!/bin/bash

# AWS 리전 설정
REGION="ap-northeast-2"
REPOSITORY_NAME="next-memo"
CLUSTER_NAME="next-memos-cluster"
SERVICE_NAME="next-memos-service"
VPC_NAME="next-memos-vpc"
SUBNET1_NAME="next-memos-subnet-1"
SUBNET2_NAME="next-memos-subnet-2"
IGW_NAME="next-memos-igw"
SG_NAME="next-memos-sg"
TASK_FAMILY="next-memos-task"
CONTAINER_NAME="next-memos"
ALB_NAME="next-memos-alb"
TG_NAME="next-memos-target-group"
LISTENER_PORT=80

# ECR 리포지토리 생성
echo "Creating ECR repository..."
aws ecr create-repository --repository-name $REPOSITORY_NAME --region $REGION

# Docker 이미지 빌드 및 푸시
echo "Logging in to ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
docker build -t $REPOSITORY_NAME .
docker tag $REPOSITORY_NAME:latest $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPOSITORY_NAME:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPOSITORY_NAME:latest

# VPC 생성
echo "Creating VPC..."
VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 --region $REGION \
  --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=$VPC_NAME}]" \
  --query 'Vpc.VpcId' --output text)

# 서브넷 생성
echo "Creating subnets..."
SUBNET1_ID=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 \
  --availability-zone ${REGION}a --region $REGION \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$SUBNET1_NAME}]" \
  --query 'Subnet.SubnetId' --output text)

SUBNET2_ID=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.2.0/24 \
  --availability-zone ${REGION}b --region $REGION \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$SUBNET2_NAME}]" \
  --query 'Subnet.SubnetId' --output text)

# 인터넷 게이트웨이 생성 및 연결
echo "Creating and attaching Internet Gateway..."
IGW_ID=$(aws ec2 create-internet-gateway --region $REGION \
  --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=$IGW_NAME}]" \
  --query 'InternetGateway.InternetGatewayId' --output text)

aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID --region $REGION

# 라우팅 테이블 설정
echo "Configuring route table..."
ROUTE_TABLE_ID=$(aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$VPC_ID" \
  --region $REGION --query 'RouteTables[0].RouteTableId' --output text)

aws ec2 create-route --route-table-id $ROUTE_TABLE_ID --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID --region $REGION

# 보안 그룹 생성 및 규칙 추가
echo "Creating security group..."
SG_ID=$(aws ec2 create-security-group --group-name $SG_NAME \
  --description "Security group for $SERVICE_NAME" --vpc-id $VPC_ID --region $REGION \
  --query 'GroupId' --output text)

aws ec2 authorize-security-group-ingress --group-id $SG_ID \
  --protocol tcp --port 3000 --cidr 0.0.0.0/0 --region $REGION

# IAM 역할 생성
echo "Creating IAM role..."
aws iam create-role --role-name ecsTaskExecutionRole \
  --assume-role-policy-document file://ecs-trust-policy.json

aws iam attach-role-policy --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# ECS 클러스터 생성
echo "Creating ECS cluster..."
aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $REGION

# 태스크 정의 등록
echo "Registering task definition..."
aws ecs register-task-definition --region $REGION --cli-input-json file://task-definition.json

# ECS 서비스 생성
echo "Creating ECS service..."
aws ecs create-service \
  --cluster $CLUSTER_NAME \
  --region $REGION \
  --service-name $SERVICE_NAME \
  --task-definition $TASK_FAMILY \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET1_ID,$SUBNET2_ID],securityGroups=[$SG_ID],assignPublicIp=ENABLED}"

echo "Deployment completed successfully."

# ALB 보안 그룹 생성 (포트 80, 443 허용)
echo "Creating ALB security group..."
ALB_SG_ID=$(aws ec2 create-security-group --group-name ${ALB_NAME}-sg \
  --description "Security group for ALB" --vpc-id $VPC_ID --region $REGION \
  --query 'GroupId' --output text)

aws ec2 authorize-security-group-ingress --group-id $ALB_SG_ID \
  --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $REGION

aws ec2 authorize-security-group-ingress --group-id $ALB_SG_ID \
  --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $REGION

# ALB 생성
echo "Creating Application Load Balancer..."
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name $ALB_NAME \
  --subnets $SUBNET1_ID $SUBNET2_ID \
  --security-groups $ALB_SG_ID \
  --scheme internet-facing \
  --type application \
  --region $REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text)

# 타겟 그룹 생성
echo "Creating Target Group..."
TG_ARN=$(aws elbv2 create-target-group \
  --name $TG_NAME \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --region $REGION \
  --query 'TargetGroups[0].TargetGroupArn' --output text)

# ALB 리스너 생성
echo "Creating ALB Listener..."
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port $LISTENER_PORT \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --region $REGION

# ECS 서비스 업데이트 (ALB 연결)
echo "Updating ECS service with ALB..."
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --load-balancers "targetGroupArn=$TG_ARN,containerName=$CONTAINER_NAME,containerPort=3000" \
  --desired-count 1 \
  --region $REGION

echo "ALB and ECS service configuration completed successfully."