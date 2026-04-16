import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "MuSync MVP",
  description: "Focus music app with login, generation, and focus sessions",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-ink text-white antialiased">{children}</body>
    </html>
  );
}
