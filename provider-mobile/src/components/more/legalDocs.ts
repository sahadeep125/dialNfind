// Generic placeholder terms and privacy text for business accounts. The KaajVa team can link the
// authoritative versions from the admin console (terms_url / privacy_url), which the legal screen
// then offers as "Read the latest version online".

export type LegalDocKey = "terms" | "privacy";

export interface LegalSection {
  heading: string;
  body: string;
}

export interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

export const LEGAL_DOCS: Record<LegalDocKey, LegalDoc> = {
  terms: {
    title: "Terms for businesses",
    updated: "November 2026",
    intro:
      "These terms apply when you list a business on KaajVa and use the KaajVa Business app. They are a general summary; the version published by KaajVa is the one that applies.",
    sections: [
      {
        heading: "Your listing",
        body: "You are responsible for the information on your listing, including your business name, contact details, prices, photos and service areas. Keep it accurate and up to date. Do not list services you do not offer or use someone else's name, photos or documents.",
      },
      {
        heading: "Verification",
        body: "Documents you upload for verification are checked by our team and are never shown to customers. A Verified label means we checked the documents you gave us at that time. It is not a guarantee of the quality of your work.",
      },
      {
        heading: "Leads and customers",
        body: "Customers contact you directly by phone or WhatsApp. KaajVa does not take bookings or payments for your work, and any agreement about price and scope is between you and the customer. Treat customers fairly and do not contact them for anything other than the enquiry they made.",
      },
      {
        heading: "Reviews",
        body: "Customers can review your business. You can reply to reviews and report ones that break our guidelines, but you may not offer rewards for reviews, write reviews of your own business or pressure customers to change a review.",
      },
      {
        heading: "Fees",
        body: "Listing your business on KaajVa and receiving leads is free. There are no plans, subscriptions or paid promotions, and no listing can pay to rank higher.",
      },
      {
        heading: "Suspension and closing your account",
        body: "We may pause or remove a listing that breaks these terms, receives repeated genuine complaints or appears to be fraudulent. You can delete your business account at any time from your account settings. Deleting it removes your listing from search; it cannot be undone.",
      },
      {
        heading: "Liability",
        body: "KaajVa is a directory that helps customers find local businesses. To the extent the law allows, we are not responsible for work you carry out, disputes with customers or loss of business caused by downtime or ranking changes.",
      },
      {
        heading: "Changes",
        body: "We may update these terms. If a change materially affects you, we will tell you in the app or by email before it takes effect.",
      },
    ],
  },
  privacy: {
    title: "Privacy for businesses",
    updated: "November 2026",
    intro:
      "This explains what KaajVa collects when you run a business listing and how it is used. It is a general summary; the version published by KaajVa is the one that applies.",
    sections: [
      {
        heading: "What we collect",
        body: "Your name, email address, phone number and password for sign in; your business details, photos, hours and service areas; verification documents you upload; support requests; and activity such as leads and profile views.",
      },
      {
        heading: "What customers see",
        body: "Your business name, logo, photos, description, services, prices, hours, service areas, contact numbers, rating and reviews are public. Your email address and verification documents are never shown to customers.",
      },
      {
        heading: "How we use it",
        body: "To show your listing in search, send you leads, verify your business, show you insights, answer support requests, prevent fraud and improve KaajVa.",
      },
      {
        heading: "Who we share it with",
        body: "Service providers that host our systems and send messages, under contracts that protect your data; and authorities when the law requires it. We do not sell your personal data.",
      },
      {
        heading: "How long we keep it",
        body: "For as long as your account is open, and afterwards only as long as needed for legal, tax and fraud-prevention reasons. Verification documents are deleted when they are no longer needed.",
      },
      {
        heading: "Your choices",
        body: "You can edit your listing at any time in the app. You can delete your account yourself from your account settings. To get a copy of your data or correct something you cannot edit, contact KaajVa support.",
      },
    ],
  },
};
