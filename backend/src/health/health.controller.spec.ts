import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('returns ok', async () => {
    const mod = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();
    const c = mod.get(HealthController);
    expect(c.check()).toEqual({ status: 'ok' });
  });
});
