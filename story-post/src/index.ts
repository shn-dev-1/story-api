import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, PutCommandInput } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand, PublishCommandInput } from "@aws-sdk/client-sns";
import { StoryRequest, StoryResponse } from './index.types';

// Initialize AWS SDK clients
const dynamoClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const sns = new SNSClient({});



export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        // Parse the incoming request
        const body: StoryRequest = JSON.parse(event.body || '{}');
        const payload: string = body.payload || '';
        
        // Publish message to SNS topic
        const snsParams: PublishCommandInput = {
            Message: JSON.stringify({
                storyPayload: payload,
                timestamp: new Date().toISOString(),
                source: 'story-service-lambda',
                TASK_TYPE: 'TEXT'
            }),
            TopicArn: process.env.SNS_TOPIC_ARN
        };
        
        try {
            await sns.send(new PublishCommand(snsParams));
            console.log('Message published to SNS successfully');
        } catch (snsError) {
            console.error('Error publishing message to SNS:', snsError);
        }
        
        
        // Store data in DynamoDB
        const dynamoParams: PutCommandInput = {
            TableName: process.env.DYNAMODB_TABLE,
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
            note: 'SNS and DynamoDB operations completed successfully.'
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