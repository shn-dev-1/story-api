import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, PutCommandInput } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand, PublishCommandInput } from "@aws-sdk/client-sns";
import { randomBytes } from 'crypto';
import { StoryMetaDataStatus, StoryRequest, StoryResponse } from './index.types';

// Initialize AWS SDK clients
const dynamoClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const sns = new SNSClient({});


export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        // Parse the incoming request
        const body: StoryRequest = JSON.parse(event.body || '{}');
        const prompt: string = body.prompt || '';

        // Validate that prompt is not null or empty
        if (!prompt || prompt.trim() === '') {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    message: 'Bad Request',
                    error: 'prompt field is required and cannot be empty'
                })
            };
        }

        // Store data in DynamoDB
        const dateCreated = new Date().toISOString();
        const id = randomBytes(8).toString('hex');
        const dynamoParams: PutCommandInput = {
            TableName: process.env.DYNAMODB_TABLE,
            Item: {
                id,
                created_by: 'hard-coded', //TODO: Get from event requestContext
                prompt: prompt,
                date_created: dateCreated,
                date_updated: dateCreated,
                status: StoryMetaDataStatus.PENDING
            }
        };
        
        try {
            await dynamodb.send(new PutCommand(dynamoParams));
            console.log('Data stored in DynamoDB successfully');
        } catch (dynamoError) {
            console.error('Error storing data in DynamoDB:', dynamoError);
        }
        
        // Publish message to SNS topic
        const snsParams: PublishCommandInput = {
            Message: JSON.stringify({
                id,
                story_prompt: prompt,
                timestamp: dateCreated,
                source: 'story-service-lambda'
            }),
            TopicArn: process.env.SNS_TOPIC_ARN,
            MessageAttributes: {
                TASK_TYPE: {
                    DataType: 'String',
                    StringValue: 'TEXT'
                }
            }
        };
        
        try {
            await sns.send(new PublishCommand(snsParams));
            console.log('Message published to SNS successfully');
        } catch (snsError) {
            console.error('Error publishing message to SNS:', snsError);
        }
        
        const response: StoryResponse = {
            message: 'Success',
            receivedPrompt: prompt,
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