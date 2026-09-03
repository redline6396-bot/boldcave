import PolicyDocument from "@/components/policy/PolicyDocument";
import { returnsPolicy } from "@/lib/policyContent";

export const metadata = {
  title: "Cancellation, Returns & Refunds",
  description: "Bold Cave Cancellation, Returns & Refunds Policy.",
  alternates: {
    canonical: "/returns",
  },
};

export default function ReturnsPage() {
  return <PolicyDocument {...returnsPolicy} />;
}
