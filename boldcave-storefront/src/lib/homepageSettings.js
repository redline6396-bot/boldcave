import HomepageSettings from "@/models/HomepageSettings";
import { cleanString } from "@/lib/validation";

const HOMEPAGE_SETTINGS_KEY = "global";
const SLOT_COUNT = 3;
const DEFAULT_COLLECTION_COUNT = 5;
const MAX_COLLECTION_COUNT = 99;
const HOMEPAGE_SETTINGS_CACHE_TTL_MS = 60 * 1000;

const cacheStore = globalThis.__homepageSettingsCache || {
  entry: null,
};

globalThis.__homepageSettingsCache = cacheStore;

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

function normalizeCollectionCount(value, fallback = DEFAULT_COLLECTION_COUNT) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.min(MAX_COLLECTION_COUNT, Math.floor(number));
}

export function serializeHomepageSettings(settings) {
  return {
    heroSlides: normalizeHeroSlides(settings?.heroSlides),
    featuredReviews: normalizeFeaturedReviews(settings?.featuredReviews),
    collectionFragranceCount: normalizeCollectionCount(settings?.collectionFragranceCount),
    collectionPersonalityCount: normalizeCollectionCount(settings?.collectionPersonalityCount),
    updatedAt: settings?.updatedAt || null,
  };
}

export function clearHomepageSettingsCache() {
  cacheStore.entry = null;
}

export async function getHomepageSettings() {
  return HomepageSettings.findOneAndUpdate(
    { key: HOMEPAGE_SETTINGS_KEY },
    {
      $setOnInsert: {
        key: HOMEPAGE_SETTINGS_KEY,
        heroSlides: defaultHeroSlides(),
        featuredReviews: defaultFeaturedReviews(),
        collectionFragranceCount: DEFAULT_COLLECTION_COUNT,
        collectionPersonalityCount: DEFAULT_COLLECTION_COUNT,
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
}

export async function getSerializedHomepageSettings({ cache = true } = {}) {
  if (cache && cacheStore.entry?.expiresAt > Date.now()) {
    return cacheStore.entry.value;
  }

  const value = serializeHomepageSettings(await getHomepageSettings());

  if (cache) {
    cacheStore.entry = {
      value,
      expiresAt: Date.now() + HOMEPAGE_SETTINGS_CACHE_TTL_MS,
    };
  }

  return value;
}

export async function updateHomepageSettings({
  heroSlides,
  featuredReviews,
  collectionFragranceCount,
  collectionPersonalityCount,
}) {
  const settings = await HomepageSettings.findOneAndUpdate(
    { key: HOMEPAGE_SETTINGS_KEY },
    {
      $set: {
        heroSlides: normalizeHeroSlides(heroSlides),
        featuredReviews: normalizeFeaturedReviews(featuredReviews),
        collectionFragranceCount: normalizeCollectionCount(collectionFragranceCount),
        collectionPersonalityCount: normalizeCollectionCount(collectionPersonalityCount),
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  cacheStore.entry = {
    value: serializeHomepageSettings(settings),
    expiresAt: Date.now() + HOMEPAGE_SETTINGS_CACHE_TTL_MS,
  };

  return settings;
}
