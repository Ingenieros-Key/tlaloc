import { Inject, Injectable } from '@nestjs/common';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDoc } from '../common/aws/dynamo.client.js';
import * as EnvConfigNs from '../config/env.config.js';
import { NotificationPrefs } from './types.js';
import { UpdateNotificationsDto } from './dto/update-notifications.dto.js';

export const ENV_CONFIG = 'ENV_CONFIG';

@Injectable()
export class NotificationsService {
  constructor(@Inject(ENV_CONFIG) private readonly env: EnvConfigNs.EnvConfig) {}

  async get(userId: string): Promise<NotificationPrefs> {
    const res = await dynamoDoc.send(
      new GetCommand({ TableName: this.env.notificationsTable, Key: { userId } }),
    );
    return (
      (res.Item as NotificationPrefs | undefined) ?? {
        userId,
        email: '',
        locale: 'en',
        rotation: false,
        irrigation: false,
        updatedAt: '',
      }
    );
  }

  async save(
    userId: string,
    email: string,
    dto: UpdateNotificationsDto,
  ): Promise<NotificationPrefs> {
    const prefs: NotificationPrefs = {
      userId,
      email,
      locale: dto.locale ?? 'en',
      rotation: dto.rotation ?? false,
      irrigation: dto.irrigation ?? false,
      updatedAt: new Date().toISOString(),
    };
    await dynamoDoc.send(
      new PutCommand({ TableName: this.env.notificationsTable, Item: prefs }),
    );
    return prefs;
  }
}
