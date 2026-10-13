import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Outfit, Newsreader } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { OrgProvider } from "@/lib/org-context";
import { BillingProvider } from "@/lib/billing-context";
import { TooltipProvider } from "@/components/ui/tooltip";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const heading = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
});

const serif = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0d0f0f",
};

export const metadata: Metadata = {
  title: "LegalDesk — AI Legal Case Management",
  description: "Intelligent legal case management platform powered by AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${heading.variable} ${serif.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#0d0f0f] text-[#f3f4f5]">
        <AuthProvider>
          <OrgProvider>
            <BillingProvider>
              <TooltipProvider>{children}</TooltipProvider>
            </BillingProvider>
          </OrgProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
