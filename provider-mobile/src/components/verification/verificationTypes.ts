import { Building2, IdCard, MapPin, type LucideIcon } from "lucide-react-native";

import type { SubmittableVerificationType } from "@/types/listing";

export interface VerificationTypeInfo {
  type: SubmittableVerificationType;
  title: string;
  text: string;
  icon: LucideIcon;
}

export const VERIFICATION_TYPES: VerificationTypeInfo[] = [
  {
    type: "business",
    title: "Business registration",
    text: "Trade licence, GST certificate, Udyam or shop and establishment registration.",
    icon: Building2,
  },
  {
    type: "location",
    title: "Business address",
    text: "Utility bill, rent agreement or a photo of your shop front with its signboard.",
    icon: MapPin,
  },
  {
    type: "id_proof",
    title: "Owner identity",
    text: "Aadhaar, PAN or driving licence of the owner. Only our team sees it.",
    icon: IdCard,
  },
];
