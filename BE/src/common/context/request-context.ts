import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { AuthUser } from '@app-types/auth.types';

export interface RequestContext {
  readonly requestId: string;
  user?: AuthUser;
}

// Shared by HTTP providers and Sequelize hooks, including migration contexts.
const storage = new AsyncLocalStorage<RequestContext>();

export function getAuditActorId(): string | null {
  return storage.getStore()?.user?.id ?? null;
}

@Injectable()
export class RequestContextService {
  run<T>(context: RequestContext, callback: () => T): T {
    return storage.run({ ...context }, callback);
  }

  get(): Readonly<RequestContext> | undefined {
    return storage.getStore();
  }

  setUser(user: AuthUser): void {
    const context = storage.getStore();
    if (!context) throw new Error('Request context has not been initialized');
    context.user = user;
  }
}
