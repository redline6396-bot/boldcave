import PolicyDocument from "@/components/policy/PolicyDocument";
import { termsPolicy } from "@/lib/policyContent";

export const metadata = {
  title: "Terms & Conditions",
  description: "Bold Cave Terms & Conditions.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return <PolicyDocument {...termsPolicy} />;
}
