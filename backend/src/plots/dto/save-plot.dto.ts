import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class SavePlotDto {
  @IsString()
  @MaxLength(60)
  readonly name!: string;

  /** GeoJSON Polygon feature geometry. */
  @IsObject()
  readonly geometry!: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  readonly planting?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  readonly priority?: string;
}
