import type { Guide } from "../types";
import { BEAUTY_SALON_GUIDES } from "./beauty-salon";
import { CARPENTRY_GUIDES } from "./carpentry";
import { CLEANING_GUIDES } from "./cleaning";
import { ELECTRICIANS_GUIDES } from "./electricians";
import { ELECTRONICS_REPAIR_GUIDES } from "./electronics-repair";
import { HOME_APPLIANCES_GUIDES } from "./home-appliances";
import { PACKERS_MOVERS_GUIDES } from "./packers-movers";
import { PAINTING_GUIDES } from "./painting";
import { PEST_CONTROL_GUIDES } from "./pest-control";
import { PLUMBING_GUIDES } from "./plumbing";
import { TUTORS_GUIDES } from "./tutors";
import { VEHICLE_REPAIR_GUIDES } from "./vehicle-repair";

/** Every guide under /guides, in the order the hub lists categories. One file per category. */
export const GUIDES: Guide[] = [
  ...ELECTRONICS_REPAIR_GUIDES,
  ...HOME_APPLIANCES_GUIDES,
  ...ELECTRICIANS_GUIDES,
  ...PLUMBING_GUIDES,
  ...CARPENTRY_GUIDES,
  ...CLEANING_GUIDES,
  ...PEST_CONTROL_GUIDES,
  ...PAINTING_GUIDES,
  ...PACKERS_MOVERS_GUIDES,
  ...TUTORS_GUIDES,
  ...BEAUTY_SALON_GUIDES,
  ...VEHICLE_REPAIR_GUIDES,
];
