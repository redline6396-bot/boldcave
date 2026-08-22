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
  },
  { timestamps: true }
);

const HomepageSettings =
  mongoose.models.HomepageSettings ||
  mongoose.model("HomepageSettings", homepageSettingsSchema);

export default HomepageSettings;
