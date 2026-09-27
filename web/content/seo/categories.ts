import { SEO_CITY as CITY } from "@/lib/seo";
import type { ServiceSeo } from "../types";

/**
 * Search-focused copy for each category page, keyed by category slug. Keyword targets are in
 * docs/seo/keyword-map.md: "<service> near me" first, then "<service> in Siliguri". Prices are typical
 * ranges for the whole job and always say so; the provider quotes the real price.
 * A category added later in the admin console simply has no entry and the page uses generated text.
 */
export const CATEGORY_SEO: Record<string, ServiceSeo> = {
  "electronics-repair": {
    title: `TV, Mobile & Laptop Repair Near Me in ${CITY}`,
    description: `Find TV repair, mobile repair, laptop repair and CCTV technicians near you in ${CITY}. Compare ratings and prices, then call the technician directly.`,
    h1: `Electronics repair near you in ${CITY}`,
    intro: [
      `Looking for a TV repair shop or a mobile repair technician near you? DialNFind lists local electronics repair experts across ${CITY}, from LED and smart TV repair to phone screen replacement, laptop and computer repair, home theatre repair and CCTV installation. Every listing shows distance, ratings from real customers, opening hours and whether the business is verified.`,
      "Most repairs start with a diagnosis. Many technicians charge a small inspection fee, often adjusted against the final bill, and quote once they know the fault. A power board or software issue is usually quick and inexpensive; a cracked panel or a failed motherboard can cost a large share of the device price, so ask for the quote in writing and ask whether the replacement part is original or compatible.",
      "Call two or three nearby technicians, describe the brand, model and fault, and compare. You deal with the technician directly; DialNFind does not add booking fees or commission.",
    ],
    faqs: [
      { q: `How do I find a good TV repair technician near me in ${CITY}?`, a: "Search TV repair on DialNFind, sort by rating or distance, and read recent reviews. Prefer verified businesses that give a written quote and a warranty on replaced parts." },
      { q: "Is home service available for TV repair?", a: "Most TV technicians visit your home for diagnosis and small repairs. Panel or board work may be done at their workshop; ask how long it will take and whether pickup and drop are included." },
      { q: "How much does mobile screen replacement cost?", a: "It depends on the phone model and whether the screen is original or compatible. Budget phones often cost a few thousand rupees; flagship screens cost much more. Ask the shop for both options." },
      { q: "Will a local repair void my warranty?", a: "If your device is still under the manufacturer's warranty, use the authorised service centre first. Local repair is usually the better value once the warranty has ended." },
      { q: "Can I get CCTV cameras installed for my home or shop?", a: "Yes. CCTV installers on DialNFind supply and fit cameras, DVR or NVR recorders and mobile viewing. Ask how many cameras you need, the storage days and the warranty." },
    ],
  },
  "home-appliances": {
    title: `AC, Fridge & Washing Machine Repair in ${CITY}`,
    description: `AC repair and service, refrigerator, washing machine, RO purifier and geyser repair near you in ${CITY}. Compare local technicians and call directly.`,
    h1: `Home appliance repair near you in ${CITY}`,
    intro: [
      `When the AC stops cooling or the fridge stops working, you want an appliance repair technician nearby, fast. DialNFind lists local experts in ${CITY} for AC repair and servicing, refrigerator repair, washing machine repair, microwave repair, water purifier (RO) service and geyser repair, with ratings, distance and who is open right now.`,
      "Routine AC servicing is usually a fixed-price job, while repairs depend on the part: a capacitor or sensor is inexpensive, a compressor or gas top-up costs more. For a split AC, a standard service commonly costs a few hundred to around a thousand rupees, and gas refilling costs more. Ask what is included, whether gas is charged by pressure check, and how long the warranty on the repair lasts.",
      `Humidity and dust in ${CITY} are hard on ACs and RO filters, so servicing before summer and after the monsoon keeps bills and breakdowns down.`,
    ],
    faqs: [
      { q: "How often should I service my AC?", a: "At least once a year before summer, and twice a year if you run it daily or live in a dusty area. Clean the filters yourself every two to four weeks in peak season." },
      { q: "How much do AC service charges usually cost?", a: "A standard split AC service commonly costs a few hundred to about a thousand rupees; jet or deep cleaning and gas refilling cost more. Prices vary by technician, so compare two or three quotes." },
      { q: "My fridge is not cooling. Is it worth repairing?", a: "Often yes. Thermostats, relays, fans and gas leaks are common faults that cost far less than a new fridge. If the compressor has failed on an old fridge, compare the quote with the price of a new one." },
      { q: "How often should an RO water purifier be serviced?", a: "Most RO purifiers need a service every three to six months, with sediment and carbon filters changed every six to twelve months and the membrane every one to two years, depending on water quality." },
      { q: "Do technicians carry spare parts?", a: "Common parts such as capacitors, belts and filters usually yes. Model-specific parts may need a second visit. Ask whether parts are original or compatible and whether they carry a warranty." },
    ],
  },
  electricians: {
    title: `Electrician Near Me in ${CITY}: Verified Pros`,
    description: `Find a verified electrician near you in ${CITY} for wiring, fan and light fitting, inverters, switchboards and safety checks. Compare and call directly.`,
    h1: `Electricians near you in ${CITY}`,
    intro: [
      `Need an electrician near you today? DialNFind lists local electricians in ${CITY} for house wiring and rewiring, fan and light installation, inverter and battery work, switchboard and MCB repair, and electrical safety inspections. See ratings, distance, verification and who is open now, then call the electrician directly.`,
      "Small jobs such as fixing a switch, installing a ceiling fan or changing a socket are usually charged per job, with a visiting charge for the first visit. Wiring, rewiring and new points are quoted after an inspection. Ask whether wire, switches and MCBs are included, which brand will be used, and whether the electrician will test earthing.",
      "For anything beyond a simple swap, hire a trained electrician rather than doing it yourself. Old wiring, tripping MCBs, sparks or a burning smell are signs to call a professional straight away.",
    ],
    faqs: [
      { q: `How do I find a reliable electrician near me in ${CITY}?`, a: "Search Electricians on DialNFind, check ratings and recent reviews, and prefer verified listings. Describe the job on the call and ask for the visiting charge and an estimate before work starts." },
      { q: "How much does an electrician charge for small jobs?", a: "Small jobs like fixing a switch or installing a fan are usually a few hundred rupees plus parts. The visiting charge is often adjusted if you go ahead with the work." },
      { q: "When should I rewire my house?", a: "If the wiring is more than 20 to 25 years old, MCBs trip often, sockets feel warm, or you are adding ACs and heavy appliances, ask an electrician to inspect and advise on rewiring." },
      { q: "Can an electrician install an inverter and battery?", a: "Yes. Electricians who list Inverter & Battery can size, install and wire an inverter for the loads you want to run during power cuts." },
      { q: "Are emergency electricians available at night?", a: "Some electricians offer 24-hour service; use the Open now filter to see who is available. Night and holiday visits usually cost more." },
    ],
  },
  plumbing: {
    title: `Plumber Near Me in ${CITY}: Leaks, Taps & Drains`,
    description: `Find a plumber near you in ${CITY} for leak repair, bathroom fitting, drain unblocking, water tank cleaning and motor repair. Call local plumbers directly.`,
    h1: `Plumbers near you in ${CITY}`,
    intro: [
      `A leaking tap, blocked drain or overflowing tank needs a plumber nearby. DialNFind lists local plumbers in ${CITY} for leak repair, bathroom fitting, drain unblocking, water tank cleaning and motor and pump repair. Compare ratings, distance and opening hours, then call directly.`,
      "Most plumbers charge a small visiting fee plus a per-job price. Tap, washer and flush repairs are usually inexpensive; concealed pipe leaks, bathroom fitting and motor repair are quoted after inspection. Ask for labour and materials to be priced separately so you can compare quotes fairly.",
      "Shut the main valve before the plumber arrives if water is leaking, and keep a photo of the problem ready to share on WhatsApp so the plumber can bring the right parts.",
    ],
    faqs: [
      { q: `How do I find a plumber near me in ${CITY}?`, a: "Search Plumbing on DialNFind and sort by distance or rating. Use the Open now filter for urgent leaks, and call two plumbers to compare visiting charges." },
      { q: "How much does a plumber charge to fix a leaking tap?", a: "A tap or washer repair is usually a small per-job charge plus the part. Replacing the tap or fixing a concealed leak costs more; ask for an estimate before work starts." },
      { q: "How often should a water tank be cleaned?", a: "Clean overhead and underground tanks every three to six months, and after the monsoon. Professional cleaning includes draining, scrubbing, disinfecting and rinsing." },
      { q: "What should I do while waiting for a plumber?", a: "Turn off the main valve or the isolation valve under the sink, switch off the pump motor, and move valuables away from the water." },
      { q: "Can a plumber fix a water motor or pump?", a: "Plumbers listed under Motor & Pump Repair service and repair domestic water motors, pressure pumps and float switches." },
    ],
  },
  carpentry: {
    title: `Carpenter Near Me in ${CITY}: Furniture, Kitchens`,
    description: `Find a carpenter near you in ${CITY} for furniture repair, modular kitchens, doors, windows and custom furniture. Compare local carpenters and call directly.`,
    h1: `Carpenters near you in ${CITY}`,
    intro: [
      `From a wobbly chair to a full modular kitchen, DialNFind helps you find a carpenter near you in ${CITY}. Local carpenters list furniture repair, modular kitchen work, door and window repair and custom furniture, with ratings, distance and photos of past work where available.`,
      "Repairs and small fittings are usually charged per job or per day. New furniture and kitchens are quoted per running foot or per square foot, and the material matters as much as the labour: ask which ply or board grade, which laminate and which hardware brand is included.",
      "Share photos and rough measurements on WhatsApp first; a good carpenter will visit to measure before giving a final quote.",
    ],
    faqs: [
      { q: `How do I find a good carpenter near me in ${CITY}?`, a: "Search Carpentry on DialNFind, check photos of previous work and reviews, and ask for a written quote that lists the materials and hardware." },
      { q: "How do carpenters charge?", a: "Small repairs are per job, larger work is often per day, and new furniture or kitchens are per running foot or square foot including materials. Always compare like for like." },
      { q: "Which ply is best for kitchen cabinets?", a: "Boiling water proof (BWP) plywood is the usual choice under sinks and near water; moisture resistant (MR) ply is fine for dry areas. Ask your carpenter which grade they quote." },
      { q: "Can a carpenter fix a door that does not close?", a: "Yes. Sagging hinges, swollen wood after the monsoon and misaligned locks are common, quick fixes." },
      { q: "How long does a modular kitchen take?", a: "Depending on size and material, expect a few weeks from final measurement to installation. Ask for a timeline in writing." },
    ],
  },
  cleaning: {
    title: `Home Deep Cleaning Services Near Me in ${CITY}`,
    description: `Book home deep cleaning, sofa and carpet cleaning, bathroom and kitchen cleaning or office cleaning near you in ${CITY}. Compare cleaners, call directly.`,
    h1: `Cleaning services near you in ${CITY}`,
    intro: [
      `Moving in, moving out, before a festival or just overdue? DialNFind lists cleaning services near you in ${CITY} for full home deep cleaning, sofa and carpet shampooing, bathroom and kitchen deep cleaning and office cleaning. Compare ratings, prices and availability.`,
      "Deep cleaning is usually priced by home size (1, 2 or 3 BHK) or by room, and a 2 BHK often takes a team of two or three cleaners most of a day. Ask what is included: fans and lights, cabinets inside and out, windows and grills, balcony, and whether they bring their own machines and chemicals.",
      "Empty the kitchen shelves and wardrobes you want cleaned inside, and agree on the checklist before the team starts.",
    ],
    faqs: [
      { q: "How much does home deep cleaning cost?", a: "It depends on the size of the home and what is included. A 2 BHK deep clean commonly costs a few thousand rupees; sofa shampoo and other add-ons cost extra. Ask for a checklist with the quote." },
      { q: "How long does a full home deep cleaning take?", a: "A 1 BHK usually takes four to six hours and a 2 or 3 BHK most of a day with a team of two or three cleaners." },
      { q: "Do cleaners bring their own equipment?", a: "Most professional services bring vacuum cleaners, scrubbers and chemicals. Confirm this on the call, especially for sofa and carpet shampooing." },
      { q: "Are the cleaning chemicals safe for children and pets?", a: "Ask the service which products they use. Many offer mild or eco-friendly options; keep children and pets away until floors are dry." },
      { q: "Do you offer office cleaning?", a: "Yes. Search Office Cleaning for one-time deep cleans or regular contracts for shops and offices." },
    ],
  },
  "pest-control": {
    title: `Pest Control Near Me in ${CITY}: Termite & More`,
    description: `Find pest control services near you in ${CITY} for cockroaches, termites, bed bugs, mosquitoes and rodents. Compare certified providers and call directly.`,
    h1: `Pest control services near you in ${CITY}`,
    intro: [
      `Warm, humid weather in ${CITY} and North Bengal means cockroaches, termites, mosquitoes and bed bugs are a year-round problem, and worse around the monsoon. DialNFind lists pest control services near you for cockroach control, termite treatment, bed bug treatment, mosquito control and rodent control.`,
      "General pest control for a flat is usually a per-visit price, often with a follow-up visit included. Termite treatment is priced by area and method (drill-fill-seal for existing homes, soil treatment before construction) and should come with a written warranty. Ask which chemical is used, whether it is government approved, and how long to stay out of the home.",
      "Choose providers who inspect first and explain the treatment, rather than those who quote blind over the phone.",
    ],
    faqs: [
      { q: "How much does pest control cost for a flat?", a: "General pest control for cockroaches and ants is usually a per-visit charge that depends on the flat size. Termite and bed bug treatments cost more because they take longer and need follow-ups." },
      { q: "How often should I get pest control done?", a: "For cockroaches and ants, every three to six months. Termite treatment usually lasts several years; ask about the warranty and yearly inspections." },
      { q: "Is pest control safe for children and pets?", a: "Reputable providers use approved chemicals and gel baits. Keep children, pets and food away during treatment and follow the re-entry time they give you." },
      { q: "How do I know if I have termites?", a: "Mud tubes on walls, hollow-sounding wood, and small piles of wings near windows are common signs. Ask for a termite inspection before the monsoon." },
      { q: "Do I need to leave home during treatment?", a: "For gel treatments, usually not. For spray and termite treatment, most providers ask you to stay out for a few hours." },
    ],
  },
  painting: {
    title: `House Painters Near Me in ${CITY}`,
    description: `Find house painters near you in ${CITY} for interior and exterior painting, waterproofing, textures and wallpaper. Compare quotes and call painters directly.`,
    h1: `House painters near you in ${CITY}`,
    intro: [
      `Planning to repaint before a festival or fix damp walls after the monsoon? DialNFind lists house painters near you in ${CITY} for interior painting, exterior painting, waterproofing and texture or wallpaper work.`,
      "Painting is usually quoted per square foot of wall area, and the price depends on the paint brand and finish, how much putty and repair work the walls need, and whether it is a repaint or fresh painting. Labour is only part of the price; ask for the brand, product name and number of coats in writing.",
      `Damp patches and peeling paint are common in ${CITY}'s wet season, so fix leaks and waterproof first, then paint.`,
    ],
    faqs: [
      { q: "How much does house painting cost per sq ft?", a: "Repainting interiors typically costs less per square foot than fresh painting with putty, and exterior paint costs more. The brand and finish make a big difference, so compare quotes on the same product." },
      { q: "How long does it take to paint a 2 BHK?", a: "A 2 BHK repaint usually takes four to seven days, depending on putty work, drying time and the size of the team." },
      { q: "Should I waterproof before painting?", a: "Yes, if you see damp patches, seepage or peeling. Painting over dampness fails quickly; fix the leak and waterproof first." },
      { q: "Which paint finish should I choose?", a: "Matt hides wall flaws, satin or eggshell is easier to clean, and gloss or semi-gloss suits doors and grills. Your painter can show sample patches." },
      { q: "Do painters move furniture and cover floors?", a: "Most cover floors and furniture and move light items. Agree on this before work starts." },
    ],
  },
  "packers-movers": {
    title: `Packers and Movers Near Me in ${CITY}`,
    description: `Compare packers and movers near you in ${CITY} for local house shifting, intercity relocation, bike and car transport and office moves. Call movers directly.`,
    h1: `Packers and movers near you in ${CITY}`,
    intro: [
      `Shifting within ${CITY} or moving to another city? DialNFind lists local packers and movers for local house shifting, intercity relocation, vehicle transport and office relocation, with ratings and reviews from past customers.`,
      "Moving charges depend on how much you are moving, the distance, the floor and lift access, and the packing material. Local 1 or 2 BHK shifts are usually priced as a package; intercity moves add transport and toll costs. Insist on an in-person or video survey, a written quote with GST, and transit insurance for valuables.",
      "Be careful of quotes that are far lower than others; that is the most common sign of a moving scam. Check reviews and confirm the company's address before paying an advance.",
    ],
    faqs: [
      { q: `How much do packers and movers charge for local shifting in ${CITY}?`, a: "Local 1 or 2 BHK shifting is usually a few thousand to around fifteen thousand rupees depending on volume, floor, distance and packing. Get at least three written quotes after a survey." },
      { q: "How do I avoid packers and movers scams?", a: "Choose movers with genuine reviews and a physical address, get a written quote and inventory, avoid large advance payments, and never let the goods be loaded without a signed receipt." },
      { q: "Is transit insurance necessary?", a: "It is strongly recommended for intercity moves and valuable items. Ask what is covered and how claims work before you sign." },
      { q: "How early should I book movers?", a: "Book one to two weeks ahead, and earlier at month-end or during festival season when demand is high." },
      { q: "Can movers transport my bike or car?", a: "Yes. Search Vehicle Transport for carriers that move bikes and cars in closed or open trucks." },
    ],
  },
  tutors: {
    title: `Home Tutors Near Me in ${CITY}`,
    description: `Find home tutors near you in ${CITY} for maths, science and English, music lessons and competitive exam coaching. Compare tutors and call directly.`,
    h1: `Home tutors near you in ${CITY}`,
    intro: [
      `Looking for a home tutor near you? DialNFind lists tutors in ${CITY} for maths, science and English at every school level, music teachers, and coaching for competitive exams. See subjects, experience and ratings from parents and students.`,
      "Home tuition fees depend on the class, the subject, the board (CBSE, ICSE or state board), the tutor's experience, and how many days a week they come. Fees are usually charged per month; senior classes and exam coaching cost more. Ask for a trial class before committing.",
      "Agree on goals and a schedule at the start, and ask the tutor how they will share progress with you.",
    ],
    faqs: [
      { q: `How do I find a good home tutor near me in ${CITY}?`, a: "Search Tutors on DialNFind by subject, check experience and reviews, and ask for a trial class. A good tutor asks about your child's goals and current marks first." },
      { q: "How much does home tuition cost per month?", a: "Fees vary by class, subject, board and how many days a week. Primary classes cost less; classes 9 to 12 and exam coaching cost more. Compare two or three tutors." },
      { q: "Home tutor or coaching centre: which is better?", a: "A home tutor gives one-to-one attention and a flexible schedule; a coaching centre offers structure and peer competition. Many students use a tutor for weak subjects." },
      { q: "Do tutors offer online classes?", a: "Many do. Ask the tutor whether they teach online, and whether the fee differs." },
      { q: "What should I check before hiring a tutor?", a: "Subject knowledge, experience with your child's board and class, punctuality, and reviews from other parents. For younger children, meet the tutor in person first." },
    ],
  },
  "beauty-salon": {
    title: `Salon at Home & Bridal Makeup in ${CITY}`,
    description: `Find salon at home services, men's grooming, bridal makeup artists and spa services near you in ${CITY}. Compare ratings and call beauticians directly.`,
    h1: `Beauty and salon services near you in ${CITY}`,
    intro: [
      `DialNFind lists beauty and salon professionals near you in ${CITY}: salon at home services for women, men's grooming, bridal makeup artists and spa and massage. Compare ratings, services and prices, then call or WhatsApp directly.`,
      "At-home services are usually priced per service or as a package; bridal makeup is priced per look and depends on the artist's experience, the products used, and whether hair styling and draping are included. Ask to see a portfolio and which brands they use.",
      "For a wedding, book a trial session and confirm the date early; popular makeup artists are booked months ahead in the wedding season.",
    ],
    faqs: [
      { q: "Is salon at home safe and hygienic?", a: "Choose professionals with good reviews who use disposable or sanitised tools and sealed products. Ask about hygiene on the call." },
      { q: "How early should I book a bridal makeup artist?", a: "Book two to four months ahead for the wedding season, and schedule a trial a few weeks before the date." },
      { q: "What is included in bridal makeup?", a: "It usually includes base makeup and eye makeup, and often hair styling and saree or lehenga draping. Confirm what is included and whether travel is extra." },
      { q: "Do you have grooming services for men?", a: "Yes. Search Men's Grooming for haircuts, beard styling, facials and grooming at home or in the salon." },
      { q: "Are spa and massage services available at home?", a: "Some listings offer home visits; others work from their spa. Check the listing or ask on the call." },
    ],
  },
  "vehicle-repair": {
    title: `Car & Bike Service Near Me in ${CITY}`,
    description: `Find car service, bike service, car wash and detailing, tyre and puncture repair and car AC repair near you in ${CITY}. Compare garages and call directly.`,
    h1: `Car and bike repair near you in ${CITY}`,
    intro: [
      `Need a car service or a bike mechanic near you? DialNFind lists local garages and mechanics in ${CITY} for car servicing, bike servicing, car wash and detailing, tyre and puncture repair, and car AC repair.`,
      "A periodic service usually includes an engine oil and filter change, inspection of brakes, fluids and battery, and a wash. Multi-brand garages are usually cheaper than authorised service centres for the same work. Ask for an itemised estimate, keep the old parts, and approve any extra work before it is done.",
      "Pothole-heavy monsoon roads are hard on tyres, suspension and alignment, so a check-up after the rains is worth it.",
    ],
    faqs: [
      { q: "How much does a car service cost?", a: "A periodic service at a multi-brand garage usually costs a few thousand rupees for a hatchback and more for a sedan or SUV, plus parts. Authorised service centres usually charge more." },
      { q: "How often should I service my bike?", a: "Most bikes need a service every 3,000 to 5,000 km or every three to four months, whichever comes first. Check your owner's manual." },
      { q: "Will a local garage void my car warranty?", a: "While your car is under the manufacturer's warranty, follow the service schedule at an authorised centre. After that, a trusted multi-brand garage is usually good value." },
      { q: "Can I get a puncture fixed at home?", a: "Some tyre and puncture services offer roadside or doorstep help. Use the Open now filter and call to check." },
      { q: "Why is my car AC not cooling?", a: "Low gas, a clogged cabin filter, or a faulty compressor or condenser fan are common causes. A car AC specialist can check pressure and find leaks." },
    ],
  },
};
