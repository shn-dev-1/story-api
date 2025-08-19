import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, PutCommandInput } from "@aws-sdk/lib-dynamodb";
import { SQSClient, SendMessageCommand, SendMessageCommandInput } from "@aws-sdk/client-sqs";

// Initialize AWS SDK clients
const dynamoClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const sqs = new SQSClient({});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        // Parse the incoming request
        const body: StoryRequest = JSON.parse(event.body || '{}');
        const payload: string = body.payload || '';
        
        // Send message to SQS queue
        const sqsParams: SendMessageCommandInput = {
            MessageBody: JSON.stringify({
                storyPayload: payload,
                timestamp: new Date().toISOString(),
                source: 'story-service-lambda'
            }),
            QueueUrl: process.env.SQS_QUEUE_URL || 'https://sqs.us-east-1.amazonaws.com/910670998600/story-sqs-queue'
        };
        
        try {
            await sqs.send(new SendMessageCommand(sqsParams));
            console.log('Message sent to SQS successfully');
        } catch (sqsError) {
            console.error('Error sending message to SQS:', sqsError);
        }
        
        // Store data in DynamoDB
        const dynamoParams: PutCommandInput = {
            TableName: process.env.DYNAMODB_TABLE || 'story-metadata',
            Item: {
                id: `story-${Date.now()}`,
                payload: payload,
                timestamp: new Date().toISOString(),
                status: 'created'
            }
        };
        
        try {
            await dynamodb.send(new PutCommand(dynamoParams));
            console.log('Data stored in DynamoDB successfully');
        } catch (dynamoError) {
            console.error('Error storing data in DynamoDB:', dynamoError);
        }
        
        const response: StoryResponse = {
            message: 'Success',
            receivedPayload: payload,
            note: 'SQS and DynamoDB operations completed successfully.'
        };
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: JSON.stringify(response)
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            })
        };
    }
}; 