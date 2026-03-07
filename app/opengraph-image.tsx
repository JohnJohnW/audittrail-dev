import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Audit Trail - GitHub to Compliance Evidence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        background: "#0f0f0f",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "80px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "4px",
          background: "#f97316",
        }}
      />

      {/* Wordmark */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "32px",
        }}
      >
        <span
          style={{
            fontSize: "56px",
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-1px",
          }}
        >
          Audit
        </span>
        <span
          style={{
            fontSize: "56px",
            fontWeight: 700,
            color: "#f97316",
            letterSpacing: "-1px",
            marginLeft: "12px",
          }}
        >
          Trail
        </span>
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: "28px",
          color: "#a3a3a3",
          fontWeight: 400,
          marginBottom: "56px",
          lineHeight: 1.4,
          maxWidth: "700px",
        }}
      >
        Turn GitHub activity into audit-ready compliance evidence.
      </div>

      {/* Framework pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        {["ISO 27001", "NIST CSF", "SOC 2", "GDPR", "Essential Eight", "PCI DSS"].map(
          (framework) => (
            <div
              key={framework}
              style={{
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: "6px",
                padding: "8px 16px",
                fontSize: "16px",
                color: "#d4d4d4",
                fontWeight: 500,
              }}
            >
              {framework}
            </div>
          )
        )}
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
