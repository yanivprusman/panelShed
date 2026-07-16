import Link from "next/link";
import {
  GENERIC_WHATSAPP_URL,
  TEL_URL,
  PHONE_DISPLAY,
  LEGAL_NAME,
  BUSINESS_ID,
} from "./contact";
import { WhatsAppIcon, PhoneIcon } from "./icons";

const legalLink: React.CSSProperties = {
  color: "#7a7a7a",
  fontWeight: 600,
  fontSize: 13,
  textDecoration: "underline",
};

/**
 * Bottom contact strip — WhatsApp + phone, aligned to the RTL start (left edge)
 * with a hairline top border, plus the legal pages and the business identity
 * line (legal name + ע.מ — a required trust signal for an Israeli online
 * store and for Google Merchant Center).
 */
export default function SiteFooter() {
  return (
    <footer
      data-id="site-footer"
      style={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 22,
        marginTop: 56,
        paddingTop: 22,
        borderTop: "1px solid #ececec",
        flexWrap: "wrap",
      }}
    >
      <span
        data-id="footer-legal-links"
        style={{
          display: "inline-flex",
          gap: 14,
          marginInlineEnd: "auto",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Link data-id="footer-accessibility" href="/accessibility" style={legalLink}>
          הצהרת נגישות
        </Link>
        <Link data-id="footer-returns" href="/returns" style={legalLink}>
          מדיניות ביטול והחזרות
        </Link>
        <Link data-id="footer-terms" href="/terms" style={legalLink}>
          תקנון
        </Link>
        <Link data-id="footer-privacy" href="/privacy" style={legalLink}>
          מדיניות פרטיות
        </Link>
        <span
          data-id="footer-business-identity"
          style={{ color: "#9a9a9a", fontWeight: 600, fontSize: 13 }}
        >
          {LEGAL_NAME} · ע.מ <span dir="ltr">{BUSINESS_ID}</span>
        </span>
      </span>
      <a
        data-id="footer-whatsapp"
        href={GENERIC_WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          color: "#3a3a3a",
          fontWeight: 600,
          fontSize: 14,
          textDecoration: "none",
        }}
      >
        <WhatsAppIcon size={20} />
        וואטסאפ
      </a>
      <a
        data-id="footer-phone"
        href={TEL_URL}
        dir="ltr"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          color: "#2f2f2f",
          fontWeight: 800,
          fontSize: 18,
          textDecoration: "none",
        }}
      >
        <PhoneIcon size={18} />
        {PHONE_DISPLAY}
      </a>
    </footer>
  );
}
