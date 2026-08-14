import AnnouncementBar from "@/components/layout/AnnouncementBar";
import MainNavbar from "@/components/layout/MainNavbar";

export const metadata = {
  title: "Navbar Preview",
};

export default function NavbarPreviewPage() {
  return (
    <>
      <AnnouncementBar />
      <MainNavbar />
    </>
  );
}
