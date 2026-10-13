"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, api, type ApiPage } from "@/lib/api";

type State<T> =
  | { status: "loading" }
  | { status: "error"; message: string; code: number }
  | { status: "success"; result: ApiPage<T> };

/**
 * Loads `path` from the JSON API and re-loads when it changes. A newer
 * request aborts the older one, so fast filter changes never show stale data.
 * Pass null to skip loading.
 */
export function useApi<T>(path: string | null) {
  const [attempt, setAttempt] = useState(0);
  const key = path === null ? null : `${path}#${attempt}`;
  // Each result remembers which request it answers. Until the current
  // request has an answer, the state is "loading".
  const [settled, setSettled] = useState<{ key: string; state: State<T> }>();

  useEffect(() => {
    if (path === null || key === null) return;
    const controller = new AbortController();
    api<T>(path, { signal: controller.signal })
      .then((result) =>
        setSettled({ key, state: { status: "success", result } }),
      )
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setSettled({
          key,
          state: {
            status: "error",
            message:
              error instanceof Error ? error.message : "Something went wrong",
            code: error instanceof ApiError ? error.status : 0,
          },
        });
      });
    return () => controller.abort();
  }, [path, key]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const state: State<T> =
    settled && settled.key === key ? settled.state : { status: "loading" };
  return { state, retry };
}
