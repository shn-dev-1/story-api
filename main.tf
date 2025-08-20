terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }

  backend "s3" {
    bucket         = "story-service-terraform-state"
    key            = "story-service/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "story-terraform-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = "us-east-1"
}



# Create a ZIP file of the story_post Lambda function code
data "archive_file" "story_post_lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/story-post/dist"
  output_path = "${path.module}/story_post_lambda_function.zip"
}

# Create the story_post Lambda function
resource "aws_lambda_function" "story_post_lambda" {
  filename         = data.archive_file.story_post_lambda_zip.output_path
  function_name    = "story-post-lambda"
  role             = aws_iam_role.story_post_lambda_role.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.story_post_lambda_zip.output_base64sha256
  runtime          = "nodejs18.x"
  timeout          = 30
  memory_size      = 128

  environment {
    variables = {
      NODE_ENV       = "production"
      SQS_QUEUE_URL  = data.aws_sqs_queue.sqs_queue.url
      DYNAMODB_TABLE = data.aws_dynamodb_table.story_metadata.name
      OPENAI_API_KEY = var.openai_api_key
    }
  }
}

# IAM role for the story_post Lambda function
resource "aws_iam_role" "story_post_lambda_role" {
  name = "story-post-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "story_post_lambda_basic" {
  role       = aws_iam_role.story_post_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Create custom policy for SQS and DynamoDB access
resource "aws_iam_role_policy" "story_post_lambda_sqs_dynamodb" {
  name = "story-post-lambda-sqs-dynamodb-policy"
  role = aws_iam_role.story_post_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:SendMessageBatch",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl"
        ]
        Resource = data.aws_sqs_queue.sqs_queue.arn
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:DescribeTable"
        ]
        Resource = [
          data.aws_dynamodb_table.story_metadata.arn,
          "${data.aws_dynamodb_table.story_metadata.arn}/index/*"
        ]
      }
    ]
  })
}

# Get the root resource ID (this is always available)
data "aws_api_gateway_rest_api" "api" {
  name = "story-api"
}

data "aws_sqs_queue" "sqs_queue" {
  name = "story-sqs-queue"
}

data "aws_dynamodb_table" "story_metadata" {
  name = "story-metadata"
}

# Get the root resource
data "aws_api_gateway_resource" "root" {
  rest_api_id = data.aws_api_gateway_rest_api.api.id
  path        = "/"
}

# Create the /story resource for story_post endpoint
resource "aws_api_gateway_resource" "story_post" {
  rest_api_id = data.aws_api_gateway_rest_api.api.id
  parent_id   = data.aws_api_gateway_resource.root.id
  path_part   = "story"
}

# Create the POST method for story_post endpoint
resource "aws_api_gateway_method" "story_post_method" {
  rest_api_id   = data.aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.story_post.id
  http_method   = "POST"
  authorization = "NONE"
}

# Create the Lambda integration for story_post endpoint
resource "aws_api_gateway_integration" "story_post_lambda" {
  rest_api_id = data.aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.story_post.id
  http_method = aws_api_gateway_method.story_post_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.story_post_lambda.invoke_arn
}

# Create the Lambda permission to allow API Gateway to invoke story_post Lambda
resource "aws_lambda_permission" "story_post_api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.story_post_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${data.aws_api_gateway_rest_api.api.execution_arn}/*/*/*"
}

# Create OPTIONS method for CORS on story_post endpoint
resource "aws_api_gateway_method" "story_post_options" {
  rest_api_id   = data.aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.story_post.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Create OPTIONS method integration for story_post endpoint
resource "aws_api_gateway_integration" "story_post_options" {
  rest_api_id = data.aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.story_post.id
  http_method = aws_api_gateway_method.story_post_options.http_method

  type                 = "MOCK"
  request_templates    = { "application/json" = "{\"statusCode\": 200}" }
  passthrough_behavior = "WHEN_NO_MATCH"
  content_handling     = "CONVERT_TO_TEXT"
}

# Create OPTIONS method response for story_post endpoint
resource "aws_api_gateway_method_response" "story_post_options" {
  rest_api_id = data.aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.story_post.id
  http_method = aws_api_gateway_method.story_post_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# Create OPTIONS integration response for story_post endpoint
resource "aws_api_gateway_integration_response" "story_post_options" {
  rest_api_id = data.aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.story_post.id
  http_method = aws_api_gateway_method.story_post_options.http_method
  status_code = aws_api_gateway_method_response.story_post_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Deploy the API Gateway to make story_post endpoint changes live
resource "aws_api_gateway_deployment" "story_post_deployment" {
  depends_on = [
    aws_api_gateway_integration.story_post_lambda,
    aws_api_gateway_integration_response.story_post_options
  ]

  rest_api_id = data.aws_api_gateway_rest_api.api.id

  lifecycle {
    create_before_destroy = true
  }
} 