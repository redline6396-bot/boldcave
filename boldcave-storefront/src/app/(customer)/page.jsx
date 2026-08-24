import HeroCarousel from '@/components/home/HeroCarousel';
import CollectionSection from '@/components/home/CollectionSection';
import ReviewsSection from '@/components/home/ReviewsSection';
import OurStorySection from '@/components/home/OurStorySection';
import FAQSection from '@/components/home/FAQSection';
import connectDB from '@/lib/db';
import { getSerializedHomepageSettings } from '@/lib/homepageSettings';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let homepageSettings = null;

  try {
    await connectDB();
    homepageSettings = await getSerializedHomepageSettings();
  } catch {
    homepageSettings = null;
  }

  return (
    <div>
      <HeroCarousel initialHeroSlides={homepageSettings?.heroSlides || []} />
      <CollectionSection />
      <OurStorySection />
      <ReviewsSection />
      <FAQSection />
    </div>
  );
}
