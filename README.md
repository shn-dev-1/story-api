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
- Access to the remote Terraform state:
  - S3 Bucket: `story-service-terraform-state`
  - DynamoDB Table: `story-terraform-lock`
  - AWS Region: `us-east-1`

## Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd story-service
   ```

2. **Install dependencies** (if any):
   ```bash
   npm install
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
  "payload": "your string payload here"
}
```

### Response Format

**Success (200)**:
```json
{
  "message": "Success",
  "receivedPayload": "your string payload here"
}
```

**Error (500)**:
```json
{
  "message": "Internal server error",
  "error": "error details"
}
```

## Development

### Local Testing

You can test the Lambda function locally by creating a test event:

```json
{
  "body": "{\"payload\": \"test string\"}"
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