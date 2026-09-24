"use client";

import { useState } from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FormAlert, fieldA11y } from "@/components/form";
import { clientApi, ClientApiError } from "@/lib/client";
import { email, normalizePhone, optionalPhone } from "@/lib/validation";

const TOPICS = ["General question", "Problem with a provider", "Listing my business", "Report wrong information", "Partnerships"];

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80, "Keep it under 80 characters"),
  email,
  phone: optionalPhone,
  subject: z.string().min(1, "Choose a topic"),
  message: z.string().trim().min(10, "Tell us a little more, at least 10 characters").max(3000, "Keep the message under 3,000 characters"),
});
type Values = z.infer<typeof schema>;

export function ContactForm({ defaultName = "", defaultEmail = "", signedIn = false }: { defaultName?: string; defaultEmail?: string; signedIn?: boolean }) {
  const [sent, setSent] = useState<{ id: number; reference: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const defaults: Values = { name: defaultName, email: defaultEmail, phone: "", subject: TOPICS[0], message: "" };
  const { register, control, handleSubmit, reset, watch, formState } = useForm<Values>({ resolver: zodResolver(schema), mode: "onTouched", defaultValues: defaults });
  const { errors, isSubmitting } = formState;
  const messageLength = watch("message").length;

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      const result = await clientApi<{ id: number; reference: string }>("/contact", {
        method: "POST",
        body: JSON.stringify({ name: v.name.trim(), email: v.email.trim(), phone: v.phone ? normalizePhone(v.phone) : "", subject: v.subject, message: v.message.trim() }),
      });
      setSent(result);
      reset(defaults);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not send your message");
    }
  });

  if (sent) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="size-7" />
        </span>
        <h3 className="mt-4 text-xl font-bold">Message sent</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Thanks for reaching out. Your reference is <span className="font-semibold text-foreground">{sent.reference}</span>. Our support team replies within one working day{signedIn ? "." : " by email."}
        </p>
        {signedIn && (
          <Button asChild className="mt-6">
            <Link href={`/dashboard/support/${sent.id}`}>Follow the conversation</Link>
          </Button>
        )}
        <Button variant="outline" className="mt-3" onClick={() => setSent(null)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
      {error && (
        <div className="sm:col-span-2">
          <FormAlert message={error} />
        </div>
      )}
      <Field id="name" label="Full name" error={errors.name} required>
        <Input {...fieldA11y("name", errors.name)} autoComplete="name" maxLength={80} placeholder="Your name" {...register("name")} />
      </Field>
      <Field id="email" label="Email" error={errors.email} required>
        <Input {...fieldA11y("email", errors.email)} type="email" autoComplete="email" inputMode="email" maxLength={254} placeholder="you@example.com" {...register("email")} />
      </Field>
      <Field id="phone" label="Phone" error={errors.phone} optional>
        <Input {...fieldA11y("phone", errors.phone)} type="tel" autoComplete="tel" inputMode="tel" maxLength={16} placeholder="98xxx xxxxx" {...register("phone")} />
      </Field>
      <Field id="subject" label="Topic" error={errors.subject} required>
        <Controller
          control={control}
          name="subject"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="subject" className="w-full" aria-invalid={errors.subject ? true : undefined}>
                <SelectValue placeholder="Choose a topic" />
              </SelectTrigger>
              <SelectContent>
                {TOPICS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
      <Field id="message" label="Message" error={errors.message} hint={`${messageLength} of 3,000 characters`} required className="sm:col-span-2">
        <Textarea {...fieldA11y("message", errors.message, true)} rows={6} maxLength={3000} placeholder="How can we help?" {...register("message")} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />} Send message
        </Button>
      </div>
    </form>
  );
}
