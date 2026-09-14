import Script from "next/script";
import { GADS_ID } from "@/lib/gtag";
import PhoneTapConversion from "./phone-tap-conversion";

/**
 * Loads the Google Ads global site tag (gtag.js) once and counts taps on the
 * business phone number. Rendered from the root layout, so every page (landing
 * + checkout success) can fire conversions via lib/gtag helpers. The ids are
 * committed in lib/gtag.ts — there is no configuration that can leave this
 * silently empty.
 */
export default function GoogleAdsTag() {
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
      <PhoneTapConversion />
    </>
  );
}
