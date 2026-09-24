import type { Metadata } from "next";
import { api } from "@/lib/api";
import { requireSession } from "@/lib/session";
import type { ContactHistoryItem, Paged } from "@/lib/types";
import { ContactRow } from "@/components/dashboard/contact-row";

export const metadata: Metadata = { title: "Recent contacts" };

export default async function ContactsPage() {
  await requireSession("/dashboard/contacts");
  const data = await api<{ contacts: ContactHistoryItem[] } & Paged>("/me/contacts", { query: { pageSize: 30 } });
  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-deep">Recent contacts</h1>
      <p className="mt-1 text-muted-foreground">Everyone you called or messaged through DialNFind. Let us know if they responded, it helps rank providers fairly.</p>
      <div className="mt-6 space-y-3">
        {data.contacts.length ? (
          data.contacts.map((c) => <ContactRow key={c.id} item={c} />)
        ) : (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No contacts yet.</p>
        )}
      </div>
    </div>
  );
}
