# Story GET Lambda Function

This Lambda function handles GET requests to retrieve individual stories from DynamoDB.

## Features

- **Story Retrieval**: Fetches a single story record by ID from DynamoDB
- **Query Parameter Validation**: Requires `storyId` query parameter
- **Error Handling**: Comprehensive error handling with appropriate HTTP status codes
- **CORS Support**: Handles cross-origin requests

## API Endpoint

**GET** `/story?storyId={storyId}`

### Query Parameters
- `storyId` (required): The unique identifier of the story to retrieve

### Response

**Success (200):**
```json
{
  "message": "Success",
  "story": {
    "storyId": "123",
    "payload": "Story content...",
    "openaiPrompt": "AI prompt used",
    "openaiResponse": "AI generated response",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "source": "story-service-lambda"
  }
}
```

**Bad Request (400):**
```json
{
  "message": "Bad Request",
  "error": "storyId query parameter is required"
}
```

**Not Found (404):**
```json
{
  "message": "Not Found",
  "error": "Story with ID '123' not found"
}
```

**Internal Server Error (500):**
```json
{
  "message": "Internal Server Error",
  "error": "Failed to fetch story from DynamoDB"
}
```

## Environment Variables

- `DYNAMODB_TABLE`: DynamoDB table name for storing story metadata

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
- **AWS DynamoDB**: Story metadata storage and retrieval

## Error Handling

- **400 Bad Request**: Missing or invalid `storyId` query parameter
- **404 Not Found**: Story with specified ID doesn't exist
- **500 Internal Server Error**: DynamoDB operation failures 