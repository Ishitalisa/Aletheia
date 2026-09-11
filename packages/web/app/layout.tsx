import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aletheia — verify the claim, not the document",
  description:
    "Privacy-preserving credential verification. Prove your age, nationality, or that a credential " +
    "has not expired with a zero-knowledge proof on Ethereum — the verifier learns the answer, " +
    "never the data. Phase 1 uses a clearly labelled mock issuer.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
