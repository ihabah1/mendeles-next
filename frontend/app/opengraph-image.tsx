import { ImageResponse } from "next/og";

export const alt = "Mendeles — AI-powered marketing and business growth";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0F172A 0%, #312E81 55%, #6F42F5 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 44,
            padding: "60px 80px",
          }}
        >
          <div
            style={{
              width: 190,
              height: 190,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 48,
              background: "#6F42F5",
              boxShadow: "0 28px 70px rgba(0, 0, 0, 0.3)",
              fontSize: 118,
              fontWeight: 900,
            }}
          >
            M
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 94, fontWeight: 900, letterSpacing: -4 }}>Mendeles</div>
            <div style={{ marginTop: 18, fontSize: 34, color: "#DDD6FE", fontWeight: 600 }}>
              AI-powered marketing and business growth
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
