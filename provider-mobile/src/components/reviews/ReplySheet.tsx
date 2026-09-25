import { AppSheet } from "@/components/design-system";
import type { ProviderReview } from "@/types/reviews";
import { ReplyForm } from "./ReplyForm";

interface Props {
  /** The review being replied to; null hides the sheet. */
  review: ProviderReview | null;
  onClose: () => void;
}

/** Bottom sheet to write, edit or remove the public reply to one review. */
export function ReplySheet({ review, onClose }: Props) {
  return (
    <AppSheet
      visible={!!review}
      onClose={onClose}
      title={review?.providerReply ? "Edit your reply" : `Reply to ${review?.author ?? ""}`}
    >
      {review ? <ReplyForm key={review.id} review={review} onDone={onClose} /> : null}
    </AppSheet>
  );
}
