import AccountPage from "@/features/customer/account/AccountPage";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata = {
  title: "Profile",
  robots: PRIVATE_ROBOTS,
};

export default function ProfilePage() {
  return <AccountPage />;
}
