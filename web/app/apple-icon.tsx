import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for iOS, drawn from the same shapes as app/icon.svg. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#14304f" }}>
        <svg width="112" height="112" viewBox="0 0 40 40">
          <path d="M20 8c-5.2 0-9.2 4-9.2 9.1 0 6.4 7.6 13.4 8.4 14.1.5.4 1.1.4 1.6 0 .8-.7 8.4-7.7 8.4-14.1C29.2 12 25.2 8 20 8Z" fill="#fff" />
          <circle cx="20" cy="17.2" r="3.6" fill="#c2410c" />
        </svg>
      </div>
    ),
    size,
  );
}
