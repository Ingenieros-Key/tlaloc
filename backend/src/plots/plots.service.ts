import { randomUUID } from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DeleteCommand, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDoc } from '../common/aws/dynamo.client.js';
import * as EnvConfigNs from '../config/env.config.js';
import { Plot } from './types.js';
import { SavePlotDto } from './dto/save-plot.dto.js';

export const ENV_CONFIG = 'ENV_CONFIG';

@Injectable()
export class PlotsService {
  constructor(@Inject(ENV_CONFIG) private readonly env: EnvConfigNs.EnvConfig) {}

  async list(userId: string): Promise<readonly Plot[]> {
    const res = await dynamoDoc.send(
      new QueryCommand({
        TableName: this.env.plotsTable,
        KeyConditionExpression: 'userId = :u',
        ExpressionAttributeValues: { ':u': userId },
      }),
    );
    return (res.Items ?? []) as Plot[];
  }

  async create(userId: string, dto: SavePlotDto): Promise<Plot> {
    const plot: Plot = {
      userId,
      plotId: randomUUID(),
      name: dto.name,
      geometry: dto.geometry,
      planting: dto.planting,
      priority: dto.priority,
      updatedAt: new Date().toISOString(),
    };
    await dynamoDoc.send(new PutCommand({ TableName: this.env.plotsTable, Item: plot }));
    return plot;
  }

  async update(userId: string, plotId: string, dto: SavePlotDto): Promise<Plot> {
    const existing = await dynamoDoc.send(
      new GetCommand({ TableName: this.env.plotsTable, Key: { userId, plotId } }),
    );
    if (!existing.Item) throw new NotFoundException('Plot not found');
    const plot: Plot = {
      userId,
      plotId,
      name: dto.name,
      geometry: dto.geometry,
      planting: dto.planting,
      priority: dto.priority,
      updatedAt: new Date().toISOString(),
    };
    await dynamoDoc.send(new PutCommand({ TableName: this.env.plotsTable, Item: plot }));
    return plot;
  }

  async remove(userId: string, plotId: string): Promise<void> {
    await dynamoDoc.send(
      new DeleteCommand({ TableName: this.env.plotsTable, Key: { userId, plotId } }),
    );
  }
}
