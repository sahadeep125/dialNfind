import { SEO_CITY as CITY } from "@/lib/seo";
import type { ServiceSeo } from "../types";

/**
 * Search copy for the profession categories added for individual professionals (server/prisma/data/
 * categories.json): locksmiths, tailors, drivers, masons, welders, photographers, fitness and yoga
 * trainers and laundry. Merged into CATEGORY_SEO and SUBCATEGORY_SEO.
 */
const HIRE = "You call the professional directly; KaajVa adds no booking fee or commission.";

export const PROFESSION_CATEGORY_SEO: Record<string, ServiceSeo> = {
  locksmith: {
    title: `Locksmith Near Me in ${CITY}: Keys & Locks`,
    description: `Find a locksmith near you in ${CITY} for key duplication, lock repair and fitting, and help when you are locked out. Compare ratings and call directly.`,
    h1: `Locksmiths near you in ${CITY}`,
    intro: [
      `Locked out, lost a key or need a stronger lock on the door? KaajVa lists local locksmiths in ${CITY}, most of them independent professionals who come to you. Each listing shows ratings, distance and whether they are open now.`,
      "Key cutting is usually a small fixed charge per key. Lock fitting and repairs are quoted by the lock type, and emergency opening at night costs more. Ask for the price before the locksmith starts, and keep the receipt for a new lock.",
      HIRE,
    ],
    faqs: [
      { q: "Can a locksmith open my door without damaging it?", a: "Often yes. A trained locksmith picks or bypasses most common locks. High-security locks may need drilling, which means replacing the lock; ask before they start." },
      { q: "How much does a duplicate key cost?", a: "A normal house key is usually a small fixed charge. Computer keys, car keys and remote keys cost more and may need the original." },
      { q: "Will the locksmith ask for proof that it is my house?", a: "A good locksmith will ask for ID or proof of address before opening a door. That protects you too." },
    ],
  },
  tailoring: {
    title: `Tailors in ${CITY}: Stitching & Alterations`,
    description: `Find tailors near you in ${CITY} for blouse and dress stitching, men's tailoring and alterations. See ratings and prices, then call the tailor directly.`,
    h1: `Tailors near you in ${CITY}`,
    intro: [
      `Looking for a ladies tailor, a gents tailor or someone to take in a pair of trousers? KaajVa lists independent tailors and boutiques across ${CITY}, with ratings from real customers and the services they take on.`,
      "Stitching charges depend on the design, lining and work involved, and most tailors quote after seeing the fabric. Alterations are usually charged per piece. Ask for the delivery date in writing, especially in the wedding and festival season when tailors are busiest.",
      HIRE,
    ],
    faqs: [
      { q: "How long does a tailor take to stitch a blouse?", a: "Usually a few days to a week. Before weddings and Durga Puja it can take two weeks or more, so book early." },
      { q: "Do tailors take measurements at home?", a: "Some independent tailors visit for measurements and trials. Ask on the call; there may be a small visit charge." },
      { q: "Can a tailor copy a dress I already have?", a: "Yes. Bring the dress you want copied with your fabric and most tailors can match the fit and design." },
    ],
  },
  drivers: {
    title: `Hire a Driver in ${CITY}: Personal & Outstation`,
    description: `Hire a personal driver in ${CITY} for daily use, outstation trips to the hills or a driver on call for your own car. Compare drivers and call directly.`,
    h1: `Drivers for hire in ${CITY}`,
    intro: [
      `Need someone to drive your car for the day, a trip to Darjeeling or Gangtok, or every morning to the office? KaajVa lists independent drivers in ${CITY} with their experience, ratings and the kind of trips they take.`,
      "Drivers usually charge per day or per trip, with extra for night halts and outstation food and stay. Monthly drivers agree a salary and duty hours. Check the driving licence, ask about hill driving experience for mountain trips, and agree the hours and overtime before the trip.",
      HIRE,
    ],
    faqs: [
      { q: "How much does a driver charge per day?", a: "It depends on hours and distance. Ask for the day rate, the overtime rate and what happens with food and stay on outstation trips." },
      { q: "Can I hire a driver for a trip to the hills?", a: "Yes. Many drivers in Siliguri regularly drive to Darjeeling, Kalimpong, Gangtok and Mirik. Ask for someone with hill driving experience." },
      { q: "What should I check before hiring a driver?", a: "A valid driving licence, experience with your type of car, and reviews from other customers. For a monthly driver, keep a copy of their ID." },
    ],
  },
  masonry: {
    title: `Mason & Rajmistri Near Me in ${CITY}`,
    description: `Find a mason (rajmistri) near you in ${CITY} for brick and plaster work, tiling and flooring, and wall and floor repairs. Compare and call directly.`,
    h1: `Masons near you in ${CITY}`,
    intro: [
      `Need a wall built, a floor retiled or cracks in the plaster fixed? KaajVa lists masons (rajmistri) in ${CITY}, many of them independent professionals with their own helpers, along with ratings and the work they take on.`,
      "Small repairs are often charged per day of work; bigger jobs such as tiling or plastering are quoted per square foot. Agree on who buys cement, sand and tiles, how many days the job takes, and how the site will be left at the end.",
      HIRE,
    ],
    faqs: [
      { q: "How do masons charge for tiling?", a: "Most quote per square foot for labour, with materials bought separately. Ask whether skirting, cutting and grouting are included." },
      { q: "Can a mason fix damp or cracked walls?", a: "Hairline cracks and plaster repairs, yes. Damp from leaks needs the leak fixed first, which may need a plumber or waterproofing." },
      { q: "Do masons bring their own helpers?", a: "Usually. Ask how many people will come and whether the price is for the whole team." },
    ],
  },
  welding: {
    title: `Welder Near Me in ${CITY}: Gates & Grills`,
    description: `Find a welder near you in ${CITY} for gate and grill work, shutter repair and welding repairs at home or at their workshop. Compare welders and call directly.`,
    h1: `Welders and fabricators in ${CITY}`,
    intro: [
      `Broken gate hinge, a new window grill or a rolling shutter that will not move? KaajVa lists welders and fabricators in ${CITY}, from independent welders who come with a portable machine to workshops that make gates and grills to order.`,
      "Repairs are usually charged per job. New gates, grills and railings are quoted by weight or by square foot, plus paint. Ask for the steel thickness, the primer and paint used, and the fitting charge.",
      HIRE,
    ],
    faqs: [
      { q: "Can a welder repair a gate at my house?", a: "Yes. Most welders bring a portable machine for repairs on site. Bigger work is made at the workshop and fitted later." },
      { q: "How are new grills priced?", a: "By weight of steel or by square foot, depending on the design. Ask for the thickness of the bars and whether painting is included." },
      { q: "Do welders repair rolling shutters?", a: "Many do: springs, guides, locks and bent slats. A motorised shutter may need a specialist." },
    ],
  },
  photography: {
    title: `Photographer in ${CITY}: Weddings & Events`,
    description: `Find photographers in ${CITY} for weddings, events, portraits and product shoots. See their ratings and photos, compare packages and call the photographer.`,
    h1: `Photographers in ${CITY}`,
    intro: [
      `Planning a wedding, a birthday or a shop opening, or need product photos for your business? KaajVa lists photographers in ${CITY}, from independent photographers to studios with full wedding teams.`,
      "Photographers price by the day or by the event, and wedding packages usually include an album, edited photos and sometimes video. Look at full sets of their past work, not only the best shots, and agree on the number of edited photos and the delivery date.",
      HIRE,
    ],
    faqs: [
      { q: "How early should I book a wedding photographer?", a: "For the wedding season, two to four months ahead. Good photographers get booked early for popular dates." },
      { q: "Do I get the raw photos?", a: "It depends on the photographer. Ask whether you get all photos or only edited ones, and in what format." },
      { q: "Can I hire a photographer for product photos?", a: "Yes. Many photographers shoot products for shops and online sellers, at their studio or at your shop." },
    ],
  },
  "fitness-yoga": {
    title: `Yoga Instructor & Fitness Trainer in ${CITY}`,
    description: `Find yoga instructors, personal fitness trainers and Zumba classes near you in ${CITY}, at home, in the park or online. Compare trainers and call directly.`,
    h1: `Yoga instructors and fitness trainers in ${CITY}`,
    intro: [
      `Want to start yoga, lose weight or get stronger with someone guiding you? KaajVa lists independent yoga instructors and personal trainers in ${CITY} who teach at home, in groups or online.`,
      "Trainers usually charge per session or per month, with group classes cheaper than one to one. Ask about their certification, what a first session looks like, and whether they adapt the routine for health conditions or injuries.",
      HIRE,
    ],
    faqs: [
      { q: "Do yoga instructors come home?", a: "Many do, in the morning or evening. Home sessions cost more than group classes." },
      { q: "Should I see a doctor before starting?", a: "If you have a heart condition, high blood pressure, an injury or are pregnant, check with your doctor and tell the trainer." },
      { q: "How many sessions a week do I need?", a: "Three sessions a week is a common start. Your trainer will suggest a plan for your goal." },
    ],
  },
  laundry: {
    title: `Laundry & Dry Cleaning Near Me in ${CITY}`,
    description: `Find laundry, ironing and dry cleaning services near you in ${CITY}, many with pickup and drop. Compare prices per piece or per kilo and call directly.`,
    h1: `Laundry, ironing and dry cleaning in ${CITY}`,
    intro: [
      `Short on time for washing and ironing? KaajVa lists laundry professionals and dry cleaners in ${CITY}, from the local istriwala to services that pick up and drop at your door.`,
      "Washing is usually priced per kilo and ironing per piece; dry cleaning is per item and depends on the fabric. Ask about delivery time, how stains are handled, and what happens if a garment is damaged.",
      HIRE,
    ],
    faqs: [
      { q: "Do laundry services pick up and drop?", a: "Many do, often free above a minimum order. Ask on the call." },
      { q: "How long does dry cleaning take?", a: "Usually two to four days. Heavy or delicate items such as lehengas and blankets can take longer." },
      { q: "Is ironing charged per piece?", a: "Yes, usually per piece, with sarees and heavy items costing a little more." },
    ],
  },
};

