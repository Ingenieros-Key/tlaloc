import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { CognitoGuard } from './cognito.guard.js';

function ctx(req: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as ExecutionContext;
}

describe('CognitoGuard', () => {
  const guard = new CognitoGuard();

  it('attaches user from API GW authorizer claims', () => {
    const req: Record<string, unknown> = {
      apiGateway: {
        event: {
          requestContext: {
            authorizer: { claims: { sub: 'u1', email: 'a@b.c' } },
          },
        },
      },
    };
    expect(guard.canActivate(ctx(req))).toBe(true);
    expect((req.user as { sub: string }).sub).toBe('u1');
  });

  it('rejects when no claims present', () => {
    expect(() => guard.canActivate(ctx({}))).toThrow(UnauthorizedException);
  });
});
