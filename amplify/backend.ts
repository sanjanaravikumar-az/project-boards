import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";
import { quotegenerator } from "./function/quotegenerator/resource";
import { defineBackend } from "@aws-amplify/backend";
import { Duration } from "aws-cdk-lib";


const backend = defineBackend({
    auth,
    data,
    storage,
    quotegenerator
});
const cfnUserPool = backend.auth.resources.cfnResources.cfnUserPool;
cfnUserPool.usernameAttributes = ["email"];
cfnUserPool.policies = {
    passwordPolicy: {
        minimumLength: 8,
        requireUppercase: false,
        requireLowercase: false,
        requireNumbers: false,
        requireSymbols: false,
        temporaryPasswordValidityDays: 7
    }
};
const cfnIdentityPool = backend.auth.resources.cfnResources.cfnIdentityPool;
const userPool = backend.auth.resources.userPool;
userPool.addClient("NativeAppClient", {
    refreshTokenValidity: Duration.days(30),
    disableOAuth: true,
    enableTokenRevocation: true,
    enablePropagateAdditionalUserContextData: false,
    authSessionValidity: Duration.minutes(3),
    generateSecret: false
});
const s3Bucket = backend.storage.resources.cfnResources.cfnBucket;
// Use this bucket name post refactor
// s3Bucket.bucketName = 'projectboards77b21c06c37841ddbdea3f8bed8abc9c39290-main';
s3Bucket.bucketEncryption = {
    serverSideEncryptionConfiguration: [
        {
            serverSideEncryptionByDefault: {
                sseAlgorithm: "AES256"
            },
            bucketKeyEnabled: false
        }
    ]
};
const cfnGraphqlApi = backend.data.resources.cfnResources.cfnGraphqlApi;
cfnGraphqlApi.additionalAuthenticationProviders = [
    {
        authenticationType: "AMAZON_COGNITO_USER_POOLS",
        userPoolConfig: {
            awsRegion: "us-east-1",
            userPoolId: backend.auth.resources.userPool.userPoolId
        }
    }
];
const branchName = process.env.AWS_BRANCH ?? "sandbox";
backend.quotegenerator.resources.cfnResources.cfnFunction.functionName = `quotegenerator-${branchName}`;
