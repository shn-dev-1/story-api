import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Note: storyId is extracted from query parameters

// Interface for the response
interface StoryGetResponse {
  message: string;
  story?: any;
  error?: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Event received:', JSON.stringify(event, null, 2));

    // Get the story ID from query parameters
    const storyId = event.queryStringParameters?.id;
    
    if (!storyId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET,OPTIONS'
        },
        body: JSON.stringify({
          message: 'Bad Request',
          error: 'storyId query parameter is required'
        } as StoryGetResponse)
      };
    }

    // Fetch the story from DynamoDB
    const getParams = {
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        id: storyId
      }
    };

    console.log('DynamoDB get params:', JSON.stringify(getParams, null, 2));

    const result = await docClient.send(new GetCommand(getParams));

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET,OPTIONS'
        },
        body: JSON.stringify({
          message: 'Not Found',
          error: `Story with ID '${storyId}' not found`
        } as StoryGetResponse)
      };
    }

    console.log('Story retrieved successfully:', JSON.stringify(result.Item, null, 2));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify({
        message: 'Success',
        story: result.Item
      } as StoryGetResponse)
    };

  } catch (error) {
    console.error('Error fetching story:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify({
        message: 'Internal Server Error',
        error: 'Failed to fetch story from DynamoDB'
      } as StoryGetResponse)
    };
  }
}; 