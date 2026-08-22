import PolicyDocument from "@/components/policy/PolicyDocument";
import { termsPolicy } from "@/lib/policyContent";

export const metadata = {
  title: "Terms & Conditions | BOLD CAVE",
  description: "BOLD CAVE Terms & Conditions.",
};

export default function TermsPage() {
  return <PolicyDocument {...termsPolicy} />;
}
