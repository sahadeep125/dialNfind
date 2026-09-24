"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Loader2, MapPin, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { clientApi, ClientApiError } from "@/lib/client";
import type { Address } from "@/lib/types";

function errorMessage(err: unknown) {
  return err instanceof ClientApiError ? err.message : "Something went wrong";
}

export function ProfileForm({ name, email, phone }: { name: string; email: string; phone: string | null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await clientApi("/auth/me", { method: "PATCH", body: JSON.stringify({ name: form.get("name"), phone: form.get("phone") || null }) });
      toast.success("Profile updated");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" defaultValue={name} required minLength={2} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" defaultValue={phone ?? ""} placeholder="+91 98xxx xxxxx" />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />} Save profile
        </Button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [saving, setSaving] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setSaving(true);
    try {
      await clientApi("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: form.get("current"), newPassword: form.get("next") }),
      });
      toast.success("Password changed");
      formEl.reset();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="current">Current password</Label>
        <Input id="current" name="current" type="password" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="next">New password</Label>
        <Input id="next" name="next" type="password" minLength={8} required />
      </div>
      <div>
        <Button type="submit" variant="outline" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />} Change password
        </Button>
      </div>
    </form>
  );
}

export function AddressManager({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await clientApi("/me/addresses", {
        method: "POST",
        body: JSON.stringify({
          label: form.get("label") || "Home",
          addressLine: form.get("addressLine"),
          city: form.get("city"),
          state: form.get("state"),
          pincode: form.get("pincode"),
          isDefault: addresses.length === 0,
        }),
      });
      toast.success("Address saved");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function makeDefault(id: number) {
    await clientApi(`/me/addresses/${id}`, { method: "PATCH", body: JSON.stringify({ isDefault: true }) });
    router.refresh();
  }

  async function remove(id: number) {
    await clientApi(`/me/addresses/${id}`, { method: "DELETE" });
    toast.success("Address removed");
    router.refresh();
  }

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-2">
        {addresses.map((a) => (
          <div key={a.id} className="flex gap-3 rounded-xl border p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
              {a.label.toLowerCase() === "home" ? <Home className="size-4" /> : <MapPin className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 font-semibold">
                {a.label} {a.isDefault && <Badge variant="secondary">Default</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {a.addressLine}, {a.city}, {a.state} {a.pincode}
              </p>
              <div className="mt-2 flex gap-1">
                {!a.isDefault && (
                  <Button size="sm" variant="ghost" onClick={() => makeDefault(a.id)}>
                    <Star /> Make default
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => remove(a.id)}>
                  <Trash2 /> Remove
                </Button>
              </div>
            </div>
          </div>
        ))}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button type="button" className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-primary">
              <Plus className="size-5" /> Add address
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add an address</DialogTitle>
            </DialogHeader>
            <form onSubmit={add} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="label">Label</Label>
                <Input id="label" name="label" placeholder="Home, Work..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input id="pincode" name="pincode" required minLength={4} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="addressLine">Address</Label>
                <Input id="addressLine" name="addressLine" required minLength={3} placeholder="House, street, landmark" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" required />
              </div>
              <DialogFooter className="sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="animate-spin" />} Save address
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