type Sub = [slug: string, title: string, description: string, h1: string, intro: string, faqs: [string, string][]];

const SUBS: Sub[] = [
  ["key-duplication", `Key Duplication Near Me in ${CITY}`, `Get duplicate keys cut near you in ${CITY}: house, padlock, almirah and some car keys. Find local key makers and locksmiths and call them directly.`, `Key makers in ${CITY}`, "Most house and padlock keys can be copied in a few minutes while you wait. Bring the original key; car and computer keys may need more time and the vehicle papers.", [["Can a key be made without the original?", "Often yes, by opening the lock. It costs more than copying a key."], ["How long does key cutting take?", "A few minutes for normal keys."], ["Can car keys be duplicated locally?", "Many locksmiths copy plain car keys. Remote and chip keys need special tools; ask first."]]],
  ["lock-repair-and-installation", `Lock Repair & Fitting in ${CITY}`, `Find locksmiths in ${CITY} to repair jammed locks, fit new door locks, digital locks and almirah locks. Compare local locksmiths, then call directly.`, `Lock repair and fitting in ${CITY}`, "A jammed or loose lock can usually be repaired on the spot. For new locks, ask the locksmith to suggest a brand and type for the door, and whether fitting is included.", [["Can a locksmith fit a digital lock?", "Many can. Check the door thickness and the lock's batteries and backup key."], ["Should I repair or replace an old lock?", "If the key turns hard or the lock is worn, replacing it is often safer and not much more expensive."], ["Do locksmiths change locks after moving house?", "Yes, and it is a good idea when you move into a rented or bought home."]]],
  ["emergency-lock-opening", `Locked Out? Emergency Locksmith in ${CITY}`, `Locked out of your house, room or almirah in ${CITY}? Find a locksmith near you who opens locks quickly, day or night. See who is open now and call.`, `Emergency lock opening in ${CITY}`, "Use the Open now filter to find someone available right away. Expect to show ID or proof that it is your home, and agree the price before the locksmith starts.", [["How fast can a locksmith reach me?", "Often within an hour inside the city, depending on distance and time of day."], ["Is night service more expensive?", "Usually, yes. Ask for the price on the call."], ["Will opening the lock damage it?", "Most common locks open without damage; high-security locks may need replacing."]]],
  ["blouse-and-dress-stitching", `Blouse & Dress Stitching in ${CITY}`, `Find ladies tailors in ${CITY} for blouse stitching, salwar suits, kurtis and dresses. Compare tailors by ratings and call to book a measurement.`, `Blouse and dress stitching in ${CITY}`, "Bring the fabric, a well-fitting sample if you have one, and pictures of the design. Ask for a trial before the final stitching for wedding outfits.", [["How much does blouse stitching cost?", "It depends on the design, lining, padding and work. Simple blouses cost less than designer ones."], ["Can I get a trial fitting?", "Most tailors offer one for wedding and party outfits."], ["Do tailors provide lining and buttons?", "Many do and add it to the bill. Ask before they start."]]],
  ["mens-tailoring", `Gents Tailor Near Me in ${CITY}`, `Find gents tailors in ${CITY} for shirts, trousers, kurtas, suits and sherwanis. Compare ratings and stitching charges, then call the tailor directly.`, `Gents tailors in ${CITY}`, "For suits and sherwanis, book early and plan for one or two trials. Shirts and trousers are usually ready within a week.", [["How long does a suit take?", "Usually one to three weeks with trials."], ["Can a tailor stitch from my old shirt's size?", "Yes, bring a shirt that fits well."], ["Do gents tailors do alterations?", "Yes, most also shorten and take in clothes."]]],
  ["clothing-alterations", `Clothes Alteration Near Me in ${CITY}`, `Get clothes altered near you in ${CITY}: trousers shortened, dresses taken in, zips and hems fixed. Find local tailors and call them directly.`, `Clothes alterations in ${CITY}`, "Most alterations are charged per piece and done in a day or two. Wear the shoes you will use with trousers or a dress when the tailor marks the length.", [["How much do alterations cost?", "Small jobs like hemming cost little; taking in a lined dress costs more."], ["Can jeans be shortened keeping the original hem?", "Many tailors can do it. Ask for the original hem finish."], ["How long do alterations take?", "Usually one or two days, longer in the festival season."]]],
  ["personal-driver", `Personal Driver for Hire in ${CITY}`, `Hire a personal driver in ${CITY} for daily office runs, family outings or a monthly arrangement in your own car. Compare drivers and call directly.`, `Personal drivers in ${CITY}`, "Agree the duty hours, weekly off, overtime and salary up front. Keep a copy of the driver's licence and ID.", [["How much is a monthly driver?", "It depends on hours and duties. Ask several drivers and agree overtime in advance."], ["Can I hire a driver for a few hours?", "Many drivers take hourly or half-day work."], ["Who pays for fuel?", "The car owner, usually. Agree this before the first trip."]]],
  ["outstation-driver", `Outstation Driver from ${CITY} to the Hills`, `Hire an experienced driver in ${CITY} for outstation trips to Darjeeling, Gangtok, Kalimpong and beyond in your own car. Compare and call directly.`, `Outstation drivers in ${CITY}`, "Choose a driver with hill driving experience for mountain roads. Agree the day rate, night halt charges and who covers food and stay.", [["Do outstation drivers charge for the return trip?", "Usually yes, by the day. Ask how days are counted."], ["Can a driver take my car to Sikkim?", "Yes, with the right permits for your car. Ask the driver what is needed."], ["What is a night halt charge?", "A fixed amount for each night the driver stays away from home on your trip."]]],
  ["driver-on-call", `Driver on Call in ${CITY}`, `Need a driver for a few hours or tonight in ${CITY}? Find drivers on call who drive your own car to events, the airport or back home. Call directly.`, `Drivers on call in ${CITY}`, "A driver on call is useful for weddings, late nights or airport runs to Bagdogra. Check who is open now and agree the hourly or trip price.", [["Can I book a driver for tonight?", "Use the Open now filter and call a few drivers."], ["How are on-call drivers charged?", "Per hour or per trip, with a minimum charge."], ["Will the driver come to my home?", "Yes, they come to you and drive your car."]]],
  ["brick-and-plaster-work", `Brick & Plaster Work in ${CITY}`, `Find masons in ${CITY} for brick walls, boundary walls, plastering and small construction work. Compare local rajmistri and call them directly.`, `Brick and plaster work in ${CITY}`, "Agree whether the price is per day or per square foot, who supplies materials, and how long curing will take before painting.", [["How long should plaster cure before painting?", "Usually a few weeks; the mason will advise for the weather."], ["Can a mason build a boundary wall?", "Yes. Ask about the foundation depth and wall thickness."], ["Who buys cement and sand?", "Either; agree before the work starts."]]],
  ["tiling-and-flooring", `Tile Fitting & Flooring in ${CITY}`, `Find tile fitters and masons in ${CITY} for floor and wall tiles, bathroom tiling and flooring repairs. Compare per square foot rates and call directly.`, `Tile fitting in ${CITY}`, "Most tilers charge labour per square foot. Buy around ten percent extra tiles for cuts and breakage, and ask about the adhesive and grout used.", [["Is tiling charged per square foot?", "Yes, usually for labour, with materials separate."], ["Can new tiles go over old ones?", "Sometimes. The mason will check the old floor is level and firm."], ["How long does a bathroom retile take?", "Usually a few days including drying time."]]],
  ["wall-and-floor-repairs", `Wall & Floor Repairs in ${CITY}`, `Fix cracks, broken tiles, damaged plaster and uneven floors in ${CITY}. Find local masons for small repair jobs and call them directly.`, `Wall and floor repairs in ${CITY}`, "Small repairs are often done in a day. For cracks that keep coming back or damp patches, ask the mason to find the cause first.", [["Do masons take small jobs?", "Many independent masons do, often with a minimum charge."], ["Are wall cracks dangerous?", "Hairline cracks are common. Wide or growing cracks need a closer look by an engineer."], ["Can a mason fix a broken floor tile?", "Yes, if a matching tile can be found."]]],
  ["gate-and-grill-work", `Gate & Grill Fabrication in ${CITY}`, `Get new gates, window grills, railings and staircase work made in ${CITY}. Find welders and fabricators near you and compare quotes.`, `Gate and grill work in ${CITY}`, "Ask for the steel section and thickness, the design drawing and the price per kilo or square foot, plus painting and fitting.", [["How long does a new gate take?", "Usually a week or two, depending on the design."], ["Is the price by weight?", "Often yes. Ask for an estimate of the total weight."], ["Is painting included?", "Ask. Primer and two coats of paint protect the steel from rust."]]],
  ["shutter-repair", `Rolling Shutter Repair in ${CITY}`, `Find welders and technicians in ${CITY} to repair rolling shutters: springs, guides, locks and bent slats. Compare and call for a quick repair.`, `Rolling shutter repair in ${CITY}`, "A stuck shutter is usually a spring or guide problem. Most repairs are done on site in a few hours.", [["Why is my shutter hard to lift?", "Usually a weak spring or dirt in the guides."], ["Can a motorised shutter be repaired?", "Yes, by a technician who knows the motor brand."], ["Is a new shutter spring expensive?", "Less than a new shutter. Ask for the price on the call."]]],
  ["welding-repairs", `Welding Repairs at Home in ${CITY}`, `Find welders in ${CITY} who come to your home or shop to repair gates, hinges, railings, furniture frames and metal fittings. Call directly.`, `Welding repairs in ${CITY}`, "Most welders bring a portable machine. Make sure there is a power point nearby and agree a price for the job before work starts.", [["Do welders come to my home?", "Most do for repairs."], ["Can a welder fix a broken chair frame?", "Yes, metal furniture frames are common jobs."], ["Is there a minimum charge?", "Usually a visiting or minimum charge applies."]]],
  ["wedding-photography", `Wedding Photographer in ${CITY}`, `Find wedding photographers in ${CITY} for candid and traditional photos, albums and videos. Compare packages and ratings and call the photographer.`, `Wedding photographers in ${CITY}`, "Ask for complete wedding albums they have shot, not just highlights. Agree the hours, number of edited photos, album and video in writing.", [["What is in a wedding package?", "Usually photos, an album and sometimes video and drone shots. Ask for a written list."], ["How long until I get the photos?", "Often a few weeks for edited photos and longer for albums."], ["Do photographers travel for weddings?", "Many do, with travel and stay added."]]],
  ["event-photography", `Event Photographer in ${CITY}`, `Hire a photographer in ${CITY} for birthdays, anniversaries, pujas, corporate events and shop openings. Compare photographers and call directly.`, `Event photographers in ${CITY}`, "For short events, ask for an hourly rate and how soon you will get the edited photos.", [["Can I hire a photographer for two hours?", "Many photographers take short events with a minimum charge."], ["Do I get soft copies?", "Usually yes, by drive link or pen drive."], ["Can they shoot video too?", "Some can, or bring a videographer."]]],
  ["portrait-and-product-shoots", `Portrait & Product Photography in ${CITY}`, `Find photographers in ${CITY} for portraits, family photos and product photography for shops and online sellers. Compare and call directly.`, `Portrait and product shoots in ${CITY}`, "For product shoots, tell the photographer how many products and where the photos will be used. For portraits, ask about location and outfit changes.", [["How are product photos priced?", "Per product or per photo, sometimes with a minimum."], ["Do photographers have a studio?", "Some do; others shoot at your place."], ["Can I get photos for my online shop?", "Yes, ask for white background photos sized for the marketplace."]]],
  ["yoga-classes", `Yoga Classes & Instructor at Home in ${CITY}`, `Find yoga instructors in ${CITY} for home sessions, group classes and online yoga, for beginners, weight loss and back pain. Compare and call directly.`, `Yoga instructors in ${CITY}`, "Tell the instructor your goal and any health issues. Morning slots fill up first, so book early.", [["Is yoga at home expensive?", "One-to-one home sessions cost more than group classes."], ["Can beginners join?", "Yes, ask for a beginners' plan."], ["Do instructors teach online?", "Many do over video calls."]]],
  ["personal-training", `Personal Fitness Trainer in ${CITY}`, `Hire a personal fitness trainer in ${CITY} for weight loss, strength and fitness at home or at the gym. Compare trainers by ratings and call directly.`, `Personal trainers in ${CITY}`, "A good trainer checks your fitness first and builds a plan. Ask about their certification and how they track progress.", [["How much does a personal trainer cost?", "Per session or per month, depending on how often you train."], ["Can a trainer come home?", "Many do and bring basic equipment."], ["Do trainers help with diet?", "Many give general advice; for medical diets see a dietitian."]]],
  ["zumba-and-dance-fitness", `Zumba & Dance Fitness Classes in ${CITY}`, `Find Zumba and dance fitness instructors in ${CITY} for group classes, home sessions and events. Compare instructors and call directly.`, `Zumba and dance fitness in ${CITY}`, "Zumba is a fun way to get fit in a group. Ask about the batch timings and whether a trial class is free.", [["Is Zumba good for weight loss?", "It is a good cardio workout when done regularly with a sensible diet."], ["Do I need to know dancing?", "No, instructors teach the steps."], ["Is there a trial class?", "Many instructors offer one."]]],
  ["wash-and-iron", `Wash & Iron Laundry Service in ${CITY}`, `Find wash and iron laundry services in ${CITY} priced per kilo or per piece, many with pickup and drop. Compare local laundries and call directly.`, `Wash and iron in ${CITY}`, "Ask whether washing is per kilo, how whites are kept separate and when the clothes come back.", [["Is laundry priced per kilo?", "Washing usually is; ironing is per piece."], ["Do they separate whites and colours?", "Ask, and mark anything that bleeds colour."], ["Is pickup free?", "Often above a minimum order."]]],
  ["ironing", `Ironing Service (Istri) Near Me in ${CITY}`, `Find ironing services and istriwalas near you in ${CITY}, priced per piece, with pickup from your home in many areas. Call directly.`, `Ironing services in ${CITY}`, "Most ironing is charged per piece and back the same or next day. Count the pieces when you hand them over.", [["How much is ironing per piece?", "A small amount per piece, more for sarees and heavy items."], ["Can I get clothes back the same day?", "Often yes if handed in early."], ["Do they collect from home?", "Many local istriwalas do."]]],
  ["dry-cleaning", `Dry Cleaning Near Me in ${CITY}`, `Find dry cleaners in ${CITY} for suits, sarees, lehengas, blankets and curtains. Compare prices per item and delivery time, then call directly.`, `Dry cleaning in ${CITY}`, "Point out stains when you hand over the garment and ask whether the fabric needs special care.", [["How long does dry cleaning take?", "Usually two to four days."], ["Can all stains be removed?", "Not always. Old or set stains may only fade."], ["Can blankets and curtains be dry cleaned?", "Yes, they are charged by size or weight."]]],
];

export const PROFESSION_SUBCATEGORY_SEO: Record<string, ServiceSeo> = Object.fromEntries(
  SUBS.map(([slug, title, description, h1, intro, faqs]) => [
    slug,
    { title, description, h1, intro: [intro, HIRE], faqs: faqs.map(([q, a]) => ({ q, a })) },
  ]),
);
