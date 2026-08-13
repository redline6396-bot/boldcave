import "./globals.css";
import NotificationProvider from "@/context/NotificationContext";
import Notification from "@/components/Notification";
import LayoutWrapper from "@/components/LayoutWrapper";

export const metadata = {
  title: "Admin Panel",
  description: "Admin Panel",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <NotificationProvider>
          <Notification />
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </NotificationProvider>
      </body>
    </html>
  );
}
