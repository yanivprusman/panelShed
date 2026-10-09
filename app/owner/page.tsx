import { isOwner, ownerConfigured } from "@/lib/owner-auth";
import OwnerSignIn from "./owner-sign-in";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "כניסת מנהל | פאנל-שד", robots: { index: false } };

/**
 * Sign this browser in as the shop owner, once per device. Being signed in is
 * what makes the "הפקת הצעת מחיר" button appear on the product card.
 */
export default async function OwnerPage() {
  return <OwnerSignIn configured={ownerConfigured()} signedIn={await isOwner()} />;
}
