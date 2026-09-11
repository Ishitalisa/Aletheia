import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aletheia holder flow (mock-dev)",
  description:
    "Phase 1 holder flow: extract a passport MRZ, review it, sign a mock-dev credential, prove an age claim, and submit to Sepolia — all on the device.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
