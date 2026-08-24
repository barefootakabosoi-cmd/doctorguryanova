import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 22,
          background: "#1A1A1A",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#C5A059",
          borderRadius: "6px",
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
