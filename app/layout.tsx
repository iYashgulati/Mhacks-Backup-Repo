import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GridShift — Carbon-Aware Compute",
  description: "Find the cleanest, lowest-cost grid region and time for flexible computing workloads.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
