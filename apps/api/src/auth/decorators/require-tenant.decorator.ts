import { SetMetadata } from '@nestjs/common';
import { REQUIRE_TENANT_KEY } from '../auth.constants';

export const RequireTenant = () => SetMetadata(REQUIRE_TENANT_KEY, true);
