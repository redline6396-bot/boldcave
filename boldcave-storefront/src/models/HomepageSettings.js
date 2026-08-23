import mongoose from "mongoose";

const heroSlideSchema = new mongoose.Schema(
  {
    desktopImage: { type: String, trim: true, default: "" },
    mobileImage: { type: String, trim: true, default: "" },
    link: { type: String, trim: true, default: "/collection" },
  },
  { _id: false }
);

const featuredReviewSchema = new mongoose.Schema(
  {
    image: { type: String, trim: true, default: "" },
    name: { type: String, trim: true, default: "" },
    text: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const homepageSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "global",
      immutable: true,
    },
    heroSlides: {
      type: [heroSlideSchema],
      default: [],
    },
    featuredReviews: {
      type: [featuredReviewSchema],
      default: [],
    },
    collectionFragranceCount: { type: Number, min: 0, default: 5 },
    collectionPersonalityCount: { type: Number, min: 0, default: 5 },
  },
  { timestamps: true }
);

if (mongoose.models.HomepageSettings && !mongoose.models.HomepageSettings.schema?.path("collectionFragranceCount")) {
  delete mongoose.models.HomepageSettings;
}

const ActiveHomepageSettings =
  mongoose.models.HomepageSettings ||
  mongoose.model("HomepageSettings", homepageSettingsSchema);

export default ActiveHomepageSettings;
