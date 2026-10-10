import { SetMetadata } from '@nestjs/common';
import { PUBLIC_ROUTE_KEY } from '@constants';

// A handler can use @Public(false) to override a public controller.
export const Public = (isPublic = true) =>
  SetMetadata(PUBLIC_ROUTE_KEY, isPublic);
