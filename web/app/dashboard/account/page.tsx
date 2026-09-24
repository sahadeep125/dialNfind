import type { Metadata } from "next";
import { api } from "@/lib/api";
import { requireSession } from "@/lib/session";
import type { Address } from "@/lib/types";
import { AddressManager, PasswordForm, ProfileForm } from "@/components/dashboard/account-forms";

export const metadata: Metadata = { title: "Account settings" };

export default async function AccountPage() {
  const user = await requireSession("/dashboard/account");
  const { addresses } = await api<{ addresses: Address[] }>("/me/addresses");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-deep">Account settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your profile, saved addresses and password.</p>
      </div>
      <Panel title="Profile" description="Your name is shown on reviews you write.">
        <ProfileForm name={user.name} email={user.email} phone={user.phone} />
      </Panel>
      <Panel title="Saved addresses" description="Used as a starting point when searching for providers.">
        <AddressManager addresses={addresses} />
      </Panel>
      <Panel title="Password" description="Use at least 8 characters.">
        <PasswordForm />
      </Panel>
    </div>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
      <h2 className="font-semibold">{title}</h2>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">{description}</p>
      {children}
    </section>
  );
}
