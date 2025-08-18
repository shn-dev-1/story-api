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

# Data source to get the existing API Gateway
data "terraform_remote_state" "api_gateway" {
  backend = "s3"
  config = {
    bucket         = "story-service-terraform-state"
    key            = "api-gateway/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "story-terraform-lock"
  }
}

# Create a ZIP file of the Lambda function code
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/lambda_function.zip"
}

# Create the Lambda function
resource "aws_lambda_function" "story_lambda" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "story-service-lambda"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "nodejs18.x"
  timeout          = 30
  memory_size      = 128

  environment {
    variables = {
      NODE_ENV = "production"
    }
  }
}

# IAM role for the Lambda function
resource "aws_iam_role" "lambda_role" {
  name = "story-service-lambda-role"

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
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Create the /story resource
resource "aws_api_gateway_resource" "story" {
  rest_api_id = data.terraform_remote_state.api_gateway.outputs.api_gateway_id
  parent_id   = data.terraform_remote_state.api_gateway.outputs.api_gateway_root_resource_id
  path_part   = "story"
}

# Create the POST method
resource "aws_api_gateway_method" "story_post" {
  rest_api_id   = data.terraform_remote_state.api_gateway.outputs.api_gateway_id
  resource_id   = aws_api_gateway_resource.story.id
  http_method   = "POST"
  authorization = "NONE"
}

# Create the Lambda integration
resource "aws_api_gateway_integration" "story_lambda" {
  rest_api_id = data.terraform_remote_state.api_gateway.outputs.api_gateway_id
  resource_id = aws_api_gateway_resource.story.id
  http_method = aws_api_gateway_method.story_post.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.story_lambda.invoke_arn
}

# Create the Lambda permission to allow API Gateway to invoke it
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.story_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${data.terraform_remote_state.api_gateway.outputs.api_gateway_execution_arn}/*/*/*"
}

# Create OPTIONS method for CORS
resource "aws_api_gateway_method" "story_options" {
  rest_api_id   = data.terraform_remote_state.api_gateway.outputs.api_gateway_id
  resource_id   = aws_api_gateway_resource.story.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Create OPTIONS method integration
resource "aws_api_gateway_integration" "story_options" {
  rest_api_id = data.terraform_remote_state.api_gateway.outputs.api_gateway_id
  resource_id = aws_api_gateway_resource.story.id
  http_method = aws_api_gateway_method.story_options.http_method

  type                 = "MOCK"
  request_templates    = { "application/json" = "{\"statusCode\": 200}" }
  passthrough_behavior = "WHEN_NO_MATCH"
  content_handling     = "CONVERT_TO_TEXT"
}

# Create OPTIONS method response
resource "aws_api_gateway_method_response" "story_options" {
  rest_api_id = data.terraform_remote_state.api_gateway.outputs.api_gateway_id
  resource_id = aws_api_gateway_resource.story.id
  http_method = aws_api_gateway_method.story_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# Create OPTIONS integration response
resource "aws_api_gateway_integration_response" "story_options" {
  rest_api_id = data.terraform_remote_state.api_gateway.outputs.api_gateway_id
  resource_id = aws_api_gateway_resource.story.id
  http_method = aws_api_gateway_method.story_options.http_method
  status_code = aws_api_gateway_method_response.story_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
} 