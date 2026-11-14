import { Stack, Duration, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  aws_lambda as lambda,
  aws_lambda_nodejs as nodejs,
  aws_apigateway as apigw,
  aws_logs as logs,
  aws_certificatemanager as acm,
} from "aws-cdk-lib";
import * as path from "path";
import { ServicesStackProps } from "@stack-types/services.types";
import { servicesConfig } from "@config/services.config";
import { buildName } from "@utils/name-builder";

const handlerDir = path.join(__dirname, "../../../backend/src");

// ponytail: Nest's optional transports (`@nestjs/websockets`, `@nestjs/microservices`) are
// behind try/catch dynamic imports that this app never installs or uses — esbuild still
// walks them at bundle time, so they must be declared external or the bundle fails to resolve.
const nestOptionalExternals = [
  "@nestjs/websockets/socket-module",
  "@nestjs/microservices/microservices-module",
  "@nestjs/websockets",
  "@nestjs/microservices",
  "@nestjs/platform-socket.io",
  "cache-manager",
  "class-transformer/storage",
];

/** Stateless stack: Nest API Lambda behind API Gateway, Cognito authorizer/triggers, API-key tier. */
export class ServicesStack extends Stack {
  constructor(scope: Construct, id: string, props: ServicesStackProps) {
    super(scope, id, props);

    const logRetention = servicesConfig.logRetentionDays as logs.RetentionDays;

    const apiFn = new nodejs.NodejsFunction(this, "ApiFn", {
      functionName: buildName("api"),
      entry: path.join(handlerDir, "lambda.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: servicesConfig.lambdaMemoryMb,
      timeout: Duration.seconds(servicesConfig.lambdaTimeoutSec),
      tracing: lambda.Tracing.ACTIVE,
      logRetention,
      bundling: { minify: true, sourceMap: true, externalModules: nestOptionalExternals },
      environment: {
        PROFILES_TABLE: props.profilesTable.tableName,
        MEDIA_BUCKET: props.mediaBucket.bucketName,
        USER_POOL_ID: props.userPool.userPoolId,
        USER_POOL_CLIENT_ID: props.userPoolClient.userPoolClientId,
        REGION: this.region,
      },
    });

    props.profilesTable.grantReadWriteData(apiFn);
    props.mediaBucket.grantReadWrite(apiFn);

    const api = new apigw.RestApi(this, "RestApi", {
      restApiName: buildName("api"),
      deployOptions: { tracingEnabled: true, stageName: props.baseConfig.env },
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: ["Authorization", "Content-Type", "x-api-key", "x-idempotency-key"],
      },
    });

    const authorizer = new apigw.CognitoUserPoolsAuthorizer(this, "JwtAuthorizer", {
      cognitoUserPools: [props.userPool],
    });

    const integration = new apigw.LambdaIntegration(apiFn);

    // Public health check — no auth.
    api.root.addResource("health").addMethod("GET", integration);

    // Everything else proxies to Nest, guarded by the Cognito JWT authorizer.
    const proxy = api.root.addResource("{proxy+}");
    proxy.addMethod("ANY", integration, {
      authorizer,
      authorizationType: apigw.AuthorizationType.COGNITO,
    });

    // ponytail: API-key service tier wired but unused until a machine route exists.
    const key = api.addApiKey("ServiceKey", { apiKeyName: buildName("service-key") });
    const plan = api.addUsagePlan("ServicePlan", {
      name: buildName("service-plan"),
      throttle: { rateLimit: 10, burstLimit: 20 },
    });
    plan.addApiKey(key);
    plan.addApiStage({ stage: api.deploymentStage });

    if (servicesConfig.apiCertArn) {
      const cert = acm.Certificate.fromCertificateArn(this, "ApiCert", servicesConfig.apiCertArn);
      const domain = api.addDomainName("CustomDomain", {
        domainName: servicesConfig.apiDomainName,
        certificate: cert,
        endpointType: apigw.EndpointType.REGIONAL,
      });
      new CfnOutput(this, "CustomDomainTarget", { value: domain.domainNameAliasDomainName });
    }

    new CfnOutput(this, "ApiUrl", { value: api.url });
  }
}
