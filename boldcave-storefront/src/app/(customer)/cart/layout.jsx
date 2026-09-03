import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata = {
  title: "Cart",
  robots: PRIVATE_ROBOTS,
};

export default function CartLayout({ children }) {
  return children;
}
