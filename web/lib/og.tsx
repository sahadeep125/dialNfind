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
        background: "linear-gradient(135deg, #3f51e0 0%, #1e2a78 100%)",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34, fontWeight: 700 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "white", color: "#3f51e0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 }}>
          D
        </div>
        DialNFind
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 30, color: "#c7cdfb", textTransform: "uppercase", letterSpacing: 2 }}>{eyebrow}</div>
        <div style={{ fontSize: title.length > 40 ? 64 : 76, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
        {subtitle ? <div style={{ fontSize: 34, color: "#e2e6ff" }}>{subtitle}</div> : null}
      </div>
      <div style={{ fontSize: 28, color: "#c7cdfb" }}>{footer ?? "Find trusted local pros near you. Call them directly."}</div>
    </div>
  );
}
