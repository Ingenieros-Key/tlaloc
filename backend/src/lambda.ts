import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { configure as serverlessExpress } from '@codegenie/serverless-express';
import express from 'express';
import { Handler } from 'aws-lambda';
import { AppModule } from './app.module.js';

let cached: Handler;

async function bootstrap(): Promise<Handler> {
  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
  app.enableCors();
  await app.init();
  return serverlessExpress({ app: expressApp });
}

/** Cached serverless-express handler wrapping the Nest AppModule for Lambda. */
export const handler: Handler = async (event, context, callback) => {
  cached = cached ?? (await bootstrap());
  return cached(event, context, callback);
};
