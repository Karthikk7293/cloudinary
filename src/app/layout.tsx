import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import ClientShell from "./client-shell";

export const metadata: Metadata = {
  title: "Cloudinary Media Admin",
  description: "Internal media governance system",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ClientShell>
          {children}
        </ClientShell>
      </body>
    </html>
  );
}
