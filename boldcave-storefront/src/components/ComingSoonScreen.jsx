const COMING_SOON_DESKTOP_IMAGE =
  "/images/coming-soon/coming-soon-desktop.png";
const COMING_SOON_MOBILE_IMAGE =
  "/images/coming-soon/coming-soon-mobile.png";

export default function ComingSoonScreen() {
  return (
    <main
      className="h-[100svh] w-screen overflow-hidden bg-black"
      aria-label="Bold Cave coming soon"
    >
      <picture className="block h-full w-full">
        <source
          media="(max-width: 740px)"
          srcSet={COMING_SOON_MOBILE_IMAGE}
        />
        <source
          media="(min-width: 741px)"
          srcSet={COMING_SOON_DESKTOP_IMAGE}
        />
        <img
          src={COMING_SOON_DESKTOP_IMAGE}
          alt="Bold Cave coming soon"
          className="h-full w-full object-contain object-center min-[741px]:object-cover"
          draggable="false"
        />
      </picture>
    </main>
  );
}
