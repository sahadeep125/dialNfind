import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { api } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import type { Address } from "@/types";
import { toCoordinate } from "@/utils/addresses";
import { queryKeys } from "./queryKeys";

export type AddressInput = Omit<Address, "id" | "isDefault"> & { isDefault?: boolean };

const normalize = (a: Address): Address => ({ ...a, latitude: toCoordinate(a.latitude), longitude: toCoordinate(a.longitude) });

/** The person's saved addresses, the default first. */
export function useAddresses(): UseQueryResult<Address[]> {
  const signedIn = useAuthStore((s) => !!s.token);
  return useQuery({
    queryKey: queryKeys.addresses,
    enabled: signedIn,
    queryFn: async (): Promise<Address[]> =>
      (await api<{ addresses: Address[] }>("/me/addresses")).addresses.map(normalize),
  });
}

/** Adds an address, or updates one when an id is given. */
export function useSaveAddress(): UseMutationResult<Address, Error, { id?: number; input: AddressInput }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: number; input: AddressInput }): Promise<Address> => {
      const body = { ...input, label: input.label.trim() || "Home", pincode: input.pincode.trim() };
      const res = id
        ? await api<{ address: Address }>(`/me/addresses/${id}`, { method: "PATCH", body })
        : await api<{ address: Address }>("/me/addresses", { method: "POST", body });
      return normalize(res.address);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.addresses }),
  });
}

export function useMakeDefaultAddress(): UseMutationResult<unknown, Error, number> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/me/addresses/${id}`, { method: "PATCH", body: { isDefault: true } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.addresses }),
  });
}

export function useDeleteAddress(): UseMutationResult<unknown, Error, number> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/me/addresses/${id}`, { method: "DELETE" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.addresses }),
  });
}
