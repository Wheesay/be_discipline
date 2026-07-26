import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://be-discipline.example"),
  title: "Be Discipline — Promises made. Proof kept.",
  description:
    "Set daily promises, build weekly exercise and food momentum, and stay accountable to someone in your corner.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Be Discipline",
    description: "Promises made. Proof kept.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Be Discipline",
    description: "Daily goals. Weekly momentum. Real accountability.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
