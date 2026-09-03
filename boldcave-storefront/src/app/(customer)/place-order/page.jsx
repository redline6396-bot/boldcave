import CheckoutPage from "@/features/customer/checkout/CheckoutPage";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata = {
  title: "Checkout",
  robots: PRIVATE_ROBOTS,
};

export default function Page() {
  return <CheckoutPage />;
}
