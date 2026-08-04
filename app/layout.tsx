import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Electropico Split Sheet",
  description: "Create, sign, complete, and distribute songwriter split agreements.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
