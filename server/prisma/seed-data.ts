// Static reference data for the demo seed. Coordinates are approximate locality centres.

export interface CitySeed {
  city: string;
  state: string;
  pincodePrefix: string;
  providersPerCategory: number;
  localities: { name: string; lat: number; lng: number; pincode: string }[];
}

export const CITIES: CitySeed[] = [
  {
    city: "Siliguri",
    state: "West Bengal",
    pincodePrefix: "734",
    providersPerCategory: 6,
    localities: [
      { name: "Sevoke Road", lat: 26.734, lng: 88.433, pincode: "734001" },
      { name: "Hill Cart Road", lat: 26.72, lng: 88.423, pincode: "734001" },
      { name: "Pradhan Nagar", lat: 26.724, lng: 88.415, pincode: "734003" },
      { name: "Matigara", lat: 26.7117, lng: 88.386, pincode: "734010" },
      { name: "Hakimpara", lat: 26.7125, lng: 88.43, pincode: "734001" },
      { name: "Ashrampara", lat: 26.716, lng: 88.426, pincode: "734001" },
      { name: "Champasari", lat: 26.75, lng: 88.418, pincode: "734003" },
      { name: "Salugara", lat: 26.765, lng: 88.446, pincode: "734008" },
      { name: "Bagdogra", lat: 26.699, lng: 88.319, pincode: "734014" },
      { name: "Burdwan Road", lat: 26.705, lng: 88.428, pincode: "734005" },
    ],
  },
  {
    city: "Kolkata",
    state: "West Bengal",
    pincodePrefix: "700",
    providersPerCategory: 3,
    localities: [
      { name: "Salt Lake Sector V", lat: 22.576, lng: 88.433, pincode: "700091" },
      { name: "Park Street", lat: 22.553, lng: 88.352, pincode: "700016" },
      { name: "Gariahat", lat: 22.518, lng: 88.367, pincode: "700019" },
      { name: "Behala", lat: 22.498, lng: 88.31, pincode: "700034" },
      { name: "New Town", lat: 22.581, lng: 88.461, pincode: "700156" },
      { name: "Dum Dum", lat: 22.623, lng: 88.421, pincode: "700028" },
      { name: "Ballygunge", lat: 22.528, lng: 88.365, pincode: "700019" },
      { name: "Tollygunge", lat: 22.499, lng: 88.347, pincode: "700033" },
      { name: "Lake Town", lat: 22.604, lng: 88.404, pincode: "700089" },
    ],
  },
  {
    city: "Bengaluru",
    state: "Karnataka",
    pincodePrefix: "560",
    providersPerCategory: 3,
    localities: [
      { name: "Koramangala", lat: 12.9352, lng: 77.6245, pincode: "560034" },
      { name: "Indiranagar", lat: 12.9784, lng: 77.6408, pincode: "560038" },
      { name: "Whitefield", lat: 12.9698, lng: 77.75, pincode: "560066" },
      { name: "HSR Layout", lat: 12.9121, lng: 77.6446, pincode: "560102" },
      { name: "Jayanagar", lat: 12.925, lng: 77.5938, pincode: "560041" },
      { name: "Malleshwaram", lat: 13.0035, lng: 77.57, pincode: "560003" },
      { name: "BTM Layout", lat: 12.9166, lng: 77.6101, pincode: "560076" },
      { name: "Marathahalli", lat: 12.9592, lng: 77.6974, pincode: "560037" },
      { name: "Hebbal", lat: 13.0358, lng: 77.597, pincode: "560024" },
    ],
  },
  {
    city: "Delhi",
    state: "Delhi",
    pincodePrefix: "110",
    providersPerCategory: 3,
    localities: [
      { name: "Connaught Place", lat: 28.6315, lng: 77.2167, pincode: "110001" },
      { name: "Lajpat Nagar", lat: 28.5677, lng: 77.2433, pincode: "110024" },
      { name: "Dwarka", lat: 28.5921, lng: 77.046, pincode: "110075" },
      { name: "Rohini", lat: 28.7495, lng: 77.0565, pincode: "110085" },
      { name: "Saket", lat: 28.5245, lng: 77.2066, pincode: "110017" },
      { name: "Karol Bagh", lat: 28.6519, lng: 77.1909, pincode: "110005" },
      { name: "Vasant Kunj", lat: 28.5293, lng: 77.153, pincode: "110070" },
      { name: "Mayur Vihar", lat: 28.609, lng: 77.294, pincode: "110091" },
      { name: "Janakpuri", lat: 28.6219, lng: 77.0878, pincode: "110058" },
    ],
  },
  {
    city: "Mumbai",
    state: "Maharashtra",
    pincodePrefix: "400",
    providersPerCategory: 3,
    localities: [
      { name: "Andheri West", lat: 19.1364, lng: 72.8296, pincode: "400053" },
      { name: "Bandra West", lat: 19.0596, lng: 72.8295, pincode: "400050" },
      { name: "Powai", lat: 19.1176, lng: 72.906, pincode: "400076" },
      { name: "Dadar", lat: 19.0178, lng: 72.8478, pincode: "400014" },
      { name: "Borivali", lat: 19.2307, lng: 72.8567, pincode: "400092" },
      { name: "Malad", lat: 19.1874, lng: 72.8484, pincode: "400064" },
      { name: "Chembur", lat: 19.0522, lng: 72.9005, pincode: "400071" },
      { name: "Goregaon", lat: 19.1663, lng: 72.8526, pincode: "400063" },
    ],
  },
];

