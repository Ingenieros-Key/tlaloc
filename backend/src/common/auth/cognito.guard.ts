import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { getCurrentInvoke } from '@codegenie/serverless-express';
import { AuthUser } from './types.js';

type CognitoClaims = {
  readonly sub?: string;
  readonly email?: string;
};

type RequestWithUser = {
  user?: AuthUser;
};

/**
 * Attaches `req.user` from the API Gateway Cognito authorizer claims.
 * Claims come from serverless-express's per-invocation event singleton
 * (`getCurrentInvoke`), not from `req` — v5 does not attach the event to the
 * request unless the optional `eventContext` middleware is registered.
 * ponytail: local JWKS verification deferred — outside Lambda `getCurrentInvoke`
 * is empty, so authed routes only work behind API Gateway. Add passport-jwt
 * against the Cognito JWKS only if we need to run authed routes locally.
 */
@Injectable()
export class CognitoGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { event } = getCurrentInvoke();
    const claims = event?.requestContext?.authorizer?.claims as
      | CognitoClaims
      | undefined;
    if (!claims?.sub) {
      throw new UnauthorizedException('Missing Cognito claims');
    }
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    req.user = { sub: claims.sub, email: claims.email ?? '' };
    return true;
  }
}
