// Icon and tint per category slug, matching web/components/site/category-icon.tsx.
import {
  AirVent,
  Briefcase,
  Bug,
  Car,
  GraduationCap,
  Hammer,
  PaintRoller,
  Scissors,
  Sparkles,
  Truck,
  Tv,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react-native";

interface Tone {
  bg: string;
  fg: string;
}

interface CategoryStyle {
  icon: LucideIcon;
  light: Tone;
  dark: Tone;
}

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  "electronics-repair": {
    icon: Tv,
    light: { bg: "#E5EFFF", fg: "#2D54D3" },
    dark: { bg: "#222D46", fg: "#87B3FF" },
  },
  "home-appliances": {
    icon: AirVent,
    light: { bg: "#D6F5FF", fg: "#0077A5" },
    dark: { bg: "#003441", fg: "#5CC6ED" },
  },
  electricians: {
    icon: Zap,
    light: { bg: "#FFF0CC", fg: "#A16100" },
    dark: { bg: "#402900", fg: "#E2AC6B" },
  },
  plumbing: {
    icon: Wrench,
    light: { bg: "#D4F6F8", fg: "#007984" },
    dark: { bg: "#003639", fg: "#76C7D0" },
  },
  carpentry: {
    icon: Hammer,
    light: { bg: "#FFEADC", fg: "#90502A" },
    dark: { bg: "#402715", fg: "#E2A989" },
  },
  cleaning: {
    icon: Sparkles,
    light: { bg: "#D9F7EB", fg: "#007759" },
    dark: { bg: "#053729", fg: "#7BCAAF" },
  },
  "pest-control": {
    icon: Bug,
    light: { bg: "#E1F6DC", fg: "#2F7434" },
    dark: { bg: "#1B3515", fg: "#90C891" },
  },
  painting: {
    icon: PaintRoller,
    light: { bg: "#FDE7FA", fg: "#A0388F" },
    dark: { bg: "#3D233B", fg: "#ED95DA" },
  },
  "packers-movers": {
    icon: Truck,
    light: { bg: "#FFE8E3", fg: "#B8492E" },
    dark: { bg: "#43241F", fg: "#FA9B82" },
  },
  tutors: {
    icon: GraduationCap,
    light: { bg: "#F0EAFF", fg: "#6D47B8" },
    dark: { bg: "#302847", fg: "#BEA5FF" },
  },
  "beauty-salon": {
    icon: Scissors,
    light: { bg: "#FFE5E9", fg: "#BB3F5C" },
    dark: { bg: "#452127", fg: "#FD93A5" },
  },
  "vehicle-repair": {
    icon: Car,
    light: { bg: "#E4ECF5", fg: "#3A4E68" },
    dark: { bg: "#252F3A", fg: "#A7B9D1" },
  },
};

export const FALLBACK_CATEGORY_STYLE: CategoryStyle = {
  icon: Briefcase,
  light: { bg: "#EAF0FE", fg: "#1F3A8B" },
  dark: { bg: "#1D2842", fg: "#C9D7FC" },
};

export const SORT_OPTIONS: {
  value: "relevance" | "distance" | "rating" | "reviews";
  label: string;
}[] = [
  { value: "relevance", label: "Best match" },
  { value: "distance", label: "Nearest" },
  { value: "rating", label: "Top rated" },
  { value: "reviews", label: "Most reviewed" },
];
