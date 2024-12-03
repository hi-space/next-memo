from aws_cdk import (
    aws_ec2 as ec2,
    aws_ecr as ecr,
    aws_ecs as ecs,
    aws_elasticloadbalancingv2 as elbv2,
    aws_iam as iam,
    aws_logs as logs,
    Stack,
    Duration,
    CfnOutput
)
from constructs import Construct

class NextMemoStack(Stack):
    def __init__(self, scope: Construct, id: str, **kwargs):
        super().__init__(scope, id, **kwargs)

        # AWS Region
        REGION = "ap-northeast-2"

        # Resource Names
        REPOSITORY_NAME = "next-memo"
        CLUSTER_NAME = "next-memos-cluster"
        SERVICE_NAME = "next-memos-service"
        VPC_NAME = "next-memos-vpc"
        SG_NAME = "next-memos-sg"
        TASK_FAMILY = "next-memos-task"
        CONTAINER_NAME = "next-memo"
        ALB_NAME = "next-memos-alb"
        LISTENER_PORT = 80
        CONTAINER_PORT = 3000

        # Create VPC with two public subnets
        vpc = ec2.Vpc(
            self, VPC_NAME,
            cidr="10.0.0.0/16",
            max_azs=2,
            nat_gateways=0,
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name="PublicSubnet",
                    subnet_type=ec2.SubnetType.PUBLIC,
                    cidr_mask=24
                )
            ]
        )

        # Create Security Group
        sg = ec2.SecurityGroup(
            self, SG_NAME,
            vpc=vpc,
            security_group_name=SG_NAME,
            description=f"Security group for {SERVICE_NAME}",
            allow_all_outbound=True
        )
        sg.add_ingress_rule(
            peer=ec2.Peer.any_ipv4(),
            connection=ec2.Port.tcp(CONTAINER_PORT),
            description="Allow inbound traffic on container port"
        )

        # Create ECS Cluster
        cluster = ecs.Cluster(
            self, CLUSTER_NAME,
            cluster_name=CLUSTER_NAME,
            vpc=vpc
        )

        # Create Application Load Balancer
        alb = elbv2.ApplicationLoadBalancer(
            self, ALB_NAME,
            load_balancer_name=ALB_NAME,
            vpc=vpc,
            internet_facing=True,
            security_group=sg
        )

        # Create ALB Listener
        listener = alb.add_listener(
            "ALBListener",
            port=LISTENER_PORT,
            open=True
        )

        # Create ECR Repository
        repository = ecr.Repository(
            self, REPOSITORY_NAME,
            repository_name=REPOSITORY_NAME
        )

        # Create Task Execution Role
        execution_role = iam.Role(
            self, "TaskExecutionRole",
            assumed_by=iam.ServicePrincipal("ecs-tasks.amazonaws.com")
        )
        execution_role.add_managed_policy(
            iam.ManagedPolicy.from_aws_managed_policy_name("service-role/AmazonECSTaskExecutionRolePolicy")
        )

        # Create Task Definition
        task_definition = ecs.FargateTaskDefinition(
            self, TASK_FAMILY,
            family=TASK_FAMILY,
            cpu=256,
            memory_limit_mib=512,
            execution_role=execution_role
        )

        # Use the image from ECR
        container = task_definition.add_container(
            CONTAINER_NAME,
            image=ecs.ContainerImage.from_ecr_repository(repository),
            logging=ecs.LogDriver.aws_logs(stream_prefix=CONTAINER_NAME)
        )
        container.add_port_mappings(
            ecs.PortMapping(container_port=CONTAINER_PORT)
        )

        # Create Fargate Service
        service = ecs.FargateService(
            self, SERVICE_NAME,
            cluster=cluster,
            service_name=SERVICE_NAME,
            task_definition=task_definition,
            desired_count=1,
            assign_public_ip=True,
            security_groups=[sg],
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PUBLIC
            )
        )

        # Attach ECS Service to ALB Listener
        listener.add_targets(
            "ECS",
            port=LISTENER_PORT,
            targets=[service],
            health_check=elbv2.HealthCheck(
                path="/",  # Adjust the health check path if necessary
                interval=Duration.seconds(30),
                timeout=Duration.seconds(5),
                healthy_threshold_count=2,
                unhealthy_threshold_count=5
            )
        )

        # Outputs
        CfnOutput(
            self, "LoadBalancerDNS",
            value=alb.load_balancer_dns_name
        )

        CfnOutput(
            self, "ECRRepositoryURI",
            value=repository.repository_uri,
            description="ECR repository URI"
        )