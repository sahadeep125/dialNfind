import { keepPreviousData, useQuery, type UseQueryResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import type { Dashboard, DashboardDays } from "@/types/dashboard";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  range: (days: DashboardDays) => ["dashboard", days] as const,
};

/** Headline numbers, the daily series and recent activity for the last `days` days. */
export function useDashboard(days: DashboardDays): UseQueryResult<Dashboard> {
  return useQuery({
    queryKey: dashboardKeys.range(days),
    queryFn: () => api<Dashboard>("/provider/dashboard", { query: { days } }),
    placeholderData: keepPreviousData,
  });
}
