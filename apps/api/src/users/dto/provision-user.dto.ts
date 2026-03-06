export class ProvisionUserDto {
  email!: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  customerId?: string;
  roles!: string[];
}
