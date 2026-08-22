import HomepageSettings from "@/models/HomepageSettings";
import { cleanString } from "@/lib/validation";

const HOMEPAGE_SETTINGS_KEY = "global";
const SLOT_COUNT = 3;

const defaultHeroSlides = () =>
  Array.from({ length: SLOT_COUNT }, () => ({
    desktopImage: "",
    mobileImage: "",
    link: "/collection",
  }));

const defaultFeaturedReviews = () =>
  Array.from({ length: SLOT_COUNT }, () => ({
    image: "",
    name: "",
    text: "",
  }));

function normalizeHeroSlides(slides) {
  const sourceSlides = Array.isArray(slides) ? slides : [];
  return defaultHeroSlides().map((fallback, index) => {
    const slide = sourceSlides[index] || {};
    return {
      desktopImage: cleanString(slide.desktopImage, 2000),
      mobileImage: cleanString(slide.mobileImage, 2000),
      link: cleanString(slide.link, 500) || fallback.link,
    };
  });
}

function normalizeFeaturedReviews(reviews) {
  const sourceReviews = Array.isArray(reviews) ? reviews : [];
  return defaultFeaturedReviews().map((fallback, index) => {
    const review = sourceReviews[index] || {};
    return {
      image: cleanString(review.image, 2000),
      name: cleanString(review.name, 120),
      text: cleanString(review.text, 1000),
    };
  });
}

export function serializeHomepageSettings(settings) {
  return {
    heroSlides: normalizeHeroSlides(settings?.heroSlides),
    featuredReviews: normalizeFeaturedReviews(settings?.featuredReviews),
    updatedAt: settings?.updatedAt || null,
  };
}

export async function getHomepageSettings() {
  return HomepageSettings.findOneAndUpdate(
    { key: HOMEPAGE_SETTINGS_KEY },
    {
      $setOnInsert: {
        key: HOMEPAGE_SETTINGS_KEY,
        heroSlides: defaultHeroSlides(),
        featuredReviews: defaultFeaturedReviews(),
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
}

export async function getSerializedHomepageSettings() {
  return serializeHomepageSettings(await getHomepageSettings());
}

export async function updateHomepageSettings({ heroSlides, featuredReviews }) {
  return HomepageSettings.findOneAndUpdate(
    { key: HOMEPAGE_SETTINGS_KEY },
    {
      $set: {
        heroSlides: normalizeHeroSlides(heroSlides),
        featuredReviews: normalizeFeaturedReviews(featuredReviews),
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
}
