export interface UserDto {
  id: string;
  username: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface ProvisionedUserDto extends UserDto {
  roles: string[];
  customerId: string | null;
}

export interface ResetPasswordResponseDto {
  ok: true;
}
