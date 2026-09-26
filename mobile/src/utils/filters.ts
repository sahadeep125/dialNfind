/** Choices for the rating and distance filters, and the chip labels that show what is picked. */
export const RATING_OPTIONS: { value: number | undefined; label: string }[] = [
  { value: undefined, label: "Any rating" },
  { value: 3, label: "3 stars and up" },
  { value: 3.5, label: "3.5 stars and up" },
  { value: 4, label: "4 stars and up" },
  { value: 4.5, label: "4.5 stars and up" },
];

/** Undefined lets the API use its default radius (set in the admin console). */
export const DISTANCE_OPTIONS: { value: number | undefined; label: string }[] = [
  { value: undefined, label: "Any distance" },
  { value: 2, label: "Within 2 km" },
  { value: 5, label: "Within 5 km" },
  { value: 10, label: "Within 10 km" },
  { value: 25, label: "Within 25 km" },
  { value: 50, label: "Within 50 km" },
];

export function ratingChipLabel(minRating: number | undefined): string {
  return minRating ? `${minRating}+ rating` : "Rating";
}

export function distanceChipLabel(radiusKm: number | undefined): string {
  return radiusKm ? `Within ${radiusKm} km` : "Distance";
}

/** "12 providers within 15 km of Sevoke Road", or just the count when the radius is unknown. */
export function resultsSummary(total: number, radiusKm: number | undefined, place: string): string {
  const count = `${total} ${total === 1 ? "provider" : "providers"}`;
  return radiusKm ? `${count} within ${radiusKm} km of ${place}` : `${count} found`;
}
