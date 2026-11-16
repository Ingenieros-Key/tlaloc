import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateNotificationsDto {
  @IsOptional()
  @IsBoolean()
  readonly rotation?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly irrigation?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['en', 'es'])
  readonly locale?: string;
}
