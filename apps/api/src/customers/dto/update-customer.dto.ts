import { IsString, MinLength } from 'class-validator';

export class UpdateCustomerDto {
  @IsString()
  @MinLength(1)
  name!: string;
}