export interface CategorySeed {
  name: string;
  slug: string;
  description: string;
  icon: string;
  uiTemplate: string;
  priceRange: [number, number];
  priceUnit: "per_visit" | "per_hour" | "fixed";
  subcategories: string[];
  nameParts: { brands: string[]; nouns: string[] };
  blurbs: string[];
  reviewSnippets: string[];
  attributes: { label: string; appliesTo: "lead" | "provider"; fieldType: "text" | "number" | "select" | "multiselect" | "boolean"; options?: string[] }[];
}

export const CATEGORIES: CategorySeed[] = [
  {
    name: "Electronics Repair",
    slug: "electronics-repair",
    description: "TV, mobile, laptop and home entertainment repair by trained technicians.",
    icon: "tv",
    uiTemplate: "repair_appliance",
    priceRange: [199, 499],
    priceUnit: "per_visit",
    subcategories: ["TV Repair", "Mobile Phone Repair", "Laptop & Computer Repair", "Home Theatre & Audio Repair", "CCTV Installation"],
    nameParts: {
      brands: ["Sharma", "Digital", "PixelCare", "Sen's", "Bright View", "TechMate", "Gupta", "Metro", "Galaxy", "Smart"],
      nouns: ["TV & Electronics Care", "Electronics Service Centre", "TV Repair Point", "Electronic Solutions", "Tech Repairs", "Display Clinic"],
    },
    blurbs: [
      "LED, LCD, OLED and smart TV repair at your doorstep. We fix no-picture, no-sound, backlight and board faults, and carry common spares in the van so most repairs finish in one visit.",
      "Certified technicians for televisions, set-top boxes and home theatre systems. Transparent diagnosis before any work starts, genuine parts, and a 90-day service warranty.",
      "Same-day repair for smart TVs, laptops and mobile phones. Screen replacement, motherboard repair, software issues and wall mounting handled by an experienced team.",
    ],
    reviewSnippets: [
      "TV had no picture after a power cut. Technician came within two hours, replaced the power board and it works perfectly.",
      "Explained the fault clearly and the price was exactly what was quoted on the phone.",
      "Fixed the backlight on my 43 inch LED at home. Very professional and neat work.",
      "Laptop was not charging, they replaced the port the same day.",
    ],
    attributes: [
      { label: "Device type", appliesTo: "lead", fieldType: "select", options: ["LED TV", "Smart TV", "Mobile", "Laptop", "Home theatre"] },
      { label: "Brands serviced", appliesTo: "provider", fieldType: "multiselect", options: ["Samsung", "LG", "Sony", "Mi", "OnePlus", "TCL", "Panasonic"] },
    ],
  },
  {
    name: "Home Appliances",
    slug: "home-appliances",
    description: "AC, refrigerator, washing machine and kitchen appliance repair and servicing.",
    icon: "air-vent",
    uiTemplate: "repair_appliance",
    priceRange: [249, 599],
    priceUnit: "per_visit",
    subcategories: ["AC Repair & Service", "Refrigerator Repair", "Washing Machine Repair", "Microwave Repair", "Water Purifier Service", "Geyser Repair"],
    nameParts: {
      brands: ["CoolAir", "Das", "HomeFix", "Polar", "Frost", "Verma", "QuickServ", "Arctic", "Reliable", "Prime"],
      nouns: ["Appliance Services", "AC & Fridge Care", "Cooling Solutions", "Home Appliance Repair", "Service Hub", "Refrigeration Works"],
    },
    blurbs: [
      "Split and window AC servicing, gas refilling and installation. Refrigerator and washing machine repair for all major brands with genuine spares.",
      "Doorstep appliance repair with upfront pricing. Our technicians handle cooling issues, drum and motor faults, PCB repair and preventive maintenance contracts.",
      "Trusted for AC deep cleaning before summer, RO purifier servicing and geyser repair. Annual maintenance plans available for homes and offices.",
    ],
    reviewSnippets: [
      "AC was blowing warm air. They found a gas leak, fixed it and refilled on the same visit.",
      "Washing machine drum issue sorted in under an hour. Fair price.",
      "Booked a pre-summer AC service for three units, the team was on time and cleaned up after.",
      "Fridge stopped cooling at night, they came first thing in the morning.",
    ],
    attributes: [
      { label: "Appliance", appliesTo: "lead", fieldType: "select", options: ["Split AC", "Window AC", "Refrigerator", "Washing machine", "Microwave", "RO purifier", "Geyser"] },
      { label: "Offers AMC", appliesTo: "provider", fieldType: "boolean" },
    ],
  },
  {
    name: "Electricians",
    slug: "electricians",
    description: "Licensed electricians for wiring, fittings, inverters and safety checks.",
    icon: "zap",
    uiTemplate: "default",
    priceRange: [149, 399],
    priceUnit: "per_visit",
    subcategories: ["Wiring & Rewiring", "Fan & Light Installation", "Inverter & Battery", "Switchboard Repair", "Electrical Safety Inspection"],
    nameParts: {
      brands: ["Bright Spark", "Roy", "PowerLine", "Volt", "Singh", "Current", "Ampere", "Shakti", "SafeWire", "Jyoti"],
      nouns: ["Electricals", "Electric Works", "Electrical Services", "Power Solutions", "Electricians", "Wiring Experts"],
    },
    blurbs: [
      "Licensed electricians for new wiring, rewiring, MCB and DB upgrades, fan and light fitting, and inverter installation. Emergency call-outs taken late into the evening.",
      "Safe, code-compliant electrical work for homes and shops. We diagnose tripping, short circuits and flickering lights and give a written estimate first.",
      "From a single switchboard repair to full-flat rewiring, our team works clean and on schedule. Battery and inverter sales with installation.",
    ],
    reviewSnippets: [
      "Frequent tripping in the kitchen. He traced it to a faulty socket and replaced it quickly.",
      "Installed four ceiling fans and two lights in an afternoon. Very tidy.",
      "Came late at night when the power went off in half the house. Lifesaver.",
      "Did full rewiring for our old flat, work was neat and they finished on time.",
    ],
    attributes: [{ label: "Licence number", appliesTo: "provider", fieldType: "text" }],
  },
  {
    name: "Plumbing",
    slug: "plumbing",
    description: "Leak repair, bathroom fittings, drain unblocking and water tank cleaning.",
    icon: "wrench",
    uiTemplate: "default",
    priceRange: [149, 449],
    priceUnit: "per_visit",
    subcategories: ["Leak Repair", "Bathroom Fitting", "Water Tank Cleaning", "Drain Unblocking", "Motor & Pump Repair"],
    nameParts: {
      brands: ["AquaFix", "Mondal", "FlowRight", "Pipeline", "Yadav", "Neer", "BlueDrop", "Clearway", "Hydro", "Paul"],
      nouns: ["Plumbing Services", "Plumbers", "Sanitary Works", "Plumbing Solutions", "Pipe Works", "Water Solutions"],
    },
    blurbs: [
      "Experienced plumbers for leaking taps, concealed pipe leaks, blocked drains and bathroom fittings. We carry pressure testing tools to find leaks without breaking tiles unnecessarily.",
      "Complete bathroom and kitchen plumbing, from new fittings to motor and pump repair. Overhead and underground tank cleaning with anti-bacterial treatment.",
      "Quick response plumbing for homes, apartments and restaurants. Fixed rates for common jobs so there are no surprises.",
    ],
    reviewSnippets: [
      "Fixed a hidden leak under the sink that two others could not find.",
      "Drain in the bathroom was completely blocked, cleared in 20 minutes.",
      "Installed a new shower and mixer, very clean finish.",
      "Tank cleaning was thorough and they showed before and after photos.",
    ],
    attributes: [{ label: "Issue", appliesTo: "lead", fieldType: "select", options: ["Leak", "Blockage", "New fitting", "Low pressure", "Motor"] }],
  },
  {
    name: "Carpentry",
    slug: "carpentry",
    description: "Furniture repair, modular kitchens, doors, windows and custom woodwork.",
    icon: "hammer",
    uiTemplate: "default",
    priceRange: [199, 699],
    priceUnit: "per_visit",
    subcategories: ["Furniture Repair", "Modular Kitchen", "Door & Window Work", "Custom Furniture"],
    nameParts: {
      brands: ["WoodCraft", "Vishwakarma", "Timber", "Oak & Nail", "Mistry", "Grain", "Furnish", "Teak", "Carve", "Shree"],
      nouns: ["Carpentry Works", "Furniture Studio", "Wood Works", "Interiors", "Carpenters", "Furniture Solutions"],
    },
    blurbs: [
      "Skilled carpenters for furniture repair, hinge and channel replacement, door alignment and custom wardrobes. Site visits for measurement at no charge.",
      "Modular kitchens and wardrobes built to measure, with branded hardware and laminates. We also take on small repairs and furniture assembly.",
      "Traditional craftsmanship with modern designs. Beds, TV units, study tables and doors made in our own workshop.",
    ],
    reviewSnippets: [
      "Repaired our wardrobe sliding doors, now they glide like new.",
      "Made a custom study table exactly to our measurements.",
      "Assembled all the furniture after our move in half a day.",
      "Kitchen cabinets look great and were delivered on the promised date.",
    ],
    attributes: [],
  },
  {
    name: "Cleaning Services",
    slug: "cleaning",
    description: "Deep cleaning for homes and offices, sofas, carpets, kitchens and bathrooms.",
    icon: "sparkles",
    uiTemplate: "default",
    priceRange: [499, 2999],
    priceUnit: "fixed",
    subcategories: ["Home Deep Cleaning", "Sofa & Carpet Cleaning", "Bathroom Cleaning", "Kitchen Cleaning", "Office Cleaning"],
    nameParts: {
      brands: ["Sparkle", "FreshNest", "CleanPro", "Shine", "Spotless", "PureHome", "Tidy", "Gleam", "NeatNest", "Crystal"],
      nouns: ["Cleaning Services", "Home Care", "Cleaners", "Facility Services", "Deep Clean Co.", "Housekeeping"],
    },
    blurbs: [
      "Trained, background-checked cleaning crews with professional equipment and safe chemicals. Full home deep cleaning, move-in and move-out cleaning, and sofa shampooing.",
      "Kitchen degreasing, bathroom descaling and carpet shampooing done right. We bring everything and leave your home spotless.",
      "Scheduled office and commercial cleaning with checklists and supervisor sign-off. Flexible timings including weekends.",
    ],
    reviewSnippets: [
      "Deep cleaned our 2BHK before we moved in. Kitchen looks brand new.",
      "Sofa had stains from years, they came out completely.",
      "Team of three, finished in five hours, very polite.",
      "Bathroom tiles were descaled beautifully.",
    ],
    attributes: [{ label: "Home size", appliesTo: "lead", fieldType: "select", options: ["1 BHK", "2 BHK", "3 BHK", "4 BHK+", "Office"] }],
  },
  {
    name: "Pest Control",
    slug: "pest-control",
    description: "Safe, certified treatment for cockroaches, termites, bed bugs and mosquitoes.",
    icon: "bug",
    uiTemplate: "default",
    priceRange: [699, 2499],
    priceUnit: "fixed",
    subcategories: ["Cockroach Control", "Termite Treatment", "Bed Bug Treatment", "Mosquito Control", "Rodent Control"],
    nameParts: {
      brands: ["SafeGuard", "BugOff", "Shield", "PestAway", "Green", "Nirmal", "Fortress", "EcoPest", "Rakshak", "Clearzone"],
      nouns: ["Pest Control", "Pest Solutions", "Pest Management", "Hygiene Services", "Pest Care", "Protection Services"],
    },
    blurbs: [
      "Government-licensed pest control using odourless, family-safe gel and spray treatments. Free follow-up visit within 30 days.",
      "Termite treatment for new and existing buildings, bed bug and rodent control, and mosquito fogging for societies.",
      "Integrated pest management for homes, restaurants and warehouses with service reports after every visit.",
    ],
    reviewSnippets: [
      "Cockroach problem gone after one gel treatment. No smell at all.",
      "Termite treatment for our wooden doors, very professional.",
      "They explained the safety steps clearly since we have a baby at home.",
      "Came back for the free follow-up without me having to call.",
    ],
    attributes: [],
  },
  {
    name: "Painting",
    slug: "painting",
    description: "Interior and exterior painting, waterproofing and textures.",
    icon: "paint-roller",
    uiTemplate: "default",
    priceRange: [2499, 7999],
    priceUnit: "fixed",
    subcategories: ["Interior Painting", "Exterior Painting", "Waterproofing", "Texture & Wallpaper"],
    nameParts: {
      brands: ["ColourCraft", "Rang", "BrushWorks", "Hue", "Chitra", "Palette", "FreshCoat", "Rainbow", "Prism", "Kala"],
      nouns: ["Painters", "Painting Services", "Paint & Decor", "Home Painting", "Painting Contractors", "Colour Studio"],
    },
    blurbs: [
      "Professional painters with furniture covering, putty, primer and two-coat finish. Free colour consultation and written quote per square foot.",
      "Exterior painting and terrace waterproofing with branded materials and a workmanship warranty.",
      "Designer textures, stencils and wallpaper for feature walls. Clean, dust-controlled sanding.",
    ],
    reviewSnippets: [
      "Painted our 3BHK in four days, covered all furniture and cleaned up daily.",
      "Waterproofing fixed the seepage in our bedroom wall.",
      "Great colour suggestions, the living room looks amazing.",
      "Finished on schedule and the quote did not change.",
    ],
    attributes: [],
  },
  {
    name: "Packers & Movers",
    slug: "packers-movers",
    description: "Local and intercity shifting, vehicle transport and office relocation.",
    icon: "truck",
    uiTemplate: "default",
    priceRange: [2999, 14999],
    priceUnit: "fixed",
    subcategories: ["Local Shifting", "Intercity Relocation", "Vehicle Transport", "Office Relocation"],
    nameParts: {
      brands: ["SafeMove", "Agarwal", "ShiftEasy", "Relocate", "Swift", "Kumar", "MoveRight", "Cargo", "Transit", "Global"],
      nouns: ["Packers & Movers", "Relocations", "Logistics", "Movers", "Shifting Services", "Cargo Movers"],
    },
    blurbs: [
      "Door-to-door household shifting with multi-layer packing, loading, transport and unpacking. Transit insurance available.",
      "Intercity relocation and bike or car transport with GPS-tracked vehicles and a dedicated move coordinator.",
      "Office and commercial moves planned over weekends to avoid downtime, including IT equipment handling.",
    ],
    reviewSnippets: [
      "Nothing was damaged in our move from Siliguri to Kolkata.",
      "Packing was excellent, they labelled every box by room.",
      "Arrived on time and the final bill matched the quote.",
      "Moved our office over a Sunday, we were working Monday morning.",
    ],
    attributes: [],
  },
  {
    name: "Tutors",
    slug: "tutors",
    description: "Home and online tutors for school subjects, music and exam coaching.",
    icon: "graduation-cap",
    uiTemplate: "tutor",
    priceRange: [300, 900],
    priceUnit: "per_hour",
    subcategories: ["Maths Tutor", "Science Tutor", "English Tutor", "Music Teacher", "Competitive Exam Coaching"],
    nameParts: {
      brands: ["Bright Minds", "Chatterjee", "Scholar", "Vidya", "Mentor", "Iyer", "Pathshala", "Gyan", "Excel", "Akshara"],
      nouns: ["Tutorials", "Learning Centre", "Academy", "Home Tuitions", "Classes", "Coaching"],
    },
    blurbs: [
      "Experienced tutors for CBSE, ICSE and state boards, classes 6 to 12. Weekly tests and progress updates for parents.",
      "One-to-one and small group coaching for JEE, NEET and olympiads, at home or online.",
      "Music lessons for guitar, keyboard and vocals, with graded exam preparation.",
    ],
    reviewSnippets: [
      "My son's maths score went from 62 to 88 in one term.",
      "Very patient teacher, explains concepts until they are clear.",
      "Flexible timings and regular feedback to parents.",
      "Online classes are well organised with notes shared after each session.",
    ],
    attributes: [
      { label: "Subject taught", appliesTo: "provider", fieldType: "multiselect", options: ["Maths", "Physics", "Chemistry", "Biology", "English", "Music"] },
      { label: "Class / grade", appliesTo: "lead", fieldType: "select", options: ["Primary", "6-8", "9-10", "11-12", "College", "Adult"] },
    ],
  },
  {
    name: "Beauty & Salon",
    slug: "beauty-salon",
    description: "Salon at home, grooming, bridal makeup and spa services.",
    icon: "scissors",
    uiTemplate: "default",
    priceRange: [399, 2499],
    priceUnit: "fixed",
    subcategories: ["Salon at Home (Women)", "Men's Grooming", "Bridal Makeup", "Spa & Massage"],
    nameParts: {
      brands: ["Glow", "Aura", "Blush", "Style", "Radiance", "Mehak", "Velvet", "Lush", "Bloom", "Grace"],
      nouns: ["Beauty Studio", "Salon at Home", "Makeovers", "Beauty Lounge", "Salon & Spa", "Grooming Studio"],
    },
    blurbs: [
      "Certified beauticians for waxing, facials, hair and nail care at home, using single-use, branded products.",
      "Bridal and party makeup artists with trial sessions. HD and airbrush makeup available.",
      "Men's haircut, beard styling and grooming at home or in our studio.",
    ],
    reviewSnippets: [
      "Very hygienic, used disposable kits for everything.",
      "My bridal makeup lasted all night and looked natural in photos.",
      "On time and very professional. Booking again next month.",
      "Great facial, skin felt fresh for days.",
    ],
    attributes: [],
  },
  {
    name: "Vehicle Repair",
    slug: "vehicle-repair",
    description: "Car and bike servicing, washing, tyres and AC repair.",
    icon: "car",
    uiTemplate: "default",
    priceRange: [299, 2999],
    priceUnit: "per_visit",
    subcategories: ["Car Service", "Bike Service", "Car Wash & Detailing", "Tyre & Puncture", "Car AC Repair"],
    nameParts: {
      brands: ["AutoCare", "Speedway", "Garage", "Motorz", "Wheels", "Bhatia", "TorqueUp", "DriveOn", "Pitstop", "RoadKing"],
      nouns: ["Auto Service", "Motors", "Car Care", "Garage", "Auto Works", "Bike Point"],
    },
    blurbs: [
      "Multi-brand car servicing with pick-up and drop. Periodic service, brake work, suspension and diagnostics.",
      "Bike servicing, engine work and roadside puncture repair. Genuine oils and parts with bill.",
      "Foam wash, interior detailing, ceramic coating and car AC gas refill.",
    ],
    reviewSnippets: [
      "Picked up the car in the morning and returned it serviced by evening.",
      "Fixed a puncture on the highway within 30 minutes of calling.",
      "Detailed my car inside out, looks showroom new.",
      "Honest mechanic, did not push unnecessary work.",
    ],
    attributes: [{ label: "Vehicle", appliesTo: "lead", fieldType: "select", options: ["Hatchback", "Sedan", "SUV", "Scooter", "Motorcycle"] }],
  },
];

