import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for iOS, drawn from the same shapes as app/icon.svg. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #5566f2, #3a3fc4)" }}>
        <svg width="112" height="112" viewBox="0 0 40 40">
          <path d="M20 8.5c-5.1 0-9 3.9-9 8.9 0 6.2 7.4 13 8.2 13.7.5.4 1.1.4 1.6 0 .8-.7 8.2-7.5 8.2-13.7 0-5-3.9-8.9-9-8.9Z" fill="#fff" />
        </svg>
      </div>
    ),
    size,
  );
}
