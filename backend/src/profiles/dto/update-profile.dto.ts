import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  readonly displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  readonly location?: string;
}
