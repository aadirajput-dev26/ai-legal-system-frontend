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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0f0f" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://legaldesk.co.in"),
  title: {
    default: "LegalDesk — AI Legal Practice & Case Management",
    template: "%s | LegalDesk",
  },
  description:
    "Next-generation AI legal practice management platform for Indian advocates and law firms. Seamlessly manage case dockets, draft legal notices, track court hearings, and automate case intelligence.",
  keywords: [
    "LegalDesk",
    "AI legal system",
    "legal practice management software India",
    "Indian law firm software",
    "advocate case diary",
    "High Court cause list tracker",
    "legal drafting studio",
    "legal notice generator India",
    "matter management software",
    "court appearance calendar",
    "court docket management",
    "advocate billing and fees",
    "e-Courts case tracker",
    "legal AI assistant",
  ],
  authors: [{ name: "LegalDesk Technologies", url: "https://legaldesk.co.in" }],
  creator: "LegalDesk",
  publisher: "LegalDesk",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "LegalDesk — AI Legal Practice & Case Management",
    description:
      "Intelligent legal practice management and case intelligence platform tailored for Indian advocates and modern law firms.",
    url: "https://legaldesk.co.in",
    siteName: "LegalDesk",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LegalDesk — AI Legal Practice & Case Management",
    description:
      "Intelligent legal practice management, drafting, and case intelligence for advocates.",
    creator: "@legaldesk",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
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
