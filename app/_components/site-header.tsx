import {
  BRAND,
  SLOGAN,
  GENERIC_WHATSAPP_URL,
  TEL_URL,
  PHONE_DISPLAY,
} from "./contact";
import { WhatsAppIcon, PhoneIcon } from "./icons";

/**
 * Top brand bar: logo badge + name + slogan on the right (RTL start), and the
 * WhatsApp + phone contact links on the left. Ported from the imported design.
 */
export default function SiteHeader() {
  return (
    <header
      data-id="site-header"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 16,
        marginBottom: 30,
        borderBottom: "1px solid #ececec",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div data-id="header-brand" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          data-id="header-logo"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "#2f8fd6",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 16,
          }}
        >
          פ
        </span>
        <span
          data-id="header-brand-name"
          style={{ fontWeight: 800, fontSize: 19, color: "#2f2f2f", letterSpacing: "-.2px" }}
        >
          {BRAND}
        </span>
        <span
          data-id="header-divider"
          style={{ alignSelf: "stretch", width: 1, background: "#e2e2e2", margin: "3px 2px" }}
        />
        <span data-id="header-slogan" style={{ fontWeight: 500, fontSize: 12.5, color: "#8a8a8a" }}>
          {SLOGAN}
        </span>
      </div>

      <div data-id="header-contact" style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <a
          data-id="header-whatsapp"
          href={GENERIC_WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="וואטסאפ"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            textDecoration: "none",
            color: "#2f2f2f",
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          <WhatsAppIcon size={20} />
          וואטסאפ
        </a>
        <a
          data-id="header-phone"
          href={TEL_URL}
          dir="ltr"
          style={{
            textDecoration: "none",
            color: "#2f2f2f",
            fontWeight: 700,
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <PhoneIcon size={17} />
          {PHONE_DISPLAY}
        </a>
      </div>
    </header>
  );
}
