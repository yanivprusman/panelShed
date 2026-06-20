import { GENERIC_WHATSAPP_URL, TEL_URL, PHONE_DISPLAY } from "./contact";
import { WhatsAppIcon, PhoneIcon } from "./icons";

/**
 * Bottom contact strip — WhatsApp + phone, aligned to the RTL start (left edge)
 * with a hairline top border. Ported from the imported design.
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
