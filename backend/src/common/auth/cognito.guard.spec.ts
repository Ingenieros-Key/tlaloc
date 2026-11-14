import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { CognitoGuard } from './cognito.guard.js';

const { mockGetCurrentInvoke } = vi.hoisted(() => ({
  mockGetCurrentInvoke: vi.fn(),
}));

vi.mock('@codegenie/serverless-express', () => ({
  getCurrentInvoke: mockGetCurrentInvoke,
}));

function ctx(req: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as ExecutionContext;
}

describe('CognitoGuard', () => {
  const guard = new CognitoGuard();

  beforeEach(() => mockGetCurrentInvoke.mockReset());

  it('attaches user from API GW authorizer claims', () => {
    mockGetCurrentInvoke.mockReturnValue({
      event: {
        requestContext: { authorizer: { claims: { sub: 'u1', email: 'a@b.c' } } },
      },
    });
    const req: Record<string, unknown> = {};
    expect(guard.canActivate(ctx(req))).toBe(true);
    expect((req.user as { sub: string }).sub).toBe('u1');
  });

  it('rejects when no claims present', () => {
    mockGetCurrentInvoke.mockReturnValue({ event: undefined });
    expect(() => guard.canActivate(ctx({}))).toThrow(UnauthorizedException);
  });
});