export const FIRST_NAMES = [
  "Aarav", "Ananya", "Rohan", "Priya", "Vikram", "Sneha", "Arjun", "Kavya", "Rahul", "Ishita", "Sourav", "Meera",
  "Aditya", "Pooja", "Nikhil", "Riya", "Siddharth", "Tanvi", "Karan", "Neha", "Abhishek", "Shreya", "Debashish", "Payel",
  "Manish", "Anjali", "Suresh", "Divya", "Arnab", "Moumita", "Rajesh", "Swati", "Imran", "Fatima", "Joseph", "Maria",
];

export const LAST_NAMES = [
  "Sharma", "Das", "Iyer", "Gupta", "Banerjee", "Singh", "Reddy", "Chatterjee", "Mehta", "Nair", "Roy", "Kapoor",
  "Bose", "Patel", "Ghosh", "Rao", "Khan", "D'Souza", "Verma", "Mukherjee",
];

export const GENERIC_REVIEWS = [
  "Picked up the call immediately and arrived when promised.",
  "Reasonable charges and good quality work. Recommended.",
  "Polite and knowledgeable. Will call again.",
  "Good work overall, arrived a little late but called ahead to let me know.",
  "Clear communication and no hidden charges.",
  "Solved the problem on the first visit.",
];

export const PROVIDER_REPLIES = [
  "Thank you for trusting us. Happy to help any time.",
  "Thanks for the kind words! We look forward to serving you again.",
  "Thank you for your feedback. We have shared it with the team.",
];
