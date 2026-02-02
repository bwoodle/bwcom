terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"
  name    = "bwcom-next-${var.env}-vpc"
  cidr    = "10.0.0.0/16"
  azs     = ["${var.region}a", "${var.region}b"]
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets = ["10.0.3.0/24", "10.0.4.0/24"]
  enable_nat_gateway = true
}

resource "aws_security_group" "alb" {
  name   = "bwcom-next-${var.env}-alb-sg"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "ecs" {
  name   = "bwcom-next-${var.env}-ecs-sg"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

/* ECR repositories are created outside Terraform via AWS CLI and passed in via variable */

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "bwcom-next-${var.env}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnets
}

# Target Group
resource "aws_lb_target_group" "next" {
  name        = "bwcom-next-${var.env}-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"

  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 3
    interval            = 30
    path                = "/api/health"
    matcher             = "200"
  }
}

# HTTPS Listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.next.arn
  }
}

# HTTP Listener (redirect to HTTPS)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# Optional listener rules to redirect www.<domain> -> apex
resource "aws_lb_listener_rule" "redirect_www_http" {
  count        = var.create_www_redirect ? 1 : 0
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  condition {
    host_header {
      values = ["www.${var.domain}"]
    }
  }

  action {
    type = "redirect"

    redirect {
      protocol    = "HTTPS"
      host        = var.domain
      path        = "/#{path}"
      query       = "#{query}"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener_rule" "redirect_www_https" {
  count        = var.create_www_redirect ? 1 : 0
  listener_arn = aws_lb_listener.https.arn
  priority     = 101

  condition {
    host_header {
      values = ["www.${var.domain}"]
    }
  }

  action {
    type = "redirect"

    redirect {
      protocol    = "HTTPS"
      host        = var.domain
      path        = "/#{path}"
      query       = "#{query}"
      status_code = "HTTP_301"
    }
  }
}

module "ecs" {
  source  = "terraform-aws-modules/ecs/aws"
  version = "~> 5.0"
  cluster_name = "bwcom-next-${var.env}-cluster"
}

resource "aws_cloudwatch_log_group" "next" {
  name = "/ecs/bwcom-next-${var.env}"
}

resource "aws_iam_role" "ecs_execution" {
  name = "bwcom-next-${var.env}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_ecs_task_definition" "next" {
  family                   = "bwcom-next-${var.env}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  runtime_platform {
    cpu_architecture        = "ARM64"
    operating_system_family = "LINUX"
  }
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  container_definitions = jsonencode([{
    name  = "next-app"
    image = "${var.ecr_repository_url}:${var.image_tag}"
    portMappings = [{
      containerPort = 3000
      hostPort      = 3000
    }]
    environment = [
      {
        name  = "NEXTAUTH_SECRET"
        value = var.nextauth_secret
      },
      {
        name  = "NEXTAUTH_URL"
        value = var.nextauth_url
      },
      {
        name  = "GOOGLE_CLIENT_ID"
        value = var.google_client_id
      },
      {
        name  = "GOOGLE_CLIENT_SECRET"
        value = var.google_client_secret
      }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.next.name
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])
}

resource "aws_ecs_service" "next" {
  name            = "bwcom-next-${var.env}-service"
  cluster         = module.ecs.cluster_id
  task_definition = aws_ecs_task_definition.next.arn
  desired_count   = 1
  launch_type     = "FARGATE"
  network_configuration {
    subnets         = module.vpc.private_subnets
    security_groups = [aws_security_group.ecs.id]
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.next.arn
    container_name   = "next-app"
    container_port   = 3000
  }
}

data "aws_route53_zone" "selected" {
  name = "brentwoodle.com"
}

resource "aws_route53_record" "next" {
  zone_id = data.aws_route53_zone.selected.zone_id
  name    = var.domain
  type    = "A"
  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# Optional www record pointing to the same ALB (created only when requested)
resource "aws_route53_record" "www" {
  count   = var.create_www_redirect ? 1 : 0
  zone_id = data.aws_route53_zone.selected.zone_id
  name    = "www.${var.domain}"
  type    = "A"
  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}