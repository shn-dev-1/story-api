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
  value       = "${data.terraform_remote_state.api_gateway.outputs.api_gateway_url}/story"
}

output "lambda_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_role.arn
} 