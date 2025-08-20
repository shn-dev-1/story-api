output "story_post_lambda_function_name" {
  description = "Name of the story_post Lambda function"
  value       = aws_lambda_function.story_post_lambda.function_name
}

output "story_post_lambda_function_arn" {
  description = "ARN of the story_post Lambda function"
  value       = aws_lambda_function.story_post_lambda.arn
}

output "story_post_lambda_function_invoke_arn" {
  description = "Invocation ARN of the story_post Lambda function"
  value       = aws_lambda_function.story_post_lambda.invoke_arn
}

output "api_gateway_story_post_url" {
  description = "URL of the /story endpoint for story_post Lambda"
  value       = "https://${data.aws_api_gateway_rest_api.api.id}.execute-api.${var.aws_region}.amazonaws.com/prod/story"
}



output "story_post_lambda_role_arn" {
  description = "ARN of the story_post Lambda execution role"
  value       = aws_iam_role.story_post_lambda_role.arn
} 