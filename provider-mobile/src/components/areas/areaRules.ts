import type { SelectOption, ServiceArea } from "@/types";

export const MAX_AREAS = 50;

const RADII = [1, 2, 3, 5, 8, 10, 15, 20, 25, 30, 40, 50, 75, 100];

/** Travel radius choices. The saved value is always included even if it is not a preset. */
export function radiusOptions(current: number): SelectOption<number>[] {
  const values = RADII.includes(current) ? RADII : [...RADII, current].sort((a, b) => a - b);
  return values.map((v) => ({ value: v, label: `${v} km` }));
}

/** Error for adding this area to the list, or null if it can be added. */
export function areaError(list: ServiceArea[], name: string): string | null {
  const n = name.trim();
  if (n.length < 2) return "Enter at least 2 characters";
  if (n.length > 80) return "Keep the area name under 80 characters";
  if (list.some((a) => a.areaName.toLowerCase() === n.toLowerCase()))
    return `${n} is already in your list`;
  if (list.length >= MAX_AREAS) return `You can list up to ${MAX_AREAS} areas`;
  return null;
}

/** Only the fields PUT /provider/service-areas accepts. */
export function cleanAreas(list: ServiceArea[]): ServiceArea[] {
  return list.map(({ areaName, pincode, latitude, longitude }) => ({
    areaName,
    pincode: pincode ?? null,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  }));
}
