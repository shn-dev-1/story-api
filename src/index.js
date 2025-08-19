const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

// Initialize AWS SDK clients
const dynamoClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const sqs = new SQSClient({});

exports.handler = async (event) => {
    try {
        // Parse the incoming request
        const body = JSON.parse(event.body || '{}');
        const payload = body.payload || '';
        
        // Send message to SQS queue
        const sqsParams = {
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
        const dynamoParams = {
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
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: JSON.stringify({
                message: 'Success',
                receivedPayload: payload,
                note: 'SQS and DynamoDB permissions are configured. Uncomment example code to use them.'
            })
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
                error: error.message
            })
        };
    }
}; 