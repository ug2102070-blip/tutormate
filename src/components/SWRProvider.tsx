"use client";

import { SWRConfig } from "swr";
import type { ReactNode } from "react";

export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 60_000, // 1 minute in-memory cache
        keepPreviousData: true, // Seamless transitions with zero layout shift
        shouldRetryOnError: false,
        errorRetryCount: 2,
      }}
    >
      {children}
    </SWRConfig>
  );
}
