import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";

const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin", "cyrillic"],
  variable: "--font-pixel",
});

export const metadata: Metadata = {
  title: "Interactive Learning Game",
  description: "MVP-1: responsibility mission with 3D scene and dialogue",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={pixelFont.variable}>{children}</body>
    </html>
  );
}
