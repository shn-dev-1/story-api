output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.story_lambda.function_name
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.story_lambda.arn
}

output "lambda_function_invoke_arn" {
  description = "Invocation ARN of the Lambda function"
  value       = aws_lambda_function.story_lambda.invoke_arn
}

output "api_gateway_story_url" {
  description = "URL of the /story endpoint"
  value       = "https://${data.aws_api_gateway_rest_api.api.id}.execute-api.${var.aws_region}.amazonaws.com/prod/story"
}

output "api_gateway_deployment_id" {
  description = "ID of the API Gateway deployment"
  value       = aws_api_gateway_deployment.story_deployment.id
}

output "lambda_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_role.arn
} 