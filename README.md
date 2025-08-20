# Story Service Lambda

This repository contains a Node.js Lambda function that handles POST requests to the `/story` endpoint, integrated with an existing API Gateway.

## Architecture

- **Lambda Function**: Node.js 18.x function that processes POST requests
- **API Gateway**: Integrates with existing API Gateway to create `/story` endpoint
- **Terraform**: Infrastructure as Code for AWS resources
- **Remote State**: Uses S3 backend with DynamoDB locking

## Prerequisites

- AWS CLI configured with appropriate permissions
- Terraform >= 1.0
- Node.js >= 18.0.0
- OpenAI API key (for AI integration)
- Access to the remote Terraform state:
  - S3 Bucket: `story-service-terraform-state`
  - DynamoDB Table: `story-terraform-lock`
  - AWS Region: `us-east-1`

## Repository Structure

```
story-service/
├── .github/workflows/          # GitHub Actions CI/CD workflows
├── story-post/                 # Story POST Lambda function
│   ├── src/                    # TypeScript source code
│   ├── dist/                   # Compiled JavaScript (generated)
│   ├── package.json            # Lambda function dependencies
│   ├── tsconfig.json           # TypeScript configuration
│   └── README.md               # Lambda function documentation
├── main.tf                     # Terraform infrastructure configuration (story_post specific)
├── variables.tf                # Terraform input variables
├── outputs.tf                  # Terraform outputs (story_post specific)
├── package.json                # Root repository configuration
└── README.md                   # This file
```

## Required GitHub Secrets

Make sure you have these secrets configured in your repository:
- `AWS_ACCESS_KEY_ID`: AWS access key for infrastructure deployment
- `AWS_SECRET_ACCESS_KEY`: AWS secret key for infrastructure deployment  
- `OPENAI_API_KEY`: OpenAI API key for GPT-5 integration (automatically passed to Lambda)

## Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd story-service
   ```

2. **Install dependencies**:
   ```bash
   # Install root dependencies
   npm install
   
   # Install Lambda function dependencies
   cd story-post && npm install && cd ..
   ```

3. **Initialize Terraform**:
   ```bash
   terraform init
   ```

4. **Plan the deployment**:
   ```bash
   terraform plan
   ```

5. **Apply the configuration**:
   ```bash
   terraform apply
   ```

## API Endpoint

After deployment, the `/story` endpoint will be available at:
```
https://<api-gateway-id>.execute-api.us-east-1.amazonaws.com/<stage>/story
```

### Request Format

**POST** `/story`

```json
{
  "payload": "your string payload here",
  "openaiPrompt": "Optional: Your prompt for GPT-5",
  "model": "Optional: OpenAI model (defaults to gpt-4o)"
}
```

#### Examples

**Basic request (no AI):**
```json
{
  "payload": "Hello world"
}
```

**With OpenAI integration:**
```json
{
  "payload": "Story about a robot",
  "openaiPrompt": "Write a short story about a robot learning to paint",
  "model": "gpt-4o"
}
```

### Response Format

**Success (200)**:
```json
{
  "message": "Success",
  "receivedPayload": "your string payload here",
  "openaiResponse": "AI-generated response (if prompt provided)",
  "note": "Operation summary"
}
```

**Error (500)**:
```json
{
  "message": "Internal server error",
  "error": "error details"
}
```

## Environment Variables

The Lambda function uses these environment variables:
- `NODE_ENV`: Environment (production)
- `SQS_QUEUE_URL`: SQS queue URL for message processing
- `DYNAMODB_TABLE`: DynamoDB table name for data storage
- `OPENAI_API_KEY`: OpenAI API key for GPT-5 integration

## Development

### Local Testing

You can test the Lambda function locally by creating a test event:

**Basic test:**
```json
{
  "body": "{\"payload\": \"test string\"}"
}
```

**With OpenAI integration:**
```json
{
  "body": "{\"payload\": \"test string\", \"openaiPrompt\": \"Write a haiku about coding\", \"model\": \"gpt-4o\"}"
}
```

### Updating the Function

1. Modify the code in `src/index.js`
2. Run `npm run package` to create a new ZIP file
3. Run `terraform apply` to deploy the updated function

## Terraform Resources

This configuration creates:

- Lambda function with execution role
- API Gateway resource `/story`
- POST method with Lambda integration
- OPTIONS method for CORS support
- IAM permissions for API Gateway to invoke Lambda

## Remote State Configuration

The Terraform configuration uses a remote S3 backend:

```hcl
backend "s3" {
  bucket         = "story-service-terraform-state"
  key            = "story-service/terraform.tfstate"
  region         = "us-east-1"
  dynamodb_table = "story-terraform-lock"
  encrypt        = true
}
```

## Cleanup

To destroy all resources:

```bash
terraform destroy
```

**Note**: This will remove the Lambda function and API Gateway resources, but will not affect the existing API Gateway infrastructure.

## Security

- Lambda function uses minimal IAM permissions
- CORS is configured for cross-origin requests
- API Gateway authorization is set to NONE (modify as needed for production)

## Monitoring

- CloudWatch logs are automatically enabled for the Lambda function
- API Gateway provides request/response logging
- Consider setting up CloudWatch alarms for error rates and latency 