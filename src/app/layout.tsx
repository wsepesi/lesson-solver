import { type Metadata } from "next";
import "./globals.css";
import { SupabaseProvider } from "./providers";
import { Toaster } from "@/components/ui/toaster";
import MobileDetector from "@/components/MobileDetector";

export const metadata: Metadata = {
  title: "Lesson Solver",
  description: "Schedule lessons with ease",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SupabaseProvider>
          <MobileDetector />
          {children}
          <Toaster />
        </SupabaseProvider>
      </body>
    </html>
  );
}