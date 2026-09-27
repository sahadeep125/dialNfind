/**
 * Answers for the Help page (and its FAQPage structured data), grouped into sections. Questions come
 * from what customers ask support and from common search questions (docs/seo/keyword-map.md).
 * Kept in step with mobile/src/app/help.tsx, which words app steps as taps.
 */
export type FaqItem = { q: string; a: string };

export const FAQ_SECTIONS: { id: string; title: string; items: FaqItem[] }[] = [
  {
    id: "using",
    title: "Using DialNFind",
    items: [
      { q: "What is DialNFind?", a: "DialNFind is a local services directory. It helps you find electricians, plumbers, AC and TV repair technicians, cleaners, tutors and other professionals near you, compare them, and contact them directly." },
      { q: "Is DialNFind free to use?", a: "Yes. Searching, calling and messaging providers is free. You pay the provider directly for their work." },
      { q: "Do I need an account?", a: "No. You can search and contact providers as a guest. An account lets you save favorites, write reviews and follow up on support requests." },
      { q: "How do I find a service near me?", a: "Type what you need in the search bar, such as 'AC repair' or 'plumber', or pick a category. Allow location access or choose your area, and DialNFind shows providers nearby." },
      { q: "How do I contact a provider?", a: "Use the Call or WhatsApp button on any listing. You talk to the provider directly; DialNFind does not take bookings or payments." },
      { q: "How do I change my area?", a: "Use the location field in the search bar and pick a city or locality, or use your current location." },
      { q: "Which cities does DialNFind cover?", a: "DialNFind started in Siliguri and is growing to more cities. Search for your area to see the providers listed near you." },
      { q: "Can I see who is open right now?", a: "Yes. Turn on the Open now filter on any results page to see providers that are open at the moment." },
      { q: "Is there a DialNFind app?", a: "Yes. The DialNFind app for Android and iPhone offers the same search, with call and WhatsApp in one tap. Links to the app open in it automatically once installed." },
    ],
  },
  {
    id: "safety",
    title: "Safety and verification",
    items: [
      { q: "What does Verified mean?", a: "Our team has checked the provider's identity or business documents. Always agree on price and scope before work starts." },
      { q: "How are providers ranked?", a: "By how well they match your search, distance, ratings, reviews and how complete and responsive their profile is. Sponsored listings are labelled." },
      { q: "How do I choose a good provider?", a: "Compare ratings and recent reviews, prefer verified listings, ask for a quote before work starts, and call two or three providers for bigger jobs." },
      { q: "Does DialNFind guarantee the work?", a: "No. Providers are independent businesses, and your agreement is with them. We check documents for verified listings and act on reports, but we cannot guarantee any job." },
      { q: "What should I do if a provider behaves badly?", a: "Open the listing and choose Report this listing, or contact support. Our team reviews every report and can remove listings that break our rules." },
      { q: "A listing has a wrong number or the business has closed. What can I do?", a: "Open the listing and choose Report this listing. Our team checks every report." },
    ],
  },
  {
    id: "prices",
    title: "Prices and payments",
    items: [
      { q: "How much will the service cost?", a: "Each provider sets their own prices. Some listings show starting prices; for everything else, describe the job on the call and ask for a quote before work starts. Our guides list typical price ranges for common jobs." },
      { q: "Do I pay through DialNFind?", a: "No. You pay the provider directly by cash, UPI or any method you agree on. DialNFind does not take payments or add booking fees." },
      { q: "Does DialNFind charge a commission?", a: "No. We do not take a commission on your job, so you pay only what you agree with the provider." },
      { q: "Should I pay in advance?", a: "For small jobs, pay after the work is done and checked. For large jobs, a modest advance for materials is common; keep a written record of what you paid." },
    ],
  },
  {
    id: "reviews",
    title: "Reviews",
    items: [
      { q: "Who can write a review?", a: "Anyone with a DialNFind account can review a provider they have used. Reviews must describe a real experience." },
      { q: "Can I edit or delete my review?", a: "Yes. Open My reviews in your dashboard to delete a review, or open the provider's page and choose Edit review." },
      { q: "Are reviews checked?", a: "We look for fake, abusive or paid reviews and remove those that break our guidelines. Providers can reply publicly but cannot delete reviews." },
    ],
  },
  {
    id: "business",
    title: "For businesses",
    items: [
      { q: "How do I list my business on DialNFind?", a: "Go to List your business, create a provider account and add your services, area and hours. Basic listings are free." },
      { q: "My business is already listed. How do I claim it?", a: "Search for your listing on the Claim page and upload an ownership document such as a trade licence, GST certificate or shop registration. Our team reviews claims and gives you control of the listing." },
      { q: "How do I get the Verified badge?", a: "Upload your identity and business documents from the provider portal. Our team checks them and adds the badge when they are approved." },
      { q: "Can I pay to rank higher?", a: "Paid plans can add sponsored placements, which are always labelled. Organic ranking depends on relevance, distance, reviews and profile quality." },
    ],
  },
  {
    id: "account",
    title: "Account and privacy",
    items: [
      { q: "I forgot my password. What do I do?", a: "Choose Forgot password on the login page and follow the link we email you to set a new one." },
      { q: "How do I delete my account?", a: "Go to Account settings in your dashboard and choose Delete account. If you sign in with a password, you will be asked for it to confirm." },
      { q: "What does DialNFind do with my data?", a: "We use your data to run the service, such as saving favorites and showing nearby results. We do not sell your personal data. See the privacy policy for details." },
    ],
  },
];

/** Every question in one list, for structured data. */
export const FAQ: FaqItem[] = FAQ_SECTIONS.flatMap((s) => s.items);
