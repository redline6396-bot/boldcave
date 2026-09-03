import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata = {
  title: "Login",
  robots: PRIVATE_ROBOTS,
};

export default function LoginLayout({ children }) {
  return children;
}
