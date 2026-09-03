import { redirect } from "next/navigation";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata = {
  title: "Orders",
  robots: PRIVATE_ROBOTS,
};

export default function Page() {
  redirect("/profile?section=orders");
}
