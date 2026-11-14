import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthUser } from './types.js';

type CognitoClaims = {
  readonly sub?: string;
  readonly email?: string;
};

type RequestWithApiGateway = {
  apiGateway?: {
    event?: {
      requestContext?: {
        authorizer?: {
          claims?: CognitoClaims;
        };
      };
    };
  };
  user?: AuthUser;
};

/**
 * Attaches `req.user` from the API Gateway Cognito authorizer claims.
 * ponytail: local JWKS verification deferred — add passport-jwt against the
 * Cognito JWKS only if we need to run authed routes locally.
 */
@Injectable()
export class CognitoGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithApiGateway>();
    const claims = req.apiGateway?.event?.requestContext?.authorizer?.claims;
    if (!claims?.sub) {
      throw new UnauthorizedException('Missing Cognito claims');
    }
    req.user = { sub: claims.sub, email: claims.email ?? '' };
    return true;
  }
}
