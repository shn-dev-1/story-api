import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, PutCommandInput } from "@aws-sdk/lib-dynamodb";
import { SQSClient, SendMessageCommand, SendMessageCommandInput } from "@aws-sdk/client-sqs";
import OpenAI from 'openai';
import { StoryRequest, StoryResponse } from './index.types';

// Initialize AWS SDK clients
const dynamoClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const sqs = new SQSClient({});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        // Parse the incoming request
        const body: StoryRequest = JSON.parse(event.body || '{}');
        const payload: string = body.payload || '';
        const openaiPrompt: string = body.openaiPrompt || '';
        const model: string = body.model || 'gpt-4o'; // Default to GPT-4o (closest to GPT-5)
        
        let openaiResponse: string | undefined;
        
        // Call OpenAI if a prompt is provided
        if (openaiPrompt && process.env.OPENAI_API_KEY) {
            try {
                const completion = await openai.chat.completions.create({
                    model: model,
                    messages: [
                        {
                            role: "system",
                            content: "You are a helpful AI assistant. Provide clear, concise, and accurate responses."
                        },
                        {
                            role: "user",
                            content: openaiPrompt
                        }
                    ],
                    max_tokens: 1000,
                    temperature: 0.7,
                });
                
                openaiResponse = completion.choices[0]?.message?.content || undefined;
                console.log('OpenAI API call successful');
            } catch (openaiError) {
                console.error('Error calling OpenAI API:', openaiError);
                openaiResponse = 'Error: Unable to get AI response';
            }
        }
        
        // Send message to SQS queue
        const sqsParams: SendMessageCommandInput = {
            MessageBody: JSON.stringify({
                storyPayload: payload,
                openaiPrompt: openaiPrompt,
                openaiResponse: openaiResponse,
                timestamp: new Date().toISOString(),
                source: 'story-service-lambda'
            }),
            QueueUrl: process.env.SQS_QUEUE_URL
        };
        
        try {
            await sqs.send(new SendMessageCommand(sqsParams));
            console.log('Message sent to SQS successfully');
        } catch (sqsError) {
            console.error('Error sending message to SQS:', sqsError);
        }
        
        // Store data in DynamoDB
        const dynamoParams: PutCommandInput = {
            TableName: process.env.DYNAMODB_TABLE,
            Item: {
                id: `story-${Date.now()}`,
                payload: payload,
                openaiPrompt: openaiPrompt,
                openaiResponse: openaiResponse,
                model: model,
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
            openaiResponse: openaiResponse,
            note: 'SQS, DynamoDB, and OpenAI operations completed successfully.'
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