import type { Metadata } from "next";
import "./globals.css";
import FeedbackChatClient from "./feedback-chat-client";
import GoogleAdsTag from "./_components/google-ads-tag";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `מחסן גינה פאנל מבודד — ${SITE_NAME}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "מחסן גינה",
    "מחסן מבודד",
    "מחסן פאנל מבודד",
    "מחסן גינה מבודד",
    "מבנה יביל",
    "חדר בחצר",
    "משרד בחצר",
    "מחסן גינה איכותי",
    "פאנל שד",
  ],
  openGraph: {
    type: "website",
    locale: "he_IL",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `מחסן גינה פאנל מבודד — ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/products/lehamhasha.png",
        width: 1408,
        height: 768,
        alt: "מחסן גינה פאנל מבודד",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `מחסן גינה פאנל מבודד — ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    images: ["/products/lehamhasha.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <GoogleAdsTag />
        <a href="#main-content" className="skip-link" data-id="skip-to-content">
          דלג לתוכן הראשי
        </a>
        {children}
        <FeedbackChatClient />
      </body>
    </html>
  );
}
