import PolicyDocument from "@/components/policy/PolicyDocument";
import { privacyPolicy } from "@/lib/policyContent";

export const metadata = {
  title: "Privacy Policy | BOLD CAVE",
  description:
    "BOLD CAVE Privacy Policy and privacy/data-rights information.",
};

export default function PrivacyPage() {
  return <PolicyDocument {...privacyPolicy} />;
}
