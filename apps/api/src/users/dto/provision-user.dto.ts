import { ArrayMinSize, IsArray, IsEmail, IsOptional, IsString } from 'class-validator';

export class ProvisionUserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsArray()
  @ArrayMinSize(1)
  roles!: string[];
}
