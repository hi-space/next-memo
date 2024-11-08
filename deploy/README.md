## 1. ECR 생성

```sh
aws ecr create-repository --repository-name next-memo --region ap-northeast-2

aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin 913524902871.dkr.ecr.ap-northeast-2.amazonaws.com
docker build -t next-memo .
docker tag next-memo:latest 913524902871.dkr.ecr.ap-northeast-2.amazonaws.com/next-memo:latest
docker push 913524902871.dkr.ecr.ap-northeast-2.amazonaws.com/next-memo:latest
```

## 2. IAM

```sh
# ECS 태스크가 AWS 리소스에 접근할 수 있도록 IAM 역할을 생성
aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document file://ecs-trust-policy.json

# Role에 Policy 부여
aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

## 3. VPC, Security Group

```sh
# VPC 생성
aws ec2 create-vpc --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=next-memos-vpc}]' \
  --region ap-northeast-2

# public subnet 2개 생성
aws ec2 create-subnet --vpc-id vpc-0fd0429beef617238 --cidr-block 10.0.1.0/24 \
  --availability-zone ap-northeast-2a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=next-memos-subnet-1}]' \
  --region ap-northeast-2

aws ec2 create-subnet --vpc-id vpc-0fd0429beef617238 --cidr-block 10.0.2.0/24 \
  --availability-zone ap-northeast-2b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=next-memos-subnet-2}]' \
  --region ap-northeast-2

# Internet Gateway 생성
aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=next-memos-igw}]' \
  --region ap-northeast-2

# Internet Gateway 연결
aws ec2 attach-internet-gateway --region ap-northeast-2 --vpc-id vpc-0fd0429beef617238 --internet-gateway-id igw-05b1396bef900c5d6

# 라우팅 테이블 설정
aws ec2 create-route --route-table-id rtb-00cc9a7131a66c2ef \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id igw-05b1396bef900c5d6 \
  --region ap-northeast-2

# 보안 그룹 생성
aws ec2 create-security-group --group-name next-memos-sg \
  --description "Security group for next-memos ECS" \
  --vpc-id vpc-0fd0429beef617238 \
  --region ap-northeast-2

# 보안 그룹 설정 (inbound 3000)
aws ec2 authorize-security-group-ingress --group-id sg-003731847a6a2a436 \
  --protocol tcp --port 3000 --cidr 0.0.0.0/0 \
  --region ap-northeast-2
```

## 4. ECS 클러스터 생성

```sh
# ECS 클러스터 생성
aws ecs create-cluster --cluster-name next-memos-cluster --region ap-northeast-2

# 태스크 정의 등록
aws ecs register-task-definition --region ap-northeast-2 --cli-input-json file://task-definition.json

# ECS 서비스 생성
aws ecs create-service \
  --cluster next-memos-cluster \
  --region ap-northeast-2 \
  --service-name next-memos-service \
  --task-definition next-memos-task \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-0facc6773e5982aa8],securityGroups=[sg-003731847a6a2a436],assignPublicIp=ENABLED}"
```
