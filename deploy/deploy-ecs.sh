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
CONTAINER_NAME="next-memo"
ALB_NAME="next-memos-alb"
TG_NAME="next-memos-target-group"
LISTENER_PORT=80

# ECR 리포지토리 생성
echo "Checking ECR repository..."
REPO_URI=$(aws ecr describe-repositories --repository-names $REPOSITORY_NAME --region $REGION --query 'repositories[0].repositoryUri' --output text 2>/dev/null)

# if [ -z "$REPO_URI" ]; then
#   echo "Creating ECR repository..."
#   aws ecr create-repository --repository-name $REPOSITORY_NAME --region $REGION
#   REPO_URI=$(aws ecr describe-repositories --repository-names $REPOSITORY_NAME --region $REGION --query 'repositories[0].repositoryUri' --output text)
# fi

# # Docker 이미지 빌드 및 푸시
# echo "Logging in to ECR..."
# aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $REPO_URI
# docker build -t $REPOSITORY_NAME .
# docker tag $REPOSITORY_NAME:latest $REPO_URI:latest
# docker push $REPO_URI:latest

# VPC 생성
echo "Checking VPC..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=$VPC_NAME" --region $REGION --query 'Vpcs[0].VpcId' --output text 2>/dev/null)

if [ -z "$VPC_ID" ]; then
  echo "Creating VPC..."
  VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 --region $REGION \
    --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=$VPC_NAME}]" \
    --query 'Vpc.VpcId' --output text)
fi

# 서브넷 생성
SUBNET1_ID=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=$SUBNET1_NAME" --region $REGION --query 'Subnets[0].SubnetId' --output text 2>/dev/null)
if [ -z "$SUBNET1_ID" ]; then
  echo "Creating subnet 1..."
  SUBNET1_ID=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 \
    --availability-zone ${REGION}a --region $REGION \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$SUBNET1_NAME}]" \
    --query 'Subnet.SubnetId' --output text)
fi

SUBNET2_ID=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=$SUBNET2_NAME" --region $REGION --query 'Subnets[0].SubnetId' --output text 2>/dev/null)
if [ -z "$SUBNET2_ID" ]; then
  echo "Creating subnet 2..."
  SUBNET2_ID=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.2.0/24 \
    --availability-zone ${REGION}b --region $REGION \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$SUBNET2_NAME}]" \
    --query 'Subnet.SubnetId' --output text)
fi

# 인터넷 게이트웨이 생성 및 연결
IGW_ID=$(aws ec2 describe-internet-gateways --filters "Name=tag:Name,Values=$IGW_NAME" --region $REGION --query 'InternetGateways[0].InternetGatewayId' --output text 2>/dev/null)
if [ -z "$IGW_ID" ]; then
  echo "Creating and attaching Internet Gateway..."
  IGW_ID=$(aws ec2 create-internet-gateway --region $REGION \
    --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=$IGW_NAME}]" \
    --query 'InternetGateway.InternetGatewayId' --output text)
  aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID --region $REGION
fi

# 보안 그룹 생성
SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$SG_NAME" --region $REGION --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null)
if [ -z "$SG_ID" ]; then
  echo "Creating security group..."
  SG_ID=$(aws ec2 create-security-group --group-name $SG_NAME \
    --description "Security group for $SERVICE_NAME" --vpc-id $VPC_ID --region $REGION \
    --query 'GroupId' --output text)
  aws ec2 authorize-security-group-ingress --group-id $SG_ID \
    --protocol tcp --port 3000 --cidr 0.0.0.0/0 --region $REGION
fi

# ECS 클러스터 생성
CLUSTER_ARN=$(aws ecs describe-clusters --clusters $CLUSTER_NAME --region $REGION --query 'clusters[0].clusterArn' --output text 2>/dev/null)
if [ "$CLUSTER_ARN" == "None" ]; then
  echo "Creating ECS cluster..."
  aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $REGION
fi

# ALB 생성
ALB_ARN=$(aws elbv2 describe-load-balancers --names $ALB_NAME --region $REGION --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null)
if [ -z "$ALB_ARN" ]; then
  echo "Creating Application Load Balancer..."
  ALB_ARN=$(aws elbv2 create-load-balancer \
    --name $ALB_NAME \
    --subnets $SUBNET1_ID $SUBNET2_ID \
    --security-groups $SG_ID \
    --scheme internet-facing \
    --type application \
    --region $REGION \
    --query 'LoadBalancers[0].LoadBalancerArn' --output text)
fi

# 타겟 그룹 생성
TG_ARN=$(aws elbv2 describe-target-groups --names $TG_NAME --region $REGION --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null)
if [ -z "$TG_ARN" ]; then
  echo "Creating Target Group..."
  TG_ARN=$(aws elbv2 create-target-group \
    --name $TG_NAME \
    --protocol HTTP \
    --port 3000 \
    --vpc-id $VPC_ID \
    --target-type ip \
    --region $REGION \
    --query 'TargetGroups[0].TargetGroupArn' --output text)
fi

# ALB 리스너 생성
LISTENER_ARN=$(aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN --region $REGION --query 'Listeners[0].ListenerArn' --output text 2>/dev/null)
if [ -z "$LISTENER_ARN" ]; then
  echo "Creating ALB Listener..."
  LISTENER_ARN=$(aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port $LISTENER_PORT \
    --default-actions Type=forward,TargetGroupArn=$TG_ARN \
    --region $REGION \
    --query 'Listeners[0].ListenerArn' --output text)
fi

# ECS 서비스 업데이트 (ALB 연결)
# ECS 서비스 생성 또는 업데이트 (Target Group 연결)
SERVICE_ARN=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION --query 'services[0].serviceArn' --output text 2>/dev/null)

if [ "$SERVICE_ARN" == "None" ] || [ -z "$SERVICE_ARN" ]; then
  echo "Creating ECS service and connecting to Target Group..."
  aws ecs create-service \
    --cluster $CLUSTER_NAME \
    --service-name $SERVICE_NAME \
    --task-definition $TASK_FAMILY \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET1_ID,$SUBNET2_ID],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=$TG_ARN,containerName=$CONTAINER_NAME,containerPort=3000" \
    --region $REGION
else
  echo "Updating ECS service with Target Group..."
  aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $SERVICE_NAME \
    --load-balancers "targetGroupArn=$TG_ARN,containerName=$CONTAINER_NAME,containerPort=3000" \
    --desired-count 1 \
    --region $REGION
fi

echo "ECS service configuration completed successfully."

echo "ALB and Target Group configuration completed successfully."
