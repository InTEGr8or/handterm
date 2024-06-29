// cdk/lib/cdk-stack.ts

import {
  aws_cognito as cognito,
  aws_s3 as s3,
  aws_lambda as lambda,
  aws_iam as iam,
  aws_apigateway as apigateway,
} from "aws-cdk-lib";
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';

const lambdaRuntime = lambda.Runtime.NODEJS_16_X;

export class HandTermCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, 'HandTermUserPool', {
      userPoolName: 'HandTermUserPool',
      selfSignUpEnabled: true,
      userVerification: {
        emailSubject: 'Verify your email for our app!',
        emailBody: 'Hello {username}, Thanks for signing up to our app! Your verification code is {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      signInAliases: {
        email: true
      },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      autoVerify: { email: true }
    });

    // Assuming lambdaAtEdge is your authentication Lambda function
    const api = new apigateway.RestApi(this, 'HandTermApi', {
      restApiName: 'HandTerm Service',
      description: 'This service serves authentication requests.',
      // Add default CORS options here
      defaultCorsPreflightOptions: {
        allowOrigins: ['https://handterm.com', 'http://localhost:3000'], // Include both your production and local origins
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Requested-With'],
      }
    });

    // Assuming `api` is your RestApi object and `userPool` is your Cognito User Pool
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
      identitySource: 'method.request.header.Authorization',
      authorizerName: 'CognitoAuthorizer'
    });

    // Cognito User Pool Client
    const userPoolClient = userPool.addClient('AppClient', {
      authFlows: {
        userSrp: true,
      },
      generateSecret: false,
      // Add your API Gateway endpoint URL to the list of callback URLs
    });

    // Cognito Identity Pool
    const identityPool = new cognito.CfnIdentityPool(this, 'HandTermIdentityPool', {
      identityPoolName: 'HandTermIdentityPool',
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [{
        clientId: userPoolClient.userPoolClientId,
        providerName: userPool.userPoolProviderName,
      }],
    });

    // S3 Bucket for User Logs
    const logsBucket = new s3.Bucket(this, 'HandTermHistoryBucket', {
      bucketName: 'handterm-history',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // Lambda Execution Role
    const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('lambda.amazonaws.com'),
        new iam.ServicePrincipal('edgelambda.amazonaws.com')
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
      ],
    });

    const tokenLambdaRole = new iam.Role(this, 'TokenHandlerLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'), // Basic Lambda execution role
        // Add additional policies as needed
      ],
    });

    const tokenHandlerLambda = new lambda.Function(this, 'TokenHandlerFunction', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'tokenHandler.handler',
      role: tokenLambdaRole,
      code: lambda.Code.fromAsset('lambda/tokenHandler'),
      environment: {
        COGNITO_APP_CLIENT_ID: userPoolClient.userPoolClientId,
      }
    });

    const tokenHandlerIntegration = new apigateway.LambdaIntegration(tokenHandlerLambda);
    const authCallbackResource = api.root.addResource('auth');

    // Use the authorizer for your endpoint
    authCallbackResource.addMethod('GET', tokenHandlerIntegration, {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });


    const signUpLambda = new lambda.Function(this, 'SignUpFunction', {
      runtime: lambdaRuntime,
      handler: 'signUp.handler',
      role: lambdaExecutionRole,
      code: lambda.Code.fromAsset('lambda/authentication'),
      environment: {
        COGNITO_APP_CLIENT_ID: userPoolClient.userPoolClientId,
      }
    });


    const signUpIntegration = new apigateway.LambdaIntegration(signUpLambda);
    const signUpResource = api.root.addResource('signup');
    signUpResource.addMethod('POST', signUpIntegration);

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'IdentityPoolId', { value: identityPool.ref });
    new cdk.CfnOutput(this, 'BucketName', { value: logsBucket.bucketName });
    new cdk.CfnOutput(this, 'ApiEndpoint', { value: api.url });
  }
}

const app = new cdk.App();
new HandTermCdkStack(app, 'HandTermCdkStack');