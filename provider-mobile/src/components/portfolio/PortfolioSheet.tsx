import { AppSheet } from "@/components/design-system";
import type { PortfolioBody, PortfolioDraft } from "@/types/listing";
import { PortfolioForm } from "./PortfolioForm";

interface Props {
  draft: PortfolioDraft | null;
  saving: boolean;
  onSave: (body: PortfolioBody) => void;
  onClose: () => void;
}

/** Title, description and image of one portfolio photo, for adding or editing. */
export function PortfolioSheet({ draft, onClose, ...rest }: Props) {
  return (
    <AppSheet
      visible={draft !== null}
      onClose={onClose}
      title={draft?.id ? "Edit photo" : "Add a photo"}
    >
      {/* Mounted only while open, so every opening starts from the draft it was given. */}
      {draft ? <PortfolioForm initial={draft} {...rest} /> : null}
    </AppSheet>
  );
}
