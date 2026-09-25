import { AppSheet } from "@/components/design-system";
import type { Category } from "@/types";
import type { ServiceDraft } from "@/types/listing";
import { ServiceForm } from "./ServiceForm";

interface Props {
  visible: boolean;
  /** Null while adding; the service's display name while editing. */
  editingName: string | null;
  draft: ServiceDraft;
  categories: Category[];
  /** Keys of services already on the profile, so the same one cannot be added twice. */
  takenKeys: Set<string>;
  saving: boolean;
  onSave: (draft: ServiceDraft) => void;
  onClose: () => void;
}

/** Adds a service, or edits the price, unit and main-service flag of one. */
export function ServiceSheet({ visible, editingName, onClose, ...rest }: Props) {
  return (
    <AppSheet visible={visible} onClose={onClose} title={editingName ?? "Add a service"}>
      {/* Mounted only while open, so every opening starts from the draft it was given. */}
      {visible ? <ServiceForm editing={editingName !== null} {...rest} /> : null}
    </AppSheet>
  );
}
