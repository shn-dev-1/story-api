# Story POST Lambda Function

This Lambda function handles POST requests to the `/story` endpoint, providing story generation capabilities with OpenAI integration.

## Features

- **Story Processing**: Accepts string payloads for story content
- **OpenAI Integration**: Optional GPT model prompting for enhanced story generation
- **SQS Integration**: Sends processed stories to SQS queue for further processing
- **DynamoDB Storage**: Stores story metadata and responses
- **CORS Support**: Handles cross-origin requests

## API Endpoint

**POST** `/story`

### Request Body
```json
{
  "payload": "your string payload here",
  "openaiPrompt": "Optional: Your prompt for GPT-5",
  "model": "Optional: OpenAI model (defaults to gpt-4o)"
}
```

### Response
```json
{
  "message": "Success",
  "receivedPayload": "your string payload here",
  "openaiResponse": "AI-generated response if prompt provided",
  "note": "SQS, DynamoDB, and OpenAI operations completed successfully."
}
```

## Environment Variables

- `NODE_ENV`: Environment (production/development)
- `SQS_QUEUE_URL`: URL of the SQS queue for message processing
- `DYNAMODB_TABLE`: DynamoDB table name for storing story metadata
- `OPENAI_API_KEY`: OpenAI API key for AI integration

## Development

### Prerequisites
- Node.js 18.x or higher
- npm or yarn

### Setup
```bash
# Install dependencies
npm ci

# Build TypeScript
npm run build

# Package for Lambda deployment
npm run package:lambda
```

### Scripts
- `npm run build`: Compile TypeScript to JavaScript
- `npm run build:watch`: Watch mode for development
- `npm run clean`: Clean build artifacts
- `npm run package:lambda`: Create Lambda deployment package

## Architecture

This Lambda function integrates with:
- **AWS API Gateway**: REST API endpoint handling
- **AWS SQS**: Message queuing for story processing
- **AWS DynamoDB**: Story metadata storage
- **OpenAI API**: AI-powered story enhancement

## Error Handling

- **400 Bad Request**: Invalid JSON or missing required fields
- **500 Internal Server Error**: Lambda execution errors
- **Graceful Degradation**: Continues operation even if OpenAI or other services fail 