import PolicyDocument from "@/components/policy/PolicyDocument";
import { privacyPolicy } from "@/lib/policyContent";

export const metadata = {
  title: "Privacy Policy",
  description:
    "Bold Cave Privacy Policy and privacy/data-rights information.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return <PolicyDocument {...privacyPolicy} />;
}
