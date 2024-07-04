
import * as AWS from 'aws-sdk';
const s3 = new AWS.S3();

exports.handler = async (event: any) => {
    console.log('event:', event, 'userId:', event.requestContext.authorizer.userId);
    const userId = event.requestContext.authorizer.lambda.userId;
    const bucketName = 'handterm';

    try {
        const contents = await s3.getObject({
            Bucket: bucketName,
            Key: `user_data/${userId}/*.*`
        }).promise();

        return { statusCode: 200, body: JSON.stringify({ body: contents }) };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify(err) };
    }
};