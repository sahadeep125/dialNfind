import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { api } from "@/services/api";
import type { AttributeGroup, AttributeValueInput } from "@/types/listing";
import { listingKeys } from "./listingKeys";

/** Category questions for the provider's services, e.g. "Brands serviced". */
export function useAttributes(): UseQueryResult<AttributeGroup[]> {
  return useQuery({
    queryKey: listingKeys.attributes,
    queryFn: async (): Promise<AttributeGroup[]> =>
      (await api<{ groups: AttributeGroup[] }>("/provider/attributes")).groups,
  });
}

/** Upserts answers; a null value clears one. */
export function useSaveAttributes(): UseMutationResult<void, Error, AttributeValueInput[]> {
  const qc = useQueryClient();
  return useMutation<void, Error, AttributeValueInput[]>({
    mutationFn: async (values: AttributeValueInput[]): Promise<void> => {
      await api<{ ok: boolean }>("/provider/attributes", { method: "PUT", body: { values } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: listingKeys.attributes }),
  });
}
