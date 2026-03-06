import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class DispatchOutboxDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  batchSize?: number;
}
