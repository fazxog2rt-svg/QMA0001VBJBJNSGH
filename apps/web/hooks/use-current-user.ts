"use client";

import { useEffect, useState } from "react";
import { apiGet, ApiError } from "@/lib/api";
import type { User } from "@/types";

interface UseCurrentUserResult {
  user: User | null;
  loading: boolean;
  error: ApiError | null;
  refetch: () => void;
}

/**
 * Fetches the authenticated user's profile from GET /api/v1/users/me.
 * Returns `user: null` (not an error) on 401 so callers can render a
 * logged-out state without throwing.
 */
export function useCurrentUser(): UseCurrentUserResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    apiGet<User>("/users/me", undefined, controller.signal)
      .then((data) => {
        setUser(data);
        setError(null);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 401) {
          setUser(null);
        } else {
          setError(err instanceof ApiError ? err : new ApiError(0, "UNKNOWN", "Failed to load user"));
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [tick]);

  return { user, loading, error, refetch: () => setTick((t) => t + 1) };
}
