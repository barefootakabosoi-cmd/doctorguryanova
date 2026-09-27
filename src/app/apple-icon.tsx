import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 120,
          background: "#1A1A1A",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#C5A059",
          borderRadius: "40px",
          fontFamily: "serif",
          fontWeight: 700,
        }}
      >
        Г
      </div>
    ),
    { ...size }
  );
}
