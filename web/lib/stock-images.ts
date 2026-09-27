/**
 * Stock photos shipped in public/images (Unsplash License; see public/images/CREDITS.md).
 * Filenames and alt text describe the scene, since both are read by search engines.
 */
export interface StockImage {
  src: string;
  alt: string;
}

const img = (file: string, alt: string): StockImage => ({ src: `/images/${file}.webp`, alt });

export const HERO_IMAGE = img("handyman-plumber-repairing-kitchen-sink", "Plumber repairing the pipes under a kitchen sink");
export const PROVIDER_IMAGE = img("carpenter-smiling-in-workshop", "Smiling carpenter at work in his workshop");
export const AUTH_IMAGE = img("plumber-arriving-for-bathroom-repair", "Plumber with a toolbox arriving for a bathroom repair");
export const TOOLS_IMAGE = img("handyman-tool-belt", "Handyman's tool belt with a hammer and hand tools");

export const STEP_IMAGES = {
  search: img("customer-searching-services-on-phone", "Customer searching for a local service on his phone"),
  compare: img("couple-comparing-providers-on-phone", "Couple comparing service providers and reviews on a phone"),
  call: img("customer-calling-service-provider", "Customer calling a local service provider"),
};

const CATEGORY_IMAGES: Record<string, StockImage> = {
  plumbing: img("plumber-fixing-pipes-under-sink", "Plumber fixing the pipes under a sink"),
  electricians: img("electrician-installing-wiring", "Electrician in a hard hat installing wiring"),
  "home-appliances": img("ac-unit-installed-on-wall", "Air conditioner unit installed on a wall"),
  carpentry: img("carpenter-sanding-wooden-board", "Carpenter sanding a wooden board"),
  cleaning: img("house-cleaning-vacuuming-living-room", "Home cleaning: vacuuming a bright living room"),
  "pest-control": img("pest-control-spray-treatment", "Pest control technician spraying a treatment"),
  painting: img("house-painter-rolling-wall", "House painter rolling paint onto a wall"),
  "packers-movers": img("packers-movers-packing-boxes", "Packing moving boxes for a house move"),
  tutors: img("home-tutor-teaching-student", "Home tutor helping a student with homework"),
  "beauty-salon": img("barber-styling-hair-salon", "Barber styling a customer's hair in a salon"),
  "vehicle-repair": img("car-mechanic-repairing-engine", "Car mechanic repairing an engine"),
  "electronics-repair": img("technician-repairing-smartphone", "Technician repairing a smartphone circuit board"),
};

/** The photo for a category, or a general tools photo for categories added later by the admin team. */
export function categoryImage(slug?: string | null): StockImage {
  return (slug && CATEGORY_IMAGES[slug]) || TOOLS_IMAGE;
}
