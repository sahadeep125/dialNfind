import { useSession } from "@/hooks/useSession";

/** Renders nothing; keeps the stored profile fresh. Lives inside the query provider. */
export function SessionRefresher() {
  useSession();
  return null;
}
