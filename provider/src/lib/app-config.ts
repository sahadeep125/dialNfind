import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

/** Public settings edited by the DialNFind team in the admin console (support contacts, legal links). */
export interface AppConfig {
  site_name: string | null;
  support_email: string | null;
  support_phone: string | null;
  support_hours: string | null;
  terms_url: string | null;
  privacy_url: string | null;
}

export function useAppConfig() {
  return useQuery({
    queryKey: ["app-config"],
    queryFn: async () => (await api<{ config: AppConfig }>("/app-config")).config,
    staleTime: 60 * 60 * 1000,
  });
}
