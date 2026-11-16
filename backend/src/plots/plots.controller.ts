import { Body, Controller, Delete, Get, Inject, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CognitoGuard } from '../common/auth/cognito.guard.js';
import { CurrentUser } from '../common/auth/current-user.decorator.js';
import * as AuthTypes from '../common/auth/types.js';
import { PlotsService } from './plots.service.js';
import { SavePlotDto } from './dto/save-plot.dto.js';
import { Plot } from './types.js';

@Controller('plots')
@UseGuards(CognitoGuard)
export class PlotsController {
  constructor(@Inject(PlotsService) private readonly plots: PlotsService) {}

  @Get()
  list(@CurrentUser() user: AuthTypes.AuthUser): Promise<readonly Plot[]> {
    return this.plots.list(user.sub);
  }

  @Post()
  create(@CurrentUser() user: AuthTypes.AuthUser, @Body() dto: SavePlotDto): Promise<Plot> {
    return this.plots.create(user.sub, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthTypes.AuthUser,
    @Param('id') id: string,
    @Body() dto: SavePlotDto,
  ): Promise<Plot> {
    return this.plots.update(user.sub, id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthTypes.AuthUser, @Param('id') id: string): Promise<{ ok: true }> {
    await this.plots.remove(user.sub, id);
    return { ok: true };
  }
}
