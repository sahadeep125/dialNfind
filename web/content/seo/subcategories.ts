import { SEO_CITY as CITY } from "@/lib/seo";
import type { ServiceSeo } from "../types";

/**
 * Search-focused copy for each subcategory page (/services/<category>/<sub>), keyed by subcategory slug.
 * Slugs follow the server's slugify: "AC Repair & Service" becomes "ac-repair-and-service".
 */
export const SUBCATEGORY_SEO: Record<string, ServiceSeo> = {
  // Electronics repair ---------------------------------------------------------------------------
  "tv-repair": {
    title: `TV Repair Near Me in ${CITY}: LED & Smart TV`,
    description: `Find LED, LCD and smart TV repair technicians near you in ${CITY}. Home visits for no picture, no sound, lines on screen and power faults. Call directly.`,
    h1: `TV repair near you in ${CITY}`,
    intro: [
      `No picture, lines on the screen, no sound, or a TV that will not turn on? Find a TV repair technician near you in ${CITY} for LED, LCD, smart and Android TVs of every major brand.`,
      "Power supply boards, backlights and software faults are the most common repairs. A cracked or badly damaged panel is the most expensive part, so ask for a quote before agreeing, and compare it with the price of a new TV.",
    ],
    faqs: [
      { q: "Do TV repair technicians come home?", a: "Most do for diagnosis and board-level repairs. Panel and backlight work may be done at the workshop." },
      { q: "Is it worth repairing an LED TV with a broken screen?", a: "A screen (panel) replacement can cost a large part of a new TV's price. For older or smaller TVs, replacing the TV is often better value." },
      { q: "Why does my TV have sound but no picture?", a: "A failed backlight is the most common cause, followed by the T-con or main board. A technician can tell with a quick torch test." },
    ],
  },
  "mobile-phone-repair": {
    title: `Mobile Repair Shop Near Me in ${CITY}`,
    description: `Find mobile phone repair shops near you in ${CITY} for screen and battery replacement, charging port, water damage and software issues. Compare and call.`,
    h1: `Mobile phone repair near you in ${CITY}`,
    intro: [
      `Cracked screen, weak battery or a phone that will not charge? Find a mobile repair shop near you in ${CITY} for Android phones and iPhones.`,
      "Ask whether the replacement screen or battery is original or compatible, how long the repair takes, and what warranty you get. Back up your phone and remove the SIM and memory card before handing it over.",
    ],
    faqs: [
      { q: "How long does a screen replacement take?", a: "Often under an hour if the part is in stock. Less common models may need a day or two to source the part." },
      { q: "Can a water-damaged phone be repaired?", a: "Often, if you switch it off straight away and take it to a technician quickly. Do not charge it or put it in rice." },
      { q: "Will my data be safe?", a: "Most repairs do not touch your data, but back up first and ask the shop whether the repair needs a reset." },
    ],
  },
  "laptop-and-computer-repair": {
    title: `Laptop & Computer Repair Near Me in ${CITY}`,
    description: `Find laptop and computer repair near you in ${CITY}: screen, keyboard, battery, motherboard, SSD upgrades, virus removal and data recovery. Call directly.`,
    h1: `Laptop and computer repair near you in ${CITY}`,
    intro: [
      `Find laptop and desktop repair technicians near you in ${CITY} for screen and keyboard replacement, battery and charger issues, motherboard repair, overheating, SSD and RAM upgrades, virus removal and data recovery.`,
      "A slow laptop often only needs an SSD upgrade and a clean install, which costs far less than a new machine. For motherboard faults, ask for a diagnosis and quote first.",
    ],
    faqs: [
      { q: "Should I upgrade to an SSD?", a: "Yes, if your laptop still has a hard disk. An SSD makes start-up and apps much faster for a modest cost." },
      { q: "Can you recover data from a dead laptop?", a: "Usually, if the drive itself is healthy. Tell the technician the data matters before any repair or reinstall." },
      { q: "Why does my laptop overheat?", a: "Dust in the fan and dried thermal paste are the usual causes. A cleaning service fixes most cases." },
    ],
  },
  "home-theatre-and-audio-repair": {
    title: `Home Theatre & Speaker Repair in ${CITY}`,
    description: `Find home theatre, soundbar, amplifier and speaker repair technicians near you in ${CITY}. Fix no sound, distortion, Bluetooth and power faults.`,
    h1: `Home theatre and audio repair near you in ${CITY}`,
    intro: [
      `Home theatre with no sound, a crackling speaker, or a soundbar that will not pair? Find audio repair technicians near you in ${CITY} for home theatres, soundbars, amplifiers, woofers and speakers.`,
      "Power supply faults, blown speaker cones and amplifier boards are common repairs. Bring the remote and cables, or describe the setup on the call.",
    ],
    faqs: [
      { q: "Can a blown speaker be repaired?", a: "Often yes, by re-coning or replacing the driver. The technician will compare the cost with a replacement speaker." },
      { q: "Why does my soundbar not connect to the TV?", a: "Check the HDMI ARC or optical setting on the TV first. If it still fails, the HDMI board may need repair." },
      { q: "Do you repair old amplifiers?", a: "Many technicians repair older amplifiers and receivers; ask whether parts are available for your model." },
    ],
  },
  "cctv-installation": {
    title: `CCTV Camera Installation Near Me in ${CITY}`,
    description: `Find CCTV camera installers near you in ${CITY} for homes, shops and offices. IP and HD cameras, DVR/NVR setup, mobile viewing and maintenance.`,
    h1: `CCTV installation near you in ${CITY}`,
    intro: [
      `Find CCTV installers near you in ${CITY} to supply and fit HD or IP cameras for your home, shop or office, with DVR or NVR recording and live view on your phone.`,
      "Decide how many areas you want to cover, whether you need night vision or audio, and how many days of recording to keep. Ask for the camera brand, resolution, hard disk size and warranty in the quote.",
    ],
    faqs: [
      { q: "How many CCTV cameras does a home need?", a: "Most homes start with two to four: the main door, the gate or parking, and the back entrance. An installer can suggest placement on a site visit." },
      { q: "Can I watch CCTV on my phone?", a: "Yes. Most DVR, NVR and Wi-Fi cameras have a mobile app; the installer will set it up for you." },
      { q: "IP or HD analogue cameras: which is better?", a: "IP cameras give sharper images and more features; HD analogue systems are cheaper and simpler. Both work well for most homes and shops." },
    ],
  },

  // Home appliances ------------------------------------------------------------------------------
  "ac-repair-and-service": {
    title: `AC Repair & Service Near Me in ${CITY}`,
    description: `Find AC repair and service technicians near you in ${CITY} for split and window ACs: servicing, gas refilling, installation and cooling faults. Call directly.`,
    h1: `AC repair and service near you in ${CITY}`,
    intro: [
      `AC not cooling, leaking water or making noise? Find AC repair and service technicians near you in ${CITY} for split and window ACs, inverter ACs, gas refilling, installation and uninstallation.`,
      "A regular service includes filter and coil cleaning, drain clearing and a gas pressure check. If the AC needs gas, ask the technician to show the pressure reading and to find and fix the leak rather than only topping it up.",
    ],
    faqs: [
      { q: "How much does AC servicing cost?", a: "A standard split AC service commonly costs a few hundred to about a thousand rupees; jet cleaning and gas refilling cost more. Compare two or three technicians." },
      { q: "Why is my AC running but not cooling?", a: "Dirty filters, low gas, a failed capacitor or a blocked outdoor unit are the most common causes." },
      { q: "Do you install and uninstall ACs?", a: "Yes. Many technicians install new ACs and uninstall and reinstall them when you move house." },
    ],
  },
  "refrigerator-repair": {
    title: `Fridge Repair Near Me in ${CITY}`,
    description: `Find refrigerator repair technicians near you in ${CITY} for single and double door fridges: not cooling, gas refilling, compressor and thermostat faults.`,
    h1: `Refrigerator repair near you in ${CITY}`,
    intro: [
      `Fridge not cooling, freezing too much, leaking water or noisy? Find refrigerator repair technicians near you in ${CITY} for single door, double door, frost-free and side-by-side fridges.`,
      "Thermostats, relays, fans and door gaskets are quick, inexpensive fixes. Gas refilling and compressor replacement cost more, so ask for a quote and whether the repair has a warranty.",
    ],
    faqs: [
      { q: "Why is my fridge not cooling?", a: "Dirty condenser coils, a faulty thermostat or fan, a gas leak or a failing compressor. A technician can diagnose it on a home visit." },
      { q: "How much does fridge gas refilling cost?", a: "It depends on the gas type and whether a leak must be fixed first. Ask the technician to find the leak before refilling." },
      { q: "Is a compressor replacement worth it?", a: "On a newer fridge, often yes. On an old one, compare the quote with the price of a new fridge." },
    ],
  },
  "washing-machine-repair": {
    title: `Washing Machine Repair Near Me in ${CITY}`,
    description: `Find washing machine repair near you in ${CITY} for front load, top load and semi-automatic machines: not spinning, not draining, noise and error codes.`,
    h1: `Washing machine repair near you in ${CITY}`,
    intro: [
      `Washing machine not spinning, not draining, leaking or showing an error code? Find washing machine repair technicians near you in ${CITY} for front load, top load and semi-automatic machines.`,
      "Drain pumps, belts, door locks and inlet valves are common repairs. Share the brand, model and error code on the call so the technician can bring the likely part.",
    ],
    faqs: [
      { q: "Why is my washing machine not draining?", a: "A blocked filter or drain hose is the usual cause, followed by a failed drain pump." },
      { q: "What does an error code on my washing machine mean?", a: "Error codes point to a specific fault such as door lock, drain or heater. Tell the technician the code when you call." },
      { q: "Why does my machine shake so much when spinning?", a: "An uneven load, unlevel floor, or worn shock absorbers or bearings. A technician can check the suspension." },
    ],
  },
  "microwave-repair": {
    title: `Microwave Oven Repair Near Me in ${CITY}`,
    description: `Find microwave oven repair near you in ${CITY} for solo, grill and convection microwaves: not heating, sparking, turntable and keypad faults.`,
    h1: `Microwave repair near you in ${CITY}`,
    intro: [
      `Microwave running but not heating, sparking inside, or keypad not working? Find microwave oven repair technicians near you in ${CITY} for solo, grill and convection models.`,
      "Magnetrons, fuses, door switches and keypads are common repairs. Microwaves store high voltage even when unplugged, so never open one yourself.",
    ],
    faqs: [
      { q: "Why is my microwave not heating?", a: "A failed magnetron, high-voltage diode or capacitor, or a door switch fault. These need a trained technician." },
      { q: "Why does my microwave spark?", a: "Metal inside, a damaged waveguide cover or food buildup. Stop using it and have it checked." },
      { q: "Is it worth repairing a microwave?", a: "Door switches and fuses are cheap to fix. If the magnetron fails on an old basic model, a new microwave may be better value." },
    ],
  },
  "water-purifier-service": {
    title: `RO Water Purifier Service Near Me in ${CITY}`,
    description: `Find RO water purifier service near you in ${CITY}: filter and membrane change, installation, leaks and low water flow for all RO, UV and UF purifiers.`,
    h1: `Water purifier service near you in ${CITY}`,
    intro: [
      `Find RO service technicians near you in ${CITY} for filter and membrane replacement, installation, leaks, low flow and bad-tasting water in RO, UV and UF purifiers of all brands.`,
      "Sediment and carbon filters usually need changing every six to twelve months and the RO membrane every one to two years, depending on your water. Ask which parts are being changed and whether they are original.",
    ],
    faqs: [
      { q: "How often should an RO purifier be serviced?", a: "Every three to six months for a check, with filters changed every six to twelve months depending on water quality and use." },
      { q: "Why is my RO giving less water?", a: "Clogged pre-filters or membrane, low input pressure, or a pump fault. A service usually fixes it." },
      { q: "Is an annual maintenance plan worth it?", a: "If you use the purifier daily, an AMC that includes filters is often cheaper than paying for each service." },
    ],
  },
  "geyser-repair": {
    title: `Geyser Repair Near Me in ${CITY}`,
    description: `Find geyser and water heater repair near you in ${CITY}: not heating, leaking, tripping MCB, thermostat and element replacement, and installation.`,
    h1: `Geyser repair near you in ${CITY}`,
    intro: [
      `Geyser not heating, leaking or tripping the MCB? Find geyser and water heater repair technicians near you in ${CITY} for storage and instant geysers.`,
      "Heating elements and thermostats are the most common replacements. Hard water causes scale that shortens element life, so descaling during the service helps.",
    ],
    faqs: [
      { q: "Why is my geyser not heating?", a: "A burnt heating element or failed thermostat is the usual cause. Check that the MCB has not tripped first." },
      { q: "Why does my geyser trip the MCB?", a: "Often a shorted element or moisture in the wiring. Stop using it and call a technician." },
      { q: "How often should a geyser be serviced?", a: "Once a year, ideally before winter, including descaling and checking the anode rod and safety valve." },
    ],
  },

  // Electricians ---------------------------------------------------------------------------------
  "wiring-and-rewiring": {
    title: `House Wiring Electrician Near Me in ${CITY}`,
    description: `Find electricians near you in ${CITY} for house wiring, rewiring, new points, concealed and surface wiring. Get quotes from verified local electricians.`,
    h1: `House wiring and rewiring near you in ${CITY}`,
    intro: [
      `Building, renovating or dealing with old wiring? Find electricians near you in ${CITY} for full house wiring, rewiring, new power points, concealed and surface wiring.`,
      "Rewiring is quoted after an inspection, usually per point or for the whole house. Ask which brand and gauge of wire, which switches and MCBs are included, and whether earthing will be tested.",
    ],
    faqs: [
      { q: "How do I know my house needs rewiring?", a: "Frequent tripping, warm sockets, flickering lights, aluminium wiring, or wiring older than 20 to 25 years are signs to get an inspection." },
      { q: "How is rewiring priced?", a: "Usually per point or per room, including or excluding materials. Compare quotes that list the wire and switch brands." },
      { q: "How long does rewiring take?", a: "A flat usually takes a few days. Concealed wiring takes longer because walls must be chased and repaired." },
    ],
  },
  "fan-and-light-installation": {
    title: `Fan & Light Installation Near Me in ${CITY}`,
    description: `Find an electrician near you in ${CITY} to install ceiling fans, lights, chandeliers, exhaust fans and fancy lights. Quick jobs at fair prices.`,
    h1: `Fan and light installation near you in ${CITY}`,
    intro: [
      `Find electricians near you in ${CITY} to install or replace ceiling fans, wall fans, exhaust fans, LED panels, tube lights, chandeliers and decorative lights.`,
      "These are usually quick per-item jobs. Have the fan or light ready, and ask the electrician to check the ceiling hook and the regulator while they are there.",
    ],
    faqs: [
      { q: "How much does ceiling fan installation cost?", a: "Usually a small per-fan charge. A chandelier or a new point costs more." },
      { q: "Why is my ceiling fan slow?", a: "A weak capacitor is the most common cause and is cheap to replace." },
      { q: "Can you install lights where there is no point?", a: "Yes. The electrician will add a new point and wiring and quote for it." },
    ],
  },
  "inverter-and-battery": {
    title: `Inverter & Battery Installation in ${CITY}`,
    description: `Find inverter and battery installation, repair and service near you in ${CITY}. Sizing advice, battery replacement, water top-up and wiring for power cuts.`,
    h1: `Inverter and battery service near you in ${CITY}`,
    intro: [
      `Find technicians near you in ${CITY} to install, repair and service home inverters and batteries, and to wire the circuits you want to run during power cuts.`,
      "Size the inverter to the load you need (fans, lights, TV, router) and choose a battery for how many hours of backup you want. Tubular batteries need distilled water top-ups every few months.",
    ],
    faqs: [
      { q: "What size inverter do I need?", a: "Add up the wattage of what you want to run. A few fans, lights and a TV usually need 800 to 1,100 VA. A technician can advise on the right size." },
      { q: "How long does an inverter battery last?", a: "Typically three to five years for tubular batteries, depending on use and maintenance." },
      { q: "Why is my inverter backup time reducing?", a: "An ageing battery, low water level or an added load. Get the battery checked." },
    ],
  },
  "switchboard-repair": {
    title: `Switchboard & MCB Repair Near Me in ${CITY}`,
    description: `Find electricians near you in ${CITY} for switchboard, socket, MCB and distribution board repair and replacement. Fix sparking and tripping safely.`,
    h1: `Switchboard and MCB repair near you in ${CITY}`,
    intro: [
      `Loose sockets, sparking switches or an MCB that keeps tripping? Find electricians near you in ${CITY} to repair or replace switchboards, sockets, MCBs, RCCBs and distribution boards.`,
      "Sparking or a burning smell from a switchboard is a fire risk. Switch off the MCB for that circuit and call an electrician.",
    ],
    faqs: [
      { q: "Why does my MCB keep tripping?", a: "Overload, a short circuit, or a faulty appliance. An electrician can find which circuit and why." },
      { q: "What is an RCCB and do I need one?", a: "An RCCB cuts power when current leaks to earth, protecting against shocks. It is strongly recommended for every home." },
      { q: "Can you upgrade old switchboards to modular switches?", a: "Yes. Electricians can replace old boards with modular switches and plates." },
    ],
  },
  "electrical-safety-inspection": {
    title: `Electrical Safety Inspection in ${CITY}`,
    description: `Book an electrical safety inspection near you in ${CITY}: wiring, earthing, MCB and RCCB checks for homes, rentals and shops, with a written report.`,
    h1: `Electrical safety inspection near you in ${CITY}`,
    intro: [
      `Moving into an older home, renting out a flat, or adding heavy appliances? Book an electrical safety inspection near you in ${CITY} to check wiring, earthing, MCBs, RCCBs and load.`,
      "Ask for a written list of findings with photos, and separate prices for any repairs so you can decide what to fix first.",
    ],
    faqs: [
      { q: "What does an electrical safety inspection cover?", a: "Wiring condition, earthing, MCB and RCCB function, socket polarity, load on each circuit, and visible hazards." },
      { q: "How often should wiring be inspected?", a: "Every five years for homes, and whenever you buy or rent an older property or notice problems." },
      { q: "Why is earthing important?", a: "Good earthing carries fault current safely away, protecting you from shocks and appliances from damage." },
    ],
  },

  // Plumbing -------------------------------------------------------------------------------------
  "leak-repair": {
    title: `Leak Repair Plumber Near Me in ${CITY}`,
    description: `Find plumbers near you in ${CITY} for leaking taps, pipes, flush tanks and concealed leaks. Fast leak detection and repair. Call local plumbers directly.`,
    h1: `Leak repair near you in ${CITY}`,
    intro: [
      `Dripping tap, leaking pipe, running flush or damp wall? Find plumbers near you in ${CITY} for leak detection and repair.`,
      "Visible leaks are quick fixes. Concealed pipe leaks may need a small section of wall or tile opened; ask the plumber to show you where and to include the repair of the wall in the quote.",
    ],
    faqs: [
      { q: "How do I know if a pipe is leaking inside the wall?", a: "Damp patches, bubbling paint, a musty smell, or a water meter that moves with every tap closed." },
      { q: "How much does leak repair cost?", a: "Tap and flush repairs are inexpensive; concealed leaks cost more because of the opening and repair work." },
      { q: "What should I do while waiting for the plumber?", a: "Close the main valve or the isolation valve and switch off the pump." },
    ],
  },
  "bathroom-fitting": {
    title: `Bathroom Fitting Plumber Near Me in ${CITY}`,
    description: `Find plumbers near you in ${CITY} for bathroom fittings: taps, showers, wash basins, WC and commode installation, geyser connections and sanitaryware.`,
    h1: `Bathroom fitting near you in ${CITY}`,
    intro: [
      `Renovating a bathroom or replacing fittings? Find plumbers near you in ${CITY} to install taps, mixers, showers, wash basins, WCs and commodes, health faucets and geyser connections.`,
      "Buy fittings after checking the pipe sizes and wall-mixer type with your plumber, and ask whether the quote covers only labour or also materials.",
    ],
    faqs: [
      { q: "Can a plumber install fittings I buy myself?", a: "Yes. Most plumbers charge labour only for customer-supplied fittings." },
      { q: "How long does a bathroom fitting job take?", a: "Replacing a few fittings takes a few hours; a full bathroom fit-out takes one to several days." },
      { q: "Can you fix a flush tank that keeps running?", a: "Yes. It is usually a worn flapper, fill valve or float." },
    ],
  },
  "water-tank-cleaning": {
    title: `Water Tank Cleaning Service Near Me in ${CITY}`,
    description: `Find water tank cleaning services near you in ${CITY} for overhead and underground tanks: draining, sludge removal, scrubbing and disinfection.`,
    h1: `Water tank cleaning near you in ${CITY}`,
    intro: [
      `Find water tank cleaning services near you in ${CITY} for overhead plastic tanks and underground sumps: draining, sludge removal, scrubbing, disinfection and rinsing.`,
      "Clean tanks every three to six months and after the monsoon, when sediment builds up fastest. Store some water before the team arrives.",
    ],
    faqs: [
      { q: "How often should a water tank be cleaned?", a: "Every three to six months, and after the monsoon." },
      { q: "How long does tank cleaning take?", a: "Usually one to three hours depending on tank size and how dirty it is." },
      { q: "Are the chemicals safe?", a: "Professionals use approved disinfectants and rinse the tank well before refilling." },
    ],
  },
  "drain-unblocking": {
    title: `Drain Blockage Plumber Near Me in ${CITY}`,
    description: `Find plumbers near you in ${CITY} to clear blocked drains, sinks, toilets, bathroom floor traps and sewer lines. Quick drain unblocking.`,
    h1: `Drain unblocking near you in ${CITY}`,
    intro: [
      `Blocked kitchen sink, slow bathroom drain or overflowing toilet? Find plumbers near you in ${CITY} for drain unblocking using spring cables, pressure pumps and drain machines.`,
      "Avoid pouring strong acid down drains; it damages pipes and is dangerous for the plumber. Grease, hair and wipes cause most blockages.",
    ],
    faqs: [
      { q: "How do plumbers unblock a drain?", a: "With a plunger, spring cable or pressure pump for most blockages, and a drain machine for main lines." },
      { q: "How can I prevent drain blockages?", a: "Use sink strainers, do not pour oil down the sink, and never flush wipes." },
      { q: "Why does my drain smell?", a: "A dry floor trap, trapped food and grease, or a venting problem. Pour water into unused traps and clean the grating." },
    ],
  },
  "motor-and-pump-repair": {
    title: `Water Motor & Pump Repair Near Me in ${CITY}`,
    description: `Find water motor and pump repair near you in ${CITY}: not lifting water, noisy motor, winding, starter and float switch problems, and new installation.`,
    h1: `Motor and pump repair near you in ${CITY}`,
    intro: [
      `Water motor running but not lifting water, making noise or not starting? Find motor and pump repair technicians near you in ${CITY} for monoblock, submersible and pressure pumps.`,
      "Air locks, worn bearings, a failed capacitor or burnt winding are common faults. Ask whether the repair is done at home or in the workshop.",
    ],
    faqs: [
      { q: "Why is my motor running but not pumping water?", a: "Usually an air lock or a faulty foot valve. A technician can prime the pump and check the valve." },
      { q: "Can a burnt motor be rewound?", a: "Yes, rewinding is common and usually cheaper than a new motor." },
      { q: "Can you install an automatic water level controller?", a: "Yes. A controller switches the motor off when the tank is full and saves water and power." },
    ],
  },

  // Carpentry ------------------------------------------------------------------------------------
  "furniture-repair": {
    title: `Furniture Repair Carpenter Near Me in ${CITY}`,
    description: `Find carpenters near you in ${CITY} for furniture repair: beds, sofas, chairs, tables, wardrobes, drawer channels, hinges and polish.`,
    h1: `Furniture repair near you in ${CITY}`,
    intro: [
      `Broken chair, sagging bed, wardrobe door off its hinge or stuck drawers? Find carpenters near you in ${CITY} for furniture repair and polishing.`,
      "Small repairs are usually charged per job. Share a photo on WhatsApp so the carpenter can bring the right hinges, channels or fittings.",
    ],
    faqs: [
      { q: "Is it worth repairing old furniture?", a: "Solid wood furniture is usually well worth repairing and polishing. Particle board furniture is harder to repair." },
      { q: "Can you fix drawers that stick?", a: "Yes. Replacing worn drawer channels is a quick fix." },
      { q: "Do carpenters polish furniture?", a: "Many do, or can recommend a polisher. Ask for the polish type and number of coats." },
    ],
  },
  "modular-kitchen": {
    title: `Modular Kitchen Carpenter Near Me in ${CITY}`,
    description: `Find modular kitchen makers near you in ${CITY}: design, cabinets, shutters, hardware and installation. Compare quotes on ply, laminate and fittings.`,
    h1: `Modular kitchens near you in ${CITY}`,
    intro: [
      `Find carpenters and kitchen makers near you in ${CITY} for modular kitchens: layout, cabinets, shutters, tall units, soft-close hardware and installation.`,
      "Quotes are usually per running foot. Compare the carcass material (BWP or MR ply), shutter finish (laminate, acrylic, PU), and hardware brand, not just the total price.",
    ],
    faqs: [
      { q: "Which material is best for a modular kitchen?", a: "BWP plywood is the safest choice for cabinets near the sink; MR ply or HDHMR works for dry areas." },
      { q: "How long does a modular kitchen take?", a: "Usually a few weeks from final measurement to installation." },
      { q: "How are modular kitchens priced?", a: "Mostly per running foot, depending on material, finish and hardware." },
    ],
  },
  "door-and-window-work": {
    title: `Door & Window Carpenter Near Me in ${CITY}`,
    description: `Find carpenters near you in ${CITY} for door and window repair and fitting: swollen doors, locks, hinges, new frames, mosquito nets and sliding windows.`,
    h1: `Door and window work near you in ${CITY}`,
    intro: [
      `Door that sticks after the rains, broken lock, or new windows to fit? Find carpenters near you in ${CITY} for door and window repair, lock and hinge replacement, new frames and mosquito net frames.`,
      "Wooden doors swell in the monsoon; planing and re-hanging usually solves it. Ask for the lock brand if you are replacing one.",
    ],
    faqs: [
      { q: "Why does my door stick in the monsoon?", a: "Wood absorbs moisture and swells. A carpenter can plane the edge and seal it." },
      { q: "Can you fit mosquito nets on windows?", a: "Yes. Carpenters fit fixed, sliding or velcro mosquito net frames." },
      { q: "Can you change a door lock?", a: "Yes. Buy the lock in advance or ask the carpenter to bring one." },
    ],
  },
  "custom-furniture": {
    title: `Custom Furniture Carpenter Near Me in ${CITY}`,
    description: `Find carpenters near you in ${CITY} for custom furniture: wardrobes, beds, TV units, study tables and shelves made to measure. Compare quotes.`,
    h1: `Custom furniture near you in ${CITY}`,
    intro: [
      `Need a wardrobe that fits your wall, a bed with storage or a TV unit? Find carpenters near you in ${CITY} for custom furniture made to measure.`,
      "Share reference photos and measurements. Ask for a drawing, the materials, hardware brand, finish and a delivery date in writing.",
    ],
    faqs: [
      { q: "Is custom furniture more expensive than ready-made?", a: "Not always. It fits your space exactly and you choose the materials; compare quotes carefully." },
      { q: "How long does custom furniture take?", a: "A wardrobe or bed usually takes one to three weeks." },
      { q: "Which material should I choose?", a: "Plywood with laminate is durable and popular; solid wood is premium; particle board is cheaper but less sturdy." },
    ],
  },

  // Cleaning -------------------------------------------------------------------------------------
  "home-deep-cleaning": {
    title: `Home Deep Cleaning Near Me in ${CITY}`,
    description: `Book full home deep cleaning near you in ${CITY} for 1, 2 and 3 BHK homes: kitchen, bathrooms, fans, windows and floors. Move-in and move-out cleaning.`,
    h1: `Home deep cleaning near you in ${CITY}`,
    intro: [
      `Find home deep cleaning services near you in ${CITY} for 1, 2 and 3 BHK homes, move-in and move-out cleaning, and pre-festival cleaning.`,
      "A full deep clean usually covers floors, kitchen, bathrooms, fans and lights, windows and grills, and cabinets. Agree on the checklist and whether the team brings machines and chemicals.",
    ],
    faqs: [
      { q: "How much does a 2 BHK deep cleaning cost?", a: "Commonly a few thousand rupees depending on the home's condition and what is included." },
      { q: "How long does home deep cleaning take?", a: "Most of a day for a 2 or 3 BHK with a team of two or three cleaners." },
      { q: "Should I be at home during cleaning?", a: "It is best to be there at the start and end to agree on the checklist and check the work." },
    ],
  },
  "sofa-and-carpet-cleaning": {
    title: `Sofa & Carpet Cleaning Near Me in ${CITY}`,
    description: `Find sofa and carpet cleaning near you in ${CITY}: fabric and leather sofa shampoo, carpet and rug cleaning, mattress and curtain cleaning at home.`,
    h1: `Sofa and carpet cleaning near you in ${CITY}`,
    intro: [
      `Find sofa and carpet cleaning services near you in ${CITY} for fabric sofa shampooing, leather sofa cleaning, carpet and rug cleaning, and mattress cleaning at home.`,
      "Sofa cleaning is usually priced per seat. Fabric sofas can take several hours to dry, so plan for it and keep fans running.",
    ],
    faqs: [
      { q: "How is sofa cleaning priced?", a: "Usually per seat, with extra for recliners, cushions or leather." },
      { q: "How long does a sofa take to dry?", a: "Four to eight hours for most fabric sofas, faster with fans running." },
      { q: "Can stains be removed completely?", a: "Most fresh stains come out; old or set-in stains may only fade." },
    ],
  },
  "bathroom-cleaning": {
    title: `Bathroom Deep Cleaning Near Me in ${CITY}`,
    description: `Book bathroom deep cleaning near you in ${CITY}: tiles, grout, hard water stains, taps, WC and basin descaling and disinfection.`,
    h1: `Bathroom cleaning near you in ${CITY}`,
    intro: [
      `Find bathroom deep cleaning services near you in ${CITY} to remove hard water stains, clean tiles and grout, descale taps and showers, and disinfect the WC and basin.`,
      "Bathroom cleaning is usually priced per bathroom. Hard water scale and yellow stains need machine scrubbing and descalers, which a regular clean does not remove.",
    ],
    faqs: [
      { q: "Can hard water stains be removed?", a: "Most can, with professional descalers and scrubbing machines." },
      { q: "How long does bathroom cleaning take?", a: "About one to two hours per bathroom." },
      { q: "How often should I deep clean a bathroom?", a: "Every one to three months, with regular cleaning in between." },
    ],
  },
  "kitchen-cleaning": {
    title: `Kitchen Deep Cleaning Near Me in ${CITY}`,
    description: `Book kitchen deep cleaning near you in ${CITY}: grease removal from tiles, chimney and stove, cabinets inside and out, sink and slab degreasing.`,
    h1: `Kitchen deep cleaning near you in ${CITY}`,
    intro: [
      `Find kitchen deep cleaning services near you in ${CITY} for grease removal from tiles, slab, stove and chimney exterior, cleaning cabinets inside and out, and sink degreasing.`,
      "Empty cabinets before the team arrives. Chimney filter cleaning or servicing may be a separate add-on; ask when booking.",
    ],
    faqs: [
      { q: "Does kitchen cleaning include the chimney?", a: "Usually the exterior and filters; a full chimney service may be extra." },
      { q: "How long does kitchen deep cleaning take?", a: "Three to five hours for most kitchens." },
      { q: "Should I empty my cabinets?", a: "Yes, if you want the insides cleaned." },
    ],
  },
  "office-cleaning": {
    title: `Office Cleaning Services Near Me in ${CITY}`,
    description: `Find office cleaning services near you in ${CITY} for offices, shops and clinics: one-time deep cleans or regular housekeeping contracts.`,
    h1: `Office cleaning near you in ${CITY}`,
    intro: [
      `Find office cleaning services near you in ${CITY} for offices, shops, showrooms and clinics, from one-time deep cleans to daily or weekly housekeeping.`,
      "For regular contracts, agree on the scope, frequency, staff hours and who supplies the consumables.",
    ],
    faqs: [
      { q: "Do you offer regular office cleaning contracts?", a: "Many providers offer daily, weekly or monthly contracts." },
      { q: "Can cleaning be done after office hours?", a: "Most services can schedule early morning, evening or weekend cleaning." },
      { q: "How is office cleaning priced?", a: "By area, frequency and scope, or per cleaner per month for housekeeping." },
    ],
  },

  // Pest control ---------------------------------------------------------------------------------
  "cockroach-control": {
    title: `Cockroach Pest Control Near Me in ${CITY}`,
    description: `Find cockroach pest control near you in ${CITY}: odourless gel treatment for kitchens and homes, with follow-up visits. Safe for families.`,
    h1: `Cockroach control near you in ${CITY}`,
    intro: [
      `Find cockroach pest control services near you in ${CITY}. Gel bait treatment is odourless and you can usually stay at home; sprays reach cracks and drains.`,
      "Cockroaches come back if food and water are available, so keep the kitchen dry and sealed and book a follow-up after two to four weeks.",
    ],
    faqs: [
      { q: "Is cockroach gel treatment safe?", a: "Yes, it is applied in small dots in cracks and hinges, away from food and children." },
      { q: "How long does it take to work?", a: "You will see fewer cockroaches within days; full control takes two to four weeks." },
      { q: "How often should I treat for cockroaches?", a: "Every three to six months, or as advised after the follow-up visit." },
    ],
  },
  "termite-treatment": {
    title: `Termite Treatment Near Me in ${CITY}`,
    description: `Find anti-termite treatment near you in ${CITY}: inspection, drill-fill-seal for existing homes, pre-construction soil treatment, with written warranty.`,
    h1: `Termite treatment near you in ${CITY}`,
    intro: [
      `Mud tubes on walls or hollow woodwork? Find termite control services near you in ${CITY} for inspection, drill-fill-seal treatment in existing homes, and soil treatment before construction.`,
      "Termite treatment is priced by area and method and should come with a written warranty. Humid North Bengal weather makes termites common, so treat early.",
    ],
    faqs: [
      { q: "How much does termite treatment cost?", a: "It is usually priced per square foot of built-up area and varies by method and severity." },
      { q: "How long does termite treatment last?", a: "Post-construction treatment usually lasts several years; ask for the warranty period in writing." },
      { q: "What are signs of termites?", a: "Mud tubes, hollow-sounding wood, discarded wings near windows, and damaged paper or wood." },
    ],
  },
  "bed-bug-treatment": {
    title: `Bed Bug Treatment Near Me in ${CITY}`,
    description: `Find bed bug treatment near you in ${CITY} for homes, hostels and hotels: mattress, bed and furniture treatment with a follow-up visit.`,
    h1: `Bed bug treatment near you in ${CITY}`,
    intro: [
      `Itchy bites and spots on the mattress? Find bed bug treatment services near you in ${CITY} for homes, PGs, hostels and hotels.`,
      "Bed bugs need two treatments about two weeks apart to kill hatching eggs. Wash bedding in hot water and dry it in the sun before the treatment.",
    ],
    faqs: [
      { q: "How many treatments are needed for bed bugs?", a: "Usually two, about two weeks apart." },
      { q: "Should I throw away my mattress?", a: "Usually not. Treatment plus a mattress cover works for most cases." },
      { q: "How do I prepare for bed bug treatment?", a: "Wash and sun-dry bedding and clothes, clear clutter under beds, and follow the provider's checklist." },
    ],
  },
  "mosquito-control": {
    title: `Mosquito Control Service Near Me in ${CITY}`,
    description: `Find mosquito control near you in ${CITY}: fogging, larvicide and residual spray for homes, housing societies, offices and gardens.`,
    h1: `Mosquito control near you in ${CITY}`,
    intro: [
      `Find mosquito control services near you in ${CITY} for fogging, residual spraying and larvicide treatment for homes, housing societies, offices and gardens.`,
      "Stagnant water breeds mosquitoes, especially in the monsoon. Empty coolers, pots and trays weekly alongside professional treatment.",
    ],
    faqs: [
      { q: "Does fogging work?", a: "Fogging kills adult mosquitoes for a short time; larvicide and removing stagnant water give longer control." },
      { q: "How often is mosquito treatment needed?", a: "Monthly during the monsoon, less often in dry months." },
      { q: "Is mosquito spray safe indoors?", a: "Approved products are safe when applied as directed; stay out until the spray dries." },
    ],
  },
  "rodent-control": {
    title: `Rat & Rodent Control Near Me in ${CITY}`,
    description: `Find rat and rodent control near you in ${CITY} for homes, shops, restaurants and warehouses: baiting, trapping and sealing entry points.`,
    h1: `Rodent control near you in ${CITY}`,
    intro: [
      `Rats in the kitchen, shop or godown? Find rodent control services near you in ${CITY} for baiting, trapping and sealing entry points.`,
      "Lasting control needs entry points closed and food stored securely. Ask the provider to show where rodents are getting in.",
    ],
    faqs: [
      { q: "How long does rodent control take?", a: "You should see results within one to two weeks, with follow-ups to confirm." },
      { q: "Is rodent bait safe around pets?", a: "Professionals use tamper-proof bait stations placed away from pets and children." },
      { q: "How do I stop rats coming back?", a: "Seal gaps and drains, store food in closed containers, and remove clutter." },
    ],
  },

  // Painting -------------------------------------------------------------------------------------
  "interior-painting": {
    title: `Interior Painters Near Me in ${CITY}`,
    description: `Find interior painters near you in ${CITY} for walls, ceilings, doors and grills: repainting, fresh painting with putty, and colour advice.`,
    h1: `Interior painting near you in ${CITY}`,
    intro: [
      `Find interior painters near you in ${CITY} for rooms, full homes, ceilings, doors and grills, whether it is a quick repaint or fresh painting with putty and primer.`,
      "Ask for the paint brand, product name, finish and number of coats in writing, and whether moving furniture and covering floors is included.",
    ],
    faqs: [
      { q: "How much does interior painting cost?", a: "It is usually quoted per square foot of wall area and depends on the paint and prep work needed." },
      { q: "How long does a 2 BHK repaint take?", a: "Four to seven days, depending on putty work and drying time." },
      { q: "Can I stay at home while painting is done?", a: "Yes, with low-odour paints; painters usually work room by room." },
    ],
  },
  "exterior-painting": {
    title: `Exterior House Painters Near Me in ${CITY}`,
    description: `Find exterior painters near you in ${CITY} for weatherproof exterior paint, crack filling and primer on houses and buildings. Compare quotes.`,
    h1: `Exterior painting near you in ${CITY}`,
    intro: [
      `Find exterior painters near you in ${CITY} for houses, buildings and boundary walls, including crack filling, primer and weatherproof exterior emulsions.`,
      `Heavy rain in ${CITY} is tough on exterior walls, so choose a weather-resistant product and paint in the dry season.`,
    ],
    faqs: [
      { q: "When is the best time to paint exteriors?", a: "In the dry months, from autumn to spring, when walls are dry." },
      { q: "How long does exterior paint last?", a: "Good exterior emulsions usually last five years or more." },
      { q: "Do painters provide scaffolding?", a: "Most include ropes or scaffolding for multi-storey work; confirm in the quote." },
    ],
  },
  waterproofing: {
    title: `Waterproofing Services Near Me in ${CITY}`,
    description: `Find waterproofing contractors near you in ${CITY} for roof and terrace, bathroom, wall seepage and basement waterproofing. Fix damp walls for good.`,
    h1: `Waterproofing near you in ${CITY}`,
    intro: [
      `Roof leaking, damp walls or seepage from the bathroom? Find waterproofing contractors near you in ${CITY} for terraces, roofs, bathrooms, external walls and water tanks.`,
      "The fix depends on the source: terrace coatings, crack filling, bathroom re-grouting or chemical treatment. Ask for the product, method and warranty in writing.",
    ],
    faqs: [
      { q: "How do I stop a roof leak?", a: "A contractor will inspect cracks and joints and apply a waterproof coating or membrane." },
      { q: "When should I do waterproofing?", a: "Before the monsoon, in dry weather." },
      { q: "Does waterproofing come with a warranty?", a: "Most contractors give a warranty of a few years; ask for it in writing." },
    ],
  },
  "texture-and-wallpaper": {
    title: `Texture Paint & Wallpaper Near Me in ${CITY}`,
    description: `Find painters near you in ${CITY} for texture paint, accent walls, stencils and wallpaper installation. See samples and compare quotes.`,
    h1: `Texture painting and wallpaper near you in ${CITY}`,
    intro: [
      `Find painters and installers near you in ${CITY} for texture paint, accent walls, stencils and wallpaper for living rooms, bedrooms and offices.`,
      "Ask to see samples and past work. Wallpaper needs a smooth, dry wall; fix dampness first.",
    ],
    faqs: [
      { q: "Is texture paint or wallpaper better?", a: "Texture paint is durable and suits humid rooms; wallpaper offers more designs and is easy to change." },
      { q: "How is wallpaper priced?", a: "Per roll or per square foot, plus installation." },
      { q: "Can wallpaper be used in damp areas?", a: "Avoid it on walls with seepage; choose texture paint instead." },
    ],
  },

  // Packers & movers -----------------------------------------------------------------------------
  "local-shifting": {
    title: `Local House Shifting Near Me in ${CITY}`,
    description: `Find packers and movers for local house shifting near you in ${CITY}: packing, loading, transport and unpacking for 1, 2 and 3 BHK homes.`,
    h1: `Local house shifting near you in ${CITY}`,
    intro: [
      `Moving within ${CITY}? Find packers and movers near you for local house shifting, including packing, loading, transport, unloading and unpacking.`,
      "Local shifting is usually a package price that depends on volume, floor and lift access. Get a written quote after a survey, and avoid large advance payments.",
    ],
    faqs: [
      { q: `How much does local shifting cost in ${CITY}?`, a: "Usually a few thousand to around fifteen thousand rupees for 1 to 2 BHK, depending on volume, floor and packing." },
      { q: "Can local shifting be done in one day?", a: "Yes, most 1 and 2 BHK local moves are done in a day." },
      { q: "Do movers dismantle furniture?", a: "Most dismantle and reassemble beds and wardrobes; confirm in the quote." },
    ],
  },
  "intercity-relocation": {
    title: `Intercity Packers and Movers from ${CITY}`,
    description: `Find packers and movers near you in ${CITY} for intercity relocation: packing, transport, insurance and delivery to any city in India.`,
    h1: `Intercity relocation from ${CITY}`,
    intro: [
      `Moving from ${CITY} to Kolkata, Guwahati, Delhi or any other city? Find packers and movers for intercity relocation with packing, transport, transit insurance and delivery.`,
      "Ask for an inventory list, the delivery timeline, and how damage claims work. Get quotes from at least three movers after a survey.",
    ],
    faqs: [
      { q: "How long does an intercity move take?", a: "It depends on distance; nearby cities take one to three days, distant ones up to a week or more." },
      { q: "Is transit insurance necessary?", a: "Strongly recommended for intercity moves." },
      { q: "Can I track my shipment?", a: "Many movers share tracking or regular updates; ask before booking." },
    ],
  },
  "vehicle-transport": {
    title: `Bike & Car Transport Services from ${CITY}`,
    description: `Find bike and car transport services near you in ${CITY}: door-to-door vehicle shifting in open or closed carriers, with insurance.`,
    h1: `Vehicle transport near you in ${CITY}`,
    intro: [
      `Find bike and car transport services near you in ${CITY} for door-to-door vehicle shifting in open or closed carriers.`,
      "Record the vehicle's condition with photos before loading, keep the RC and insurance handy, and ask for transit insurance.",
    ],
    faqs: [
      { q: "What documents are needed for vehicle transport?", a: "Usually the RC, insurance and an ID; movers will list what they need." },
      { q: "Closed or open carrier: which is better?", a: "Closed carriers protect from weather and dust and cost more; open carriers are cheaper." },
      { q: "Should the fuel tank be empty?", a: "Keep only a little fuel; movers will advise." },
    ],
  },
  "office-relocation": {
    title: `Office Relocation Services in ${CITY}`,
    description: `Find office relocation services near you in ${CITY}: packing IT equipment, furniture, files and workstations with weekend or after-hours moves.`,
    h1: `Office relocation near you in ${CITY}`,
    intro: [
      `Find office relocation services near you in ${CITY} for moving IT equipment, workstations, furniture and files, with weekend or after-hours moves to avoid downtime.`,
      "Plan the layout of the new office in advance and label every box and desk by zone to speed up setup.",
    ],
    faqs: [
      { q: "Can the move be done over a weekend?", a: "Yes, most movers offer weekend and after-hours office moves." },
      { q: "Do movers pack computers and servers?", a: "Yes, with anti-static packing; back up data before the move." },
      { q: "How early should an office move be planned?", a: "Two to four weeks ahead for small offices, longer for large ones." },
    ],
  },

  // Tutors ---------------------------------------------------------------------------------------
  "maths-tutor": {
    title: `Maths Home Tutor Near Me in ${CITY}`,
    description: `Find maths home tutors near you in ${CITY} for CBSE, ICSE and state board classes 1 to 12, plus JEE foundation. Compare tutors and book a trial.`,
    h1: `Maths tutors near you in ${CITY}`,
    intro: [
      `Find maths home tutors near you in ${CITY} for classes 1 to 12 across CBSE, ICSE and West Bengal boards, and foundation classes for JEE.`,
      "A good maths tutor finds the gaps behind poor marks, not just the current chapter. Ask for a trial class and how they track progress.",
    ],
    faqs: [
      { q: "How much does a maths tutor charge?", a: "It depends on the class, board and days per week; senior classes cost more." },
      { q: "How many days a week should my child have maths tuition?", a: "Two to three days a week is common; more before board exams." },
      { q: "Do maths tutors also teach online?", a: "Many do; ask the tutor." },
    ],
  },
  "science-tutor": {
    title: `Science Home Tutor Near Me in ${CITY}`,
    description: `Find science home tutors near you in ${CITY} for physics, chemistry and biology, classes 6 to 12, CBSE, ICSE and state boards, and NEET foundation.`,
    h1: `Science tutors near you in ${CITY}`,
    intro: [
      `Find science home tutors near you in ${CITY} for physics, chemistry and biology from class 6 to 12, and foundation coaching for NEET and JEE.`,
      "For classes 11 and 12, look for a tutor who specialises in one subject. Ask about their experience with your board.",
    ],
    faqs: [
      { q: "Should I hire one tutor for all science subjects?", a: "Up to class 10, one tutor often works; for 11 and 12, subject specialists are better." },
      { q: "Do science tutors help with practicals?", a: "Many help with practical files and viva preparation." },
      { q: "How do I judge a tutor quickly?", a: "Take a trial class and ask your child whether the explanation was clear." },
    ],
  },
  "english-tutor": {
    title: `English Tutor Near Me in ${CITY}`,
    description: `Find English tutors near you in ${CITY} for school English, grammar, writing and spoken English for students and adults. Compare and call.`,
    h1: `English tutors near you in ${CITY}`,
    intro: [
      `Find English tutors near you in ${CITY} for school English, grammar and writing, and spoken English classes for students and working adults.`,
      "Tell the tutor your goal, such as board marks, interviews or everyday speaking, so they can plan lessons around it.",
    ],
    faqs: [
      { q: "Are spoken English classes available for adults?", a: "Yes, many tutors teach spoken English and interview preparation for adults." },
      { q: "How long does it take to improve spoken English?", a: "With regular practice, most learners feel more confident within two to three months." },
      { q: "Do English tutors help with board exam writing?", a: "Yes, including essays, letters and literature answers." },
    ],
  },
  "music-teacher": {
    title: `Music Teacher Near Me in ${CITY}`,
    description: `Find music teachers near you in ${CITY} for guitar, keyboard, vocals, tabla and more. Home or studio lessons for children and adults.`,
    h1: `Music teachers near you in ${CITY}`,
    intro: [
      `Find music teachers near you in ${CITY} for guitar, keyboard and piano, Hindustani and western vocals, tabla and other instruments, at home or in their studio.`,
      "Ask whether the teacher prepares students for graded exams such as Trinity or Prayag Sangeet Samiti if certificates matter to you.",
    ],
    faqs: [
      { q: "What age can children start music lessons?", a: "Many start keyboard or vocals from five or six years old." },
      { q: "Do music teachers come home?", a: "Many do; others teach in their studio." },
      { q: "Do I need to buy an instrument first?", a: "Ask the teacher for advice on a beginner instrument before buying." },
    ],
  },
  "competitive-exam-coaching": {
    title: `Competitive Exam Coaching Near Me in ${CITY}`,
    description: `Find coaching near you in ${CITY} for JEE, NEET, WBJEE, banking, SSC and government exams. Compare tutors and coaching institutes.`,
    h1: `Competitive exam coaching near you in ${CITY}`,
    intro: [
      `Find tutors and coaching institutes near you in ${CITY} for JEE, NEET, WBJEE, banking, SSC, railway and state government exams.`,
      "Ask about batch size, mock tests, doubt-clearing sessions and past results before enrolling.",
    ],
    faqs: [
      { q: "Home tutor or coaching institute for JEE or NEET?", a: "Institutes give structure and test series; home tutors help with weak topics. Many students use both." },
      { q: "What should I ask a coaching institute?", a: "Batch size, faculty, mock test schedule, study material and fees in writing." },
      { q: "Are demo classes available?", a: "Most institutes and tutors offer a free or paid demo class." },
    ],
  },

  // Beauty & salon -------------------------------------------------------------------------------
  "salon-at-home-women": {
    title: `Salon at Home for Women in ${CITY}`,
    description: `Book salon at home services for women near you in ${CITY}: waxing, facials, threading, manicure, pedicure, hair spa and party makeup.`,
    h1: `Salon at home for women in ${CITY}`,
    intro: [
      `Find salon at home services near you in ${CITY} for waxing, threading, facials, clean-ups, manicure and pedicure, hair spa and party makeup.`,
      "Ask which product brands are used and whether tools are disposable or sanitised.",
    ],
    faqs: [
      { q: "Is salon at home more expensive than a salon?", a: "Often similar; some charge a small travel fee." },
      { q: "What do I need to arrange at home?", a: "A well-lit space, a chair, and access to water; the beautician brings the rest." },
      { q: "Are home salon services hygienic?", a: "Choose well-reviewed professionals who use sealed products and disposable items." },
    ],
  },
  "men-s-grooming": {
    title: `Men's Grooming & Salon Near Me in ${CITY}`,
    description: `Find men's grooming near you in ${CITY}: haircut, beard styling, shave, facial, hair colour and massage, at home or in the salon.`,
    h1: `Men's grooming near you in ${CITY}`,
    intro: [
      `Find men's grooming services near you in ${CITY} for haircuts, beard trim and styling, shaves, facials, hair colour and head massage, at home or in the salon.`,
      "Show a reference photo for haircuts and beard styles to get exactly what you want.",
    ],
    faqs: [
      { q: "Do barbers come home?", a: "Some grooming professionals offer home visits; check the listing." },
      { q: "How often should I get a haircut?", a: "Every three to five weeks for short styles." },
      { q: "Do men's salons do facials?", a: "Yes, most offer clean-ups, facials and de-tan treatments." },
    ],
  },
  "bridal-makeup": {
    title: `Bridal Makeup Artist Near Me in ${CITY}`,
    description: `Find bridal makeup artists near you in ${CITY} for HD and airbrush bridal makeup, engagement and reception looks, hair styling and draping.`,
    h1: `Bridal makeup artists near you in ${CITY}`,
    intro: [
      `Find bridal makeup artists near you in ${CITY} for HD and airbrush bridal looks, engagement, mehendi and reception makeup, hair styling and saree or lehenga draping.`,
      "Look at portfolios, book a trial, and confirm what the package includes: products, hairstyling, draping, lashes, touch-ups and travel.",
    ],
    faqs: [
      { q: "How early should I book a bridal makeup artist?", a: "Two to four months before the wedding, earlier in peak season." },
      { q: "HD or airbrush makeup: which is better?", a: "Both look great on camera; airbrush gives a lighter, longer-lasting finish and usually costs more." },
      { q: "Is a makeup trial necessary?", a: "Strongly recommended, so you and the artist agree on the look." },
    ],
  },
  "spa-and-massage": {
    title: `Spa & Massage Near Me in ${CITY}`,
    description: `Find spa and massage services near you in ${CITY}: full body massage, head and foot massage, body scrubs and wellness therapies.`,
    h1: `Spa and massage near you in ${CITY}`,
    intro: [
      `Find spa and massage services near you in ${CITY} for full body massage, deep tissue, head and foot massage, body scrubs and wellness therapies.`,
      "Tell the therapist about injuries, pregnancy or health conditions before the session.",
    ],
    faqs: [
      { q: "Which massage should I choose?", a: "Swedish for relaxation, deep tissue for muscle tension, and foot or head massage for a short session." },
      { q: "How long is a typical session?", a: "Most sessions last 60 to 90 minutes." },
      { q: "Are home massage services available?", a: "Some listings offer home visits; check the listing." },
    ],
  },

  // Vehicle repair -------------------------------------------------------------------------------
  "car-service": {
    title: `Car Service & Repair Near Me in ${CITY}`,
    description: `Find car service and repair garages near you in ${CITY}: periodic service, oil change, brakes, suspension, clutch and battery for all brands.`,
    h1: `Car service near you in ${CITY}`,
    intro: [
      `Find car service garages near you in ${CITY} for periodic service, oil change, brake and clutch work, suspension, battery and electrical repairs for all brands.`,
      "Ask for an itemised estimate, approve extra work before it is done, and keep the old parts. Multi-brand garages are usually cheaper than dealerships for the same work.",
    ],
    faqs: [
      { q: "How much does a car service cost?", a: "A periodic service at a multi-brand garage usually costs a few thousand rupees for a hatchback, more for sedans and SUVs, plus parts." },
      { q: "How often should I service my car?", a: "Every 10,000 km or once a year, whichever comes first, unless your manual says otherwise." },
      { q: "Do garages offer pickup and drop?", a: "Many do; ask when you call." },
    ],
  },
  "bike-service": {
    title: `Bike Service & Mechanic Near Me in ${CITY}`,
    description: `Find bike mechanics near you in ${CITY} for general service, oil change, brakes, chain, clutch and electrical repairs for all two-wheelers.`,
    h1: `Bike service near you in ${CITY}`,
    intro: [
      `Find bike and scooter mechanics near you in ${CITY} for general service, engine oil change, brake and clutch adjustment, chain lubrication and electrical repairs.`,
      "Service your bike every 3,000 to 5,000 km. Ask the mechanic to list what they replaced and why.",
    ],
    faqs: [
      { q: "How much does a bike service cost?", a: "A general service is usually a few hundred rupees plus oil and parts." },
      { q: "How often should I change engine oil?", a: "Every 2,000 to 3,000 km for most bikes, or as the manual says." },
      { q: "Do mechanics offer doorstep bike service?", a: "Some do; check the listing or ask on the call." },
    ],
  },
  "car-wash-and-detailing": {
    title: `Car Wash & Detailing Near Me in ${CITY}`,
    description: `Find car wash and detailing near you in ${CITY}: foam wash, interior cleaning, polishing, ceramic coating and doorstep car wash.`,
    h1: `Car wash and detailing near you in ${CITY}`,
    intro: [
      `Find car wash and detailing services near you in ${CITY} for foam wash, interior vacuum and shampoo, rubbing and polishing, ceramic coating and doorstep car wash.`,
      "Ask what is included in each package and how long ceramic coating or polish is expected to last.",
    ],
    faqs: [
      { q: "Is ceramic coating worth it?", a: "It protects paint and makes cleaning easier for a few years, but it is an investment; compare packages." },
      { q: "How often should I get interior cleaning?", a: "Every two to three months, or after the monsoon." },
      { q: "Is doorstep car wash available?", a: "Many providers offer doorstep washing; check the listing." },
    ],
  },
  "tyre-and-puncture": {
    title: `Tyre & Puncture Repair Near Me in ${CITY}`,
    description: `Find tyre and puncture repair near you in ${CITY}: tubeless puncture, new tyres, wheel alignment and balancing for cars and bikes.`,
    h1: `Tyre and puncture repair near you in ${CITY}`,
    intro: [
      `Flat tyre? Find tyre and puncture repair shops near you in ${CITY} for tubeless and tube punctures, new tyres, wheel alignment and balancing for cars and bikes.`,
      "Use the Open now filter to see who is available right now. Get alignment checked after hitting a big pothole.",
    ],
    faqs: [
      { q: "Can a tubeless tyre puncture be fixed?", a: "Yes, most tread punctures can be plugged quickly." },
      { q: "When should I replace my tyres?", a: "When tread depth is low, or you see cracks, bulges or uneven wear." },
      { q: "How often should I get wheel alignment?", a: "Every 5,000 to 10,000 km, or when the car pulls to one side." },
    ],
  },
  "car-ac-repair": {
    title: `Car AC Repair Near Me in ${CITY}`,
    description: `Find car AC repair near you in ${CITY}: AC gas refill, leak detection, compressor, condenser and cooling coil repair for all cars.`,
    h1: `Car AC repair near you in ${CITY}`,
    intro: [
      `Car AC blowing warm air or smelling musty? Find car AC repair specialists near you in ${CITY} for gas refill, leak detection, compressor and condenser repair, and cooling coil cleaning.`,
      "Ask the mechanic to find and fix leaks rather than only refilling the gas, and to replace the cabin filter.",
    ],
    faqs: [
      { q: "Why is my car AC not cooling?", a: "Low gas from a leak, a clogged cabin filter, or a faulty compressor or fan." },
      { q: "How often does a car AC need gas?", a: "A healthy system rarely needs gas; frequent refills mean there is a leak." },
      { q: "Why does my car AC smell?", a: "Mould on the cooling coil; a coil cleaning and new cabin filter usually fixes it." },
    ],
  },
};
