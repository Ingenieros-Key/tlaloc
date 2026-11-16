import { Body, Controller, Get, Inject, Put, UseGuards } from '@nestjs/common';
import { CognitoGuard } from '../common/auth/cognito.guard.js';
import { CurrentUser } from '../common/auth/current-user.decorator.js';
import * as AuthTypes from '../common/auth/types.js';
import { NotificationsService } from './notifications.service.js';
import { UpdateNotificationsDto } from './dto/update-notifications.dto.js';
import { NotificationPrefs } from './types.js';

@Controller('notifications')
@UseGuards(CognitoGuard)
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly notifications: NotificationsService) {}

  @Get()
  get(@CurrentUser() user: AuthTypes.AuthUser): Promise<NotificationPrefs> {
    return this.notifications.get(user.sub);
  }

  @Put()
  save(
    @CurrentUser() user: AuthTypes.AuthUser,
    @Body() dto: UpdateNotificationsDto,
  ): Promise<NotificationPrefs> {
    return this.notifications.save(user.sub, user.email, dto);
  }
}
