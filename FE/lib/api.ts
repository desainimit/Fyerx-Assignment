import type { PageMeta } from "@/lib/types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export interface ApiPage<T> {
  data: T;
  metaData?: PageMeta;
}

/**
 * Browser-side client. Every call goes to this app's /api routes, which
 * forward to the backend JSON API with the session token attached.
 */
export async function api<T>(
  path: string,
  init: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<ApiPage<T>> {
  let response: Response;
  try {
    response = await fetch(`/api/${path.replace(/^\//, "")}`, {
      method: init.method ?? "GET",
      headers:
        init.body === undefined
          ? undefined
          : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init.signal,
      cache: "no-store",
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError("Can't reach the server. Check your connection.", 0);
  }

  const json = (await response.json().catch(() => null)) as {
    status?: boolean;
    message?: string;
    data?: T;
    metaData?: PageMeta;
  } | null;

  if (!response.ok || !json?.status) {
    const message =
      response.status === 401
        ? "Your session has expired. Please log in again."
        : (json?.message ?? "Something went wrong. Please try again.");
    throw new ApiError(message, response.status);
  }
  return { data: json.data as T, metaData: json.metaData };
}
