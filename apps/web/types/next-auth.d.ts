import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    roles: string[];
    customerId: string | null;
    user: {
      sub: string;
      email: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    roles?: string[];
    customerId?: string | null;
  }
}
