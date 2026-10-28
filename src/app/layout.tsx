import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Outfit, Newsreader } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { OrgProvider } from "@/lib/org-context";
import { BillingProvider } from "@/lib/billing-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";

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
};

export const metadata: Metadata = {
  title: "LegalDesk — AI Legal Case Management",
  description: "Intelligent legal case management platform powered by AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${heading.variable} ${serif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground transition-colors duration-200">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <OrgProvider>
              <BillingProvider>
                <TooltipProvider>{children}</TooltipProvider>
              </BillingProvider>
            </OrgProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
