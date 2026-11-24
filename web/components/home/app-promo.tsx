import { Bell, Heart, MapPin } from "lucide-react";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/config";
import { AppleLogo, PlayLogo, StoreBadge } from "./promo-banners";

const PERKS = [
  { icon: MapPin, text: "Pros sorted by distance from where you are" },
  { icon: Heart, text: "Save the ones you trust for next time" },
  { icon: Bell, text: "Replies and updates as notifications" },
];

/** The KaajVa app: live on the App Store, Android on the way. */
export function AppPromo() {
  return (
    <div className="flex h-full flex-col justify-between gap-8 rounded-lg border-[1.5px] border-ink-rule bg-card p-7 sm:p-10">
      <div>
        <h2 className="text-3xl font-extrabold leading-[1.02] tracking-[-0.03em] md:text-[2.5rem]">Get the KaajVa app</h2>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          The quickest way to find someone next time something breaks. Free, with no sign-up needed to search and call.
        </p>
        <ul className="mt-6 grid gap-3 border-t pt-6 text-[15px]">
          {PERKS.map((p) => (
            <li key={p.text} className="flex items-start gap-2.5">
              <p.icon className="mt-0.5 size-4 shrink-0 text-cta-strong" aria-hidden />
              <span className="text-foreground/85">{p.text}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {APP_STORE_URL && (
          <StoreBadge href={APP_STORE_URL} caption="Download on the" name="App Store">
            <AppleLogo />
          </StoreBadge>
        )}
        {PLAY_STORE_URL ? (
          <StoreBadge href={PLAY_STORE_URL} caption="GET IT ON" name="Google Play">
            <PlayLogo />
          </StoreBadge>
        ) : (
          <span className="inline-flex h-12 items-center gap-2.5 rounded-lg border border-dashed border-input px-4 text-muted-foreground" aria-label="Android app coming soon">
            <PlayLogo />
            <span className="flex flex-col leading-none">
              <span className="text-[10px] font-medium tracking-wide">ANDROID</span>
              <span className="mt-0.5 text-base font-semibold text-foreground/80">Coming soon</span>
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
