import HeroCarousel from '@/components/home/HeroCarousel';
import CollectionSection from '@/components/home/CollectionSection';
import ReviewsSection from '@/components/home/ReviewsSection';
import OurStorySection from '@/components/home/OurStorySection';
import FAQSection from '@/components/home/FAQSection';
import { withRuntimeDatabase } from '@/lib/cloudflareMongoose';
import { getSerializedHomepageSettings } from '@/lib/homepageSettings';
import { getFeaturedCatalogProducts } from '@/lib/products/public';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let homepageSettings = null;
  let featuredProducts = [];

  try {
    const [settings, products] = await withRuntimeDatabase(() =>
      Promise.all([
        getSerializedHomepageSettings(),
        getFeaturedCatalogProducts(),
      ])
    );
    homepageSettings = settings;
    featuredProducts = products;
  } catch {
    homepageSettings = null;
    featuredProducts = [];
  }

  return (
    <div>
      <HeroCarousel initialHeroSlides={homepageSettings?.heroSlides || []} />
      <CollectionSection
        initialProducts={featuredProducts}
        initialSettings={homepageSettings}
      />
      <OurStorySection />
      <ReviewsSection
        initialFeaturedReviews={homepageSettings?.featuredReviews || []}
      />
      <FAQSection />
    </div>
  );
}
