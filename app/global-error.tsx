"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#0d0a08",
          color: "#e8e2d9",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "1.75rem" }}>Something interrupted that</h1>
        <p style={{ color: "#b3aca0", maxWidth: "28rem", lineHeight: 1.6 }}>
          That is on our end, not you. Try again, or reload the page.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            borderRadius: "9999px",
            background: "#c9a227",
            color: "#0d0a08",
            padding: "1rem 2rem",
            fontSize: "1.125rem",
            fontWeight: 600,
            border: "none",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
