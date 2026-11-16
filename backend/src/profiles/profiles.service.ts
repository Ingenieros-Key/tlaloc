import { Inject, Injectable } from '@nestjs/common';
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
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
    if (existing.Item) return this.withAvatarUrl(existing.Item as Profile);

    const now = new Date().toISOString();
    const profile: Profile = {
      userId,
      email,
      createdAt: now,
      updatedAt: now,
    };
    await dynamoDoc.send(
      new PutCommand({ TableName: this.env.profilesTable, Item: profile }),
    );
    return profile;
  }

  // Only persists fields present in the DTO so partial updates (e.g. avatar-only
  // or display-name-only) don't clobber the others.
  async update(userId: string, dto: UpdateProfileDto): Promise<Profile> {
    const sets = ['updatedAt = :u'];
    const names: Record<string, string> = {};
    const values: Record<string, unknown> = { ':u': new Date().toISOString() };

    if (dto.displayName !== undefined) {
      sets.push('displayName = :d');
      values[':d'] = dto.displayName;
    }
    if (dto.bio !== undefined) {
      sets.push('bio = :b');
      values[':b'] = dto.bio;
    }
    if (dto.location !== undefined) {
      sets.push('#loc = :l');
      names['#loc'] = 'location';
      values[':l'] = dto.location;
    }
    if (dto.avatarKey !== undefined) {
      sets.push('avatarKey = :a');
      values[':a'] = dto.avatarKey;
    }

    const res = await dynamoDoc.send(
      new UpdateCommand({
        TableName: this.env.profilesTable,
        Key: { userId },
        UpdateExpression: `SET ${sets.join(', ')}`,
        ...(Object.keys(names).length
          ? { ExpressionAttributeNames: names }
          : {}),
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      }),
    );
    return this.withAvatarUrl(res.Attributes as Profile);
  }

  private async withAvatarUrl(profile: Profile): Promise<Profile> {
    if (!profile.avatarKey) return profile;
    const avatarUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: this.env.mediaBucket,
        Key: profile.avatarKey,
      }),
      { expiresIn: 3600 },
    );
    return { ...profile, avatarUrl };
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
