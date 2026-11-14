import { Inject, Injectable } from '@nestjs/common';
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { dynamoDoc } from '../common/aws/dynamo.client.js';
import { s3 } from '../common/aws/s3.client.js';
import * as EnvConfigNs from '../config/env.config.js';
import { Profile } from './types.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

export const ENV_CONFIG = 'ENV_CONFIG';

@Injectable()
export class ProfilesService {
  constructor(
    @Inject(ENV_CONFIG) private readonly env: EnvConfigNs.EnvConfig,
  ) {}

  async getOrCreate(userId: string, email: string): Promise<Profile> {
    const existing = await dynamoDoc.send(
      new GetCommand({ TableName: this.env.profilesTable, Key: { userId } }),
    );
    if (existing.Item) return existing.Item as Profile;

    const profile: Profile = {
      userId,
      email,
      updatedAt: new Date().toISOString(),
    };
    await dynamoDoc.send(
      new PutCommand({ TableName: this.env.profilesTable, Item: profile }),
    );
    return profile;
  }

  async update(userId: string, dto: UpdateProfileDto): Promise<Profile> {
    const now = new Date().toISOString();
    const res = await dynamoDoc.send(
      new UpdateCommand({
        TableName: this.env.profilesTable,
        Key: { userId },
        UpdateExpression:
          'SET displayName = :d, bio = :b, #loc = :l, updatedAt = :u',
        ExpressionAttributeNames: { '#loc': 'location' },
        ExpressionAttributeValues: {
          ':d': dto.displayName ?? null,
          ':b': dto.bio ?? null,
          ':l': dto.location ?? null,
          ':u': now,
        },
        ReturnValues: 'ALL_NEW',
      }),
    );
    return res.Attributes as Profile;
  }

  async avatarUploadUrl(
    userId: string,
    contentType: string,
  ): Promise<{ readonly uploadUrl: string; readonly key: string }> {
    const key = `avatars/${userId}/${Date.now()}`;
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: this.env.mediaBucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 300 },
    );
    return { uploadUrl, key };
  }
}
