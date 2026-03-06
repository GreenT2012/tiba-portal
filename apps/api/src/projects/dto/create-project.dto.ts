import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateProjectDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsString()
  @MinLength(1)
  name!: string;
}
