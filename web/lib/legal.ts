// Terms and privacy for customers, written as a plain-language summary. DRAFT: have it reviewed by
// counsel before launch. The DialNFind team can link the authoritative versions from the admin
// console (terms_url / privacy_url); the pages then point to them.

export type LegalDocKey = "terms" | "privacy";

export interface LegalSection {
  heading: string;
  body: string;
}

export interface LegalDoc {
  title: string;
  description: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

export const LEGAL_DOCS: Record<LegalDocKey, LegalDoc> = {
  terms: {
    title: "Terms of use",
    description: "The terms that apply when you search for and contact local service providers on DialNFind.",
    updated: "September 2026",
    intro:
      "These terms apply when you use the DialNFind website and app to find and contact local service providers. They are a general summary; the version published by DialNFind is the one that applies.",
    sections: [
      {
        heading: "What DialNFind is",
        body: "DialNFind is a directory that helps you find local service providers and contact them directly. We do not provide the services listed, take bookings or handle payments for the work. Any agreement about price, timing and scope is between you and the provider.",
      },
      {
        heading: "Listings and verification",
        body: "Providers manage their own listings. We check some details, and a Verified label means our team reviewed the documents a provider gave us at that time. It is not a guarantee of the quality of their work, so always agree on price and scope before work starts.",
      },
      {
        heading: "Contacting providers",
        body: "When you tap Call or WhatsApp, we record that you contacted the provider so they can see their leads and so we can rank listings fairly. Use contact details only to enquire about the provider's services.",
      },
      {
        heading: "Your account",
        body: "You can use DialNFind as a guest. With an account you can save favorites, write reviews and contact our support team. Keep your password private; you are responsible for activity on your account.",
      },
      {
        heading: "Reviews",
        body: "Reviews must describe your own genuine experience with the provider. Do not post reviews that are false, abusive, paid for, or about a business you own or compete with. We may hide or remove reviews that break these rules, and providers can reply to reviews publicly.",
      },
      {
        heading: "Reporting problems",
        body: "Report a listing or review from its page if something is wrong, such as a wrong number, a closed business or a fake review. Our team checks every report.",
      },
      {
        heading: "Liability",
        body: "To the extent the law allows, DialNFind is not responsible for the work providers carry out, the prices they charge or disputes between you and a provider.",
      },
      {
        heading: "Closing your account",
        body: "You can delete your account at any time from your account settings. We may suspend accounts that misuse DialNFind, for example by posting fake reviews.",
      },
      {
        heading: "Changes",
        body: "We may update these terms. If a change materially affects you, we will tell you on the website, in the app or by email before it takes effect.",
      },
    ],
  },
  privacy: {
    title: "Privacy policy",
    description: "What DialNFind collects when you search for and contact local service providers, and how it is used.",
    updated: "September 2026",
    intro:
      "This explains what DialNFind collects when you use the website and app, and how it is used. It is a general summary; the version published by DialNFind is the one that applies.",
    sections: [
      {
        heading: "What we collect",
        body: "If you create an account: your name, email address, optional phone number and password, or your Google or Apple sign-in. As you use DialNFind: your searches and the location you search near, providers you contact, favorites, saved addresses, reviews and photos you post, and support requests. We also collect basic device and usage information to keep the service secure and working.",
      },
      {
        heading: "Location",
        body: "We use your location only to show providers near you. On your device, it is used when you choose \"use my current location\"; you can always pick an area by hand instead.",
      },
      {
        heading: "What providers and others see",
        body: "Providers see that someone contacted them and, if you were signed in, your name so they can recognise the enquiry. Reviews show your name and photos you add. Your email address, phone number and saved addresses are never shown publicly.",
      },
      {
        heading: "How we use it",
        body: "To show relevant providers, save your favorites and reviews, send you notifications you asked for (such as replies to your reviews and support requests), answer support requests, prevent fraud and spam, and improve DialNFind.",
      },
      {
        heading: "Who we share it with",
        body: "Companies that host our systems, send emails and push notifications, and help us find and fix errors, under contracts that protect your data; and authorities when the law requires it. We do not sell your personal data.",
      },
      {
        heading: "How long we keep it",
        body: "For as long as your account is open, and afterwards only as long as needed for legal and fraud-prevention reasons.",
      },
      {
        heading: "Your choices",
        body: "You can edit your profile, remove saved addresses and delete reviews at any time. You can turn off push notifications in your device settings. You can delete your account from your account settings, which removes your profile, reviews, favorites and saved addresses. To get a copy of your data, contact DialNFind support.",
      },
    ],
  },
};
