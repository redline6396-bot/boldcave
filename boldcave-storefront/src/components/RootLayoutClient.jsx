"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import MainNavbar from "@/components/layout/MainNavbar";
import Footer from "@/components/layout/Footer";
import Notification from "@/components/Notification";
import CookieConsent from "@/components/CookieConsent";
import AuthModal from "@/features/customer/auth/AuthModal";

export default function RootLayoutClient({ children }) {
  const pathname = usePathname();
  const isLoginPage = ["/login", "/auth/login"].includes(pathname);
  const shouldShowSiteChrome = !isLoginPage;

  // Store last visited path (excluding login pages)
  useEffect(() => {
    const loginPaths = ["/login", "/auth/login"];

    if (!loginPaths.includes(pathname)) {
      localStorage.setItem("lastVisitedPath", pathname);
    }
  }, [pathname]);

  return (
    <div
      style={{
        paddingTop: "0px",
        background: "transparent",
        minHeight: "100vh",
      }}
    >
      <Notification />
      <AuthModal />

      {shouldShowSiteChrome && (
        <>
          <AnnouncementBar />
          <MainNavbar />
        </>
      )}

      <main>{children}</main>

      {shouldShowSiteChrome && <Footer />}
      {shouldShowSiteChrome && <CookieConsent />}
    </div>
  );
}
