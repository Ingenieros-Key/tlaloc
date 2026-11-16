import { Body, Controller, Get, Inject, Post, Put, UseGuards } from '@nestjs/common';
import { CognitoGuard } from '../common/auth/cognito.guard.js';
import { CurrentUser } from '../common/auth/current-user.decorator.js';
import * as AuthTypes from '../common/auth/types.js';
import { ProfilesService } from './profiles.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { Profile } from './types.js';

@Controller('profiles')
@UseGuards(CognitoGuard)
export class ProfilesController {
  // esbuild (CDK NodejsFunction bundler) does not emit emitDecoratorMetadata,
  // so Nest cannot infer the type to inject here — the explicit @Inject token is required.
  constructor(@Inject(ProfilesService) private readonly profiles: ProfilesService) {}

  @Get('me')
  me(@CurrentUser() user: AuthTypes.AuthUser): Promise<Profile> {
    return this.profiles.getOrCreate(user.sub, user.email);
  }

  @Put('me')
  update(
    @CurrentUser() user: AuthTypes.AuthUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<Profile> {
    return this.profiles.update(user.sub, dto);
  }

  @Post('me/avatar')
  avatar(
    @CurrentUser() user: AuthTypes.AuthUser,
    @Body('contentType') contentType: string,
  ): Promise<{ readonly uploadUrl: string; readonly key: string }> {
    return this.profiles.avatarUploadUrl(user.sub, contentType ?? 'image/jpeg');
  }
}
