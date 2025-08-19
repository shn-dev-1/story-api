// AWS SDK is available by default in Lambda runtime
const AWS = require('aws-sdk');

// Initialize AWS SDK clients
const sqs = new AWS.SQS();
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        // Parse the incoming request
        const body = JSON.parse(event.body || '{}');
        const payload = body.payload || '';
        
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
            await dynamodb.put(dynamoParams).promise();
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