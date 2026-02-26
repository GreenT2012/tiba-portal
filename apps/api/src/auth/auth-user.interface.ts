export interface AuthUser {
  sub: string;
  roles: string[];
  customerId: string | null;
  email: string | null;
}
