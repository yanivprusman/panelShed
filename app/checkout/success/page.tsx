import { Suspense } from "react";
import SuccessClient from "./success-client";

export const metadata = {
  title: "אישור תשלום | פאנל-שד",
};

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessClient />
    </Suspense>
  );
}
