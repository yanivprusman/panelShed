import Script from "next/script";
import { GADS_ID } from "@/lib/gtag";

/**
 * Loads the Google Ads global site tag (gtag.js) once — only when
 * NEXT_PUBLIC_GOOGLE_ADS_ID is set. Rendered from the root layout, so every page
 * (landing + checkout success) can fire conversions via lib/gtag helpers. When
 * the env var is blank this renders nothing at all.
 */
export default function GoogleAdsTag() {
  if (!GADS_ID) return null;
  return (
    <>
      <Script
        id="gads-lib"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GADS_ID}`}
      />
      <Script id="gads-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GADS_ID}');`}
      </Script>
    </>
  );
}
