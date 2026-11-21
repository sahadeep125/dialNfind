import { OG_LOGO } from "./og-logo";

/** Shared look for the generated social preview images (1200 x 630). */
export const OG_SIZE = { width: 1200, height: 630 };

export function OgFrame({ eyebrow, title, subtitle, footer }: { eyebrow: string; title: string; subtitle?: string; footer?: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#042161",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse only draws plain <img>. */}
        <img src={OG_LOGO.src} width={OG_LOGO.width} height={OG_LOGO.height} alt="KaajVa" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 30, color: "#fd8003", textTransform: "uppercase", letterSpacing: 2 }}>{eyebrow}</div>
        <div style={{ fontSize: title.length > 40 ? 64 : 76, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
        {subtitle ? <div style={{ fontSize: 34, color: "#e6eaf4" }}>{subtitle}</div> : null}
      </div>
      <div style={{ fontSize: 28, color: "#c3cbe0" }}>{footer ?? "kaajva.in · Find trusted local pros near you. Call them directly."}</div>
    </div>
  );
}
