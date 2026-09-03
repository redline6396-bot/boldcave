import PolicyDocument from "@/components/policy/PolicyDocument";
import { shippingPolicy } from "@/lib/policyContent";

export const metadata = {
  title: "Orders & Shipping Policy",
  description: "Bold Cave Orders & Shipping Policy.",
  alternates: {
    canonical: "/shipping",
  },
};

export default function ShippingPage() {
  return <PolicyDocument {...shippingPolicy} />;
}
