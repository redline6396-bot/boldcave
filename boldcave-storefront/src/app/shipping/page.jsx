import PolicyDocument from "@/components/policy/PolicyDocument";
import { shippingPolicy } from "@/lib/policyContent";

export const metadata = {
  title: "Orders & Shipping Policy | BOLD CAVE",
  description: "BOLD CAVE Orders & Shipping Policy.",
};

export default function ShippingPage() {
  return <PolicyDocument {...shippingPolicy} />;
}
