import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Aloud. Beauty, aloud.";

// Rendered programmatically so the text is always exact.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "90px",
          background: "radial-gradient(120% 90% at 50% 0%, #171310 0%, #0d0a08 60%)",
          color: "#e8e2d9",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 54 }}>
          {[40, 78, 100, 60, 34].map((h, i) => (
            <div
              key={i}
              style={{ width: 12, height: `${h}%`, borderRadius: 6, background: "#c9a227" }}
            />
          ))}
        </div>
        <div style={{ fontSize: 128, fontWeight: 600, marginTop: 24, letterSpacing: -2 }}>
          Beauty, aloud.
        </div>
        <div style={{ fontSize: 40, color: "#b3aca0", marginTop: 16, maxWidth: 900 }}>
          The first beauty AI a blind shopper can use alone, with the screen off.
        </div>
      </div>
    ),
    { ...size },
  );
}
