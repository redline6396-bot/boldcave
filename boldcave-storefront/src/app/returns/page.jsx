import PolicyDocument from "@/components/policy/PolicyDocument";
import { returnsPolicy } from "@/lib/policyContent";

export const metadata = {
  title: "Cancellation, Returns & Refunds | BOLD CAVE",
  description: "BOLD CAVE Cancellation, Returns & Refunds Policy.",
};

export default function ReturnsPage() {
  return <PolicyDocument {...returnsPolicy} />;
}
