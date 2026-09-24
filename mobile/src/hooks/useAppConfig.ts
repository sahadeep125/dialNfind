import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import type { AppConfig } from "@/types";
import { queryKeys } from "./queryKeys";

/** Support contacts and legal links, edited by the DialNFind team in the admin console. */
export function useAppConfig(): UseQueryResult<AppConfig> {
  return useQuery({
    queryKey: queryKeys.appConfig,
    queryFn: async (): Promise<AppConfig> =>
      (await api<{ config: AppConfig }>("/app-config")).config,
    staleTime: 60 * 60 * 1000,
  });
}
