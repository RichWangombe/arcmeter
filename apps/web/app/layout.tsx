import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "ArcMeter",
  description: "ArcMeter x402 demo dashboard"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
