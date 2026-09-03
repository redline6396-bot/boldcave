import OrderDetails from "@/features/customer/orders/OrderDetails";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata = {
  title: "Order Details",
  robots: PRIVATE_ROBOTS,
};

export default function Page() {
  return <OrderDetails />;
}
