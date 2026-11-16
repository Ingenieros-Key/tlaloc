import { ProfilesService } from './profiles.service.js';

const { send } = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('../common/aws/dynamo.client.js', () => ({
  dynamoDoc: { send: (...a: unknown[]) => send(...a) },
}));
vi.mock('../common/aws/s3.client.js', () => ({ s3: {} }));
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://signed'),
}));

describe('ProfilesService', () => {
  const env = {
    profilesTable: 't',
    plotsTable: 'p',
    notificationsTable: 'n',
    mediaBucket: 'b',
    userPoolId: 'u',
    userPoolClientId: 'c',
    region: 'us-east-1',
  };
  const svc = new ProfilesService(env);

  beforeEach(() => send.mockReset());

  it('getOrCreate returns existing profile', async () => {
    send.mockResolvedValueOnce({
      Item: { userId: 'u1', email: 'a@b.c', updatedAt: 'x' },
    });
    const p = await svc.getOrCreate('u1', 'a@b.c');
    expect(p.userId).toBe('u1');
  });

  it('getOrCreate seeds a new profile when none exists', async () => {
    send.mockResolvedValueOnce({ Item: undefined });
    send.mockResolvedValueOnce({});
    const p = await svc.getOrCreate('u2', 'n@b.c');
    expect(p.email).toBe('n@b.c');
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('avatarUploadUrl returns a signed url and key', async () => {
    const r = await svc.avatarUploadUrl('u1', 'image/png');
    expect(r.uploadUrl).toBe('https://signed');
    expect(r.key).toMatch(/^avatars\/u1\//);
  });
});
