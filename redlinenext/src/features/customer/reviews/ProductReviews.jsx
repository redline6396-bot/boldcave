"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  createProductReview,
  deleteProductReview,
  fetchMyProductReview,
  fetchProductReviews,
  updateProductReview,
} from "@/lib/clientApi";

const emptyForm = {
  rating: 0,
  title: "",
  text: "",
  displayName: "",
  email: "",
  photos: [],
  files: [],
};

const REVIEWS_PER_PAGE = 5;
const MAX_REVIEW_MEDIA = 2;
const MAX_REVIEW_MEDIA_SIZE = 5 * 1024 * 1024;
const ALLOWED_REVIEW_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"];
const SORT_OPTIONS = [
  { value: "newest", label: "Most Recent" },
  { value: "oldest", label: "Oldest" },
  { value: "highest", label: "Highest Rated" },
  { value: "lowest", label: "Lowest Rated" },
];

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "";

const normalizeReview = (review) =>
  review
    ? {
        ...review,
        id: review.id || review._id,
      }
    : null;

const getReviewTime = (review) => new Date(review.createdAt || 0).getTime();

function createLocalFileId(file) {
  return `${file.name}-${file.lastModified}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export default function ProductReviews({ productId }) {
  const { user, loading: authLoading, isAuthenticated, openAuth } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState({ average: 0, count: 0, breakdown: {} });
  const [ownReview, setOwnReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [wantsReview, setWantsReview] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [sortOption, setSortOption] = useState("newest");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const sortMenuRef = useRef(null);

  const loadReviews = useCallback(async () => {
    if (!productId) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [publicResult, mine] = await Promise.all([
        fetchProductReviews(productId),
        isAuthenticated
          ? fetchMyProductReview(productId).catch(() => null)
          : Promise.resolve(null),
      ]);

      setReviews(publicResult.reviews || []);
      setRating(publicResult.rating || { average: 0, count: 0, breakdown: {} });
      setOwnReview(normalizeReview(mine));
    } catch (reviewsError) {
      setError(reviewsError.message || "Unable to load reviews.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, productId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && wantsReview) {
      const source = ownReview || emptyForm;
      setForm(buildReviewForm(source, user));
      setEditing(Boolean(ownReview));
      setShowForm(true);
      setWantsReview(false);
    }
  }, [authLoading, isAuthenticated, ownReview, user, wantsReview]);

  useEffect(() => {
    setCurrentPage(1);
  }, [ownReview?.id, reviews, sortOption]);

  useEffect(() => {
    if (!sortMenuOpen) return undefined;

    const handleSortMenuClose = (event) => {
      if (event.key === "Escape") {
        setSortMenuOpen(false);
        return;
      }

      if (
        event.type === "mousedown" &&
        sortMenuRef.current &&
        !sortMenuRef.current.contains(event.target)
      ) {
        setSortMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleSortMenuClose);
    document.addEventListener("keydown", handleSortMenuClose);

    return () => {
      document.removeEventListener("mousedown", handleSortMenuClose);
      document.removeEventListener("keydown", handleSortMenuClose);
    };
  }, [sortMenuOpen]);

  const reviewCount = Number(rating.count) || reviews.length || 0;
  const averageRating = Number(rating.average) || 0;

  const breakdown = useMemo(() => {
    const source = rating.breakdown || {};
    return [5, 4, 3, 2, 1].map((star) => {
      const count = Number(source[star]) || 0;
      return {
        star,
        count,
        percent: reviewCount ? (count / reviewCount) * 100 : 0,
      };
    });
  }, [rating, reviewCount]);

  const ownReviewForList = useMemo(() => {
    if (!ownReview) return null;

    return {
      ...ownReview,
      approved: Boolean(ownReview.approved),
      isOwnReview: true,
      user: {
        firstName: user?.firstName || "You",
        lastName: user?.lastName || "",
      },
    };
  }, [ownReview, user]);

  const displayReviews = useMemo(() => {
    const nextReviews = reviews.map((review) => {
      const isOwnReview = ownReview?.id && review.id === ownReview.id;

      return {
        ...review,
        approved: isOwnReview ? Boolean(ownReview.approved) : true,
        isOwnReview,
      };
    });

    if (!ownReviewForList) return nextReviews;

    const ownIndex = nextReviews.findIndex(
      (review) => review.id === ownReviewForList.id
    );

    if (ownIndex >= 0) {
      const mergedReviews = [...nextReviews];
      mergedReviews[ownIndex] = {
        ...mergedReviews[ownIndex],
        ...ownReviewForList,
        user: mergedReviews[ownIndex].user || ownReviewForList.user,
      };
      return mergedReviews;
    }

    return [ownReviewForList, ...nextReviews];
  }, [ownReview, ownReviewForList, reviews]);

  const sortedReviews = useMemo(() => {
    const nextReviews = [...displayReviews];

    switch (sortOption) {
      case "oldest":
        return nextReviews.sort((a, b) => getReviewTime(a) - getReviewTime(b));
      case "highest":
        return nextReviews.sort((a, b) => Number(b.rating) - Number(a.rating));
      case "lowest":
        return nextReviews.sort((a, b) => Number(a.rating) - Number(b.rating));
      case "newest":
      default:
        return nextReviews.sort((a, b) => getReviewTime(b) - getReviewTime(a));
    }
  }, [displayReviews, sortOption]);

  const totalPages = Math.max(1, Math.ceil(sortedReviews.length / REVIEWS_PER_PAGE));
  const visibleReviews = sortedReviews.slice(
    (currentPage - 1) * REVIEWS_PER_PAGE,
    currentPage * REVIEWS_PER_PAGE
  );
  const selectedSortLabel =
    SORT_OPTIONS.find((option) => option.value === sortOption)?.label ||
    SORT_OPTIONS[0].label;

  const openReviewForm = () => {
    setError("");
    setMessage("");

    if (!isAuthenticated) {
      setWantsReview(true);
      openAuth(window.location.pathname);
      return;
    }

    const source = ownReview || emptyForm;
    setForm(buildReviewForm(source, user));
    setEditing(Boolean(ownReview));
    setShowForm(true);
  };

  const closeReviewForm = () => {
    form.files.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setForm(buildReviewForm(emptyForm, user));
    setEditing(false);
    setShowForm(false);
  };

  const handleReviewFiles = (event) => {
    const nextFiles = Array.from(event.target.files || []);
    event.target.value = "";

    if (!nextFiles.length) return;

    setError("");
    setMessage("");

    setForm((current) => {
      const availableSlots =
        MAX_REVIEW_MEDIA - current.photos.length - current.files.length;

      if (availableSlots <= 0) {
        setError(`You can upload up to ${MAX_REVIEW_MEDIA} review images.`);
        return current;
      }

      const accepted = [];

      for (const file of nextFiles.slice(0, availableSlots)) {
        if (!ALLOWED_REVIEW_MEDIA_TYPES.includes(file.type)) {
          setError("Upload JPG, PNG or WEBP images only.");
          continue;
        }

        if (file.size > MAX_REVIEW_MEDIA_SIZE) {
          setError("Each review image must be 5MB or smaller.");
          continue;
        }

        accepted.push({
          id: createLocalFileId(file),
          file,
          previewUrl: URL.createObjectURL(file),
        });
      }

      return {
        ...current,
        files: [...current.files, ...accepted],
      };
    });
  };

  const removeExistingPhoto = (photoIndex) => {
    setForm((current) => ({
      ...current,
      photos: current.photos.filter((_, index) => index !== photoIndex),
    }));
  };

  const removePendingFile = (fileId) => {
    setForm((current) => {
      const removed = current.files.find((item) => item.id === fileId);
      if (removed) URL.revokeObjectURL(removed.previewUrl);

      return {
        ...current,
        files: current.files.filter((item) => item.id !== fileId),
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const validationError = validateReviewForm(form);
      if (validationError) {
        setError(validationError);
        return;
      }

      const uploadedPhotos = form.files.length
        ? await uploadReviewMedia(form.files.map((item) => item.file))
        : [];
      const photos = [...form.photos, ...uploadedPhotos].slice(
        0,
        MAX_REVIEW_MEDIA
      );
      const payload = {
        rating: Number(form.rating),
        title: form.title.trim(),
        text: form.text.trim(),
        photos,
      };

      if (editing && ownReview?.id) {
        const updated = await updateProductReview(ownReview.id, payload);
        setOwnReview(normalizeReview(updated));
        setMessage("Review updated. Pending approval before it appears publicly.");
      } else {
        const created = await createProductReview({
          productId,
          ...payload,
        });
        setOwnReview(normalizeReview(created));
        setMessage("Review submitted. Pending approval before it appears publicly.");
      }

      closeReviewForm();
      await loadReviews();
    } catch (reviewError) {
      if (reviewError.code === "REVIEW_EXISTS") {
        setError("You have already reviewed this product. Use edit to update your review.");
        await loadReviews();
      } else {
        setError(reviewError.message || "Unable to save review.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!ownReview?.id || !window.confirm("Delete your review?")) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await deleteProductReview(ownReview.id);
      setOwnReview(null);
      setShowForm(false);
      setMessage("Review deleted.");
      await loadReviews();
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete review.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white px-5 py-10 text-neutral-950 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-[1180px]">
        <h2 className="text-center text-[23px] font-semibold leading-none tracking-0 text-neutral-950 sm:text-[32px]">
          Customer Reviews
        </h2>

        {loading ? (
          <div className="mt-12 flex items-center justify-center gap-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.7} />
            Loading reviews
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-5 sm:mt-7 sm:gap-7 lg:grid-cols-[0.95fr_1.08fr_0.78fr] lg:items-center lg:gap-8">
              <div className="flex flex-col items-center text-center lg:items-start lg:border-r lg:border-neutral-200 lg:py-4 lg:pr-8 lg:text-left">
                <div className="flex items-center gap-2.5 sm:gap-3.5">
                  <Stars value={averageRating} size={18} gap={3.5} smSize={24} smGap={5} />
                  <span className="text-[13px] leading-none text-neutral-950 sm:text-[15px]">
                    {averageRating.toFixed(2)} out of 5
                  </span>
                </div>
                <p className="mt-3 text-[13px] leading-none text-neutral-700 sm:mt-4 sm:text-[15px]">
                  Based on {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
                </p>
              </div>

              <div className="space-y-2.5 sm:space-y-3.5 lg:border-r lg:border-neutral-200 lg:py-3 lg:pr-8">
                {breakdown.map((row) => (
                  <div
                    key={row.star}
                    className="grid grid-cols-[82px_minmax(0,1fr)_30px] items-center gap-3 sm:grid-cols-[96px_minmax(0,1fr)_38px] sm:gap-4"
                  >
                    <FixedStars value={row.star} />
                    <span className="h-1.5 bg-neutral-200 sm:h-2">
                      <span
                        className="block h-full bg-neutral-950"
                        style={{ width: `${row.percent}%` }}
                      />
                    </span>
                    <span className="text-right text-[12px] text-neutral-600 sm:text-[14px]">
                      {row.count}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-center lg:justify-end">
                <button
                  type="button"
                  onClick={openReviewForm}
                  disabled={saving}
                  className="h-10 min-w-[176px] cursor-pointer border border-neutral-950 bg-neutral-950 px-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-100 disabled:text-neutral-400 sm:h-12 sm:min-w-[210px] sm:px-7 sm:text-[12px]"
                >
                  {ownReview ? "EDIT REVIEW" : "WRITE A REVIEW"}
                </button>
              </div>
            </div>

            {(error || message) && (
              <p
                className={[
                  "mx-auto mt-8 max-w-[760px] border px-4 py-3 text-center text-[13px] leading-5",
                  error
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-neutral-200 bg-neutral-50 text-neutral-700",
                ].join(" ")}
              >
                {error || message}
              </p>
            )}

            <div className="mt-9 border-t border-neutral-200 sm:mt-11">
              <div className="relative flex h-[50px] items-center border-b border-neutral-200 sm:h-[60px]">
                <div ref={sortMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setSortMenuOpen((current) => !current)}
                    className="inline-flex h-8 cursor-pointer items-center gap-2 pr-2 text-[13px] text-neutral-950 transition-colors hover:text-neutral-600 sm:h-9 sm:gap-2.5 sm:text-[14px]"
                    aria-label="Sort reviews"
                    aria-haspopup="listbox"
                    aria-expanded={sortMenuOpen}
                  >
                    <span>{selectedSortLabel}</span>
                    <ChevronDown
                      className={[
                        "h-4 w-4 text-neutral-950 transition-transform duration-150",
                        sortMenuOpen ? "rotate-180" : "",
                      ].join(" ")}
                      strokeWidth={1.5}
                    />
                  </button>

                  {sortMenuOpen && (
                    <div
                      role="listbox"
                      aria-label="Sort reviews"
                      className="absolute left-0 top-[calc(100%+5px)] z-20 min-w-[138px] border border-neutral-200 bg-white py-0.5 shadow-[0_10px_24px_rgba(0,0,0,0.08)] sm:min-w-[154px]"
                    >
                      {SORT_OPTIONS.map((option) => {
                        const active = option.value === sortOption;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            role="option"
                            aria-selected={active}
                            onClick={() => {
                              setSortOption(option.value);
                              setSortMenuOpen(false);
                            }}
                            className={[
                              "block w-full cursor-pointer px-3 py-1.5 text-left text-[12px] transition-colors sm:px-3.5 sm:py-2 sm:text-[13px]",
                              active
                                ? "bg-neutral-950 text-white"
                                : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950",
                            ].join(" ")}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {showForm && (
                <InlineReviewForm
                  editing={editing}
                  form={form}
                  saving={saving}
                  onCancel={closeReviewForm}
                  onChange={setForm}
                  onFileChange={handleReviewFiles}
                  onRemoveExistingPhoto={removeExistingPhoto}
                  onRemovePendingFile={removePendingFile}
                  onSubmit={handleSubmit}
                />
              )}

              {visibleReviews.length ? (
                <div>
                  {visibleReviews.map((review) => (
                    <ReviewRow
                      key={review.id}
                      review={review}
                      saving={saving}
                      onEdit={review.isOwnReview ? openReviewForm : undefined}
                      onDelete={review.isOwnReview ? handleDelete : undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="border-b border-neutral-200 py-10 text-center">
                  <p className="text-[14px] leading-6 text-neutral-500">
                    No reviews yet. Be the first to share your experience.
                  </p>
                </div>
              )}
            </div>

            {sortedReviews.length > REVIEWS_PER_PAGE && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onChange={setCurrentPage}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}

function InlineReviewForm({
  editing,
  form,
  saving,
  onCancel,
  onChange,
  onFileChange,
  onRemoveExistingPhoto,
  onRemovePendingFile,
  onSubmit,
}) {
  const uploadedCount = form.photos.length + form.files.length;

  return (
    <form
      onSubmit={onSubmit}
      className="border-b border-neutral-200 px-4 py-9 sm:px-6"
    >
      <div className="mx-auto max-w-[620px] text-center">
        <h3 className="text-[27px] font-semibold leading-none tracking-0 text-neutral-950">
          {editing ? "Edit your review" : "Write a review"}
        </h3>

        <div className="mt-8">
          <p className="text-[16px] text-neutral-950">Rating</p>
          <InteractiveStars
            value={Number(form.rating) || 0}
            onChange={(rating) => onChange((current) => ({ ...current, rating }))}
          />
        </div>

        <label className="mt-8 block">
          <span className="block text-[16px] text-neutral-950">Review Title</span>
          <input
            value={form.title}
            onChange={(event) =>
              onChange((current) => ({ ...current, title: event.target.value }))
            }
            maxLength={100}
            className="mt-4 h-12 w-full border border-neutral-300 bg-white px-5 text-[16px] text-neutral-950 outline-none placeholder:text-neutral-500 focus:border-neutral-950"
            placeholder="Give your review a title"
          />
        </label>

        <label className="mt-8 block">
          <span className="block text-[16px] text-neutral-950">Review content</span>
          <textarea
            required
            value={form.text}
            onChange={(event) =>
              onChange((current) => ({ ...current, text: event.target.value }))
            }
            maxLength={2000}
            rows={6}
            className="mt-4 w-full resize-y border border-neutral-300 bg-white px-5 py-4 text-[16px] text-neutral-950 outline-none placeholder:text-neutral-500 focus:border-neutral-950"
            placeholder="Start writing here..."
          />
        </label>

        <div className="mt-8">
          <p className="text-[16px] text-neutral-950">Picture / Video (optional)</p>
          <label className="mx-auto mt-4 flex h-[112px] w-[112px] cursor-pointer items-center justify-center border border-neutral-300 bg-[#f7f7f7] text-neutral-500 transition-colors hover:border-neutral-700 hover:text-neutral-800">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={onFileChange}
              disabled={saving || uploadedCount >= MAX_REVIEW_MEDIA}
            />
            <Upload className="h-9 w-9" strokeWidth={1.5} />
          </label>
          <p className="mt-3 text-[12px] leading-5 text-neutral-500">
            JPG, PNG or WEBP. Up to {MAX_REVIEW_MEDIA} images, 5MB each.
          </p>

          {(form.photos.length > 0 || form.files.length > 0) && (
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {form.photos.map((photo, index) => {
                const photoUrl = getPhotoUrl(photo);
                if (!photoUrl) return null;

                return (
                  <ReviewMediaPreview
                    key={`${photoUrl}-${index}`}
                    src={photoUrl}
                    alt={`Uploaded review image ${index + 1}`}
                    onRemove={() => onRemoveExistingPhoto(index)}
                  />
                );
              })}
              {form.files.map((item, index) => (
                <ReviewMediaPreview
                  key={item.id}
                  src={item.previewUrl}
                  alt={`Selected review image ${index + 1}`}
                  onRemove={() => onRemovePendingFile(item.id)}
                />
              ))}
            </div>
          )}
        </div>

        <label className="mt-9 block">
          <span className="block text-[16px] text-neutral-950">Display name</span>
          <input
            value={form.displayName}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                displayName: event.target.value,
              }))
            }
            className="mt-4 h-12 w-full border border-neutral-300 bg-white px-5 text-[16px] text-neutral-950 outline-none placeholder:text-neutral-500 focus:border-neutral-950"
            placeholder="Display name"
          />
        </label>

        <label className="mt-8 block">
          <span className="block text-[16px] text-neutral-950">Email address</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) =>
              onChange((current) => ({ ...current, email: event.target.value }))
            }
            className="mt-4 h-12 w-full border border-neutral-300 bg-white px-5 text-[16px] text-neutral-950 outline-none placeholder:text-neutral-500 focus:border-neutral-950"
            placeholder="Your email address"
          />
        </label>

        <p className="mx-auto mt-8 max-w-[700px] text-[14px] leading-6 text-neutral-950">
          How we use your data: We'll only contact you about the review you left,
          and only if necessary. Your email address is not displayed publicly.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="h-12 cursor-pointer border border-neutral-950 bg-white px-7 text-[14px] font-semibold text-neutral-950 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            CANCEL REVIEW
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-12 cursor-pointer border border-neutral-950 bg-neutral-950 px-7 text-[14px] font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-300"
          >
            {saving ? "SUBMITTING" : "SUBMIT REVIEW"}
          </button>
        </div>
      </div>
    </form>
  );
}

function ReviewMediaPreview({ src, alt, onRemove }) {
  return (
    <div className="relative bg-white">
      <img
        src={src}
        alt={alt}
        className="h-20 w-20 border border-neutral-300 object-cover"
      />
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 flex h-5 w-5 cursor-pointer items-center justify-center bg-white text-neutral-950 shadow-sm"
        aria-label="Remove review image"
      >
        <X className="h-3.5 w-3.5" strokeWidth={1.6} />
      </button>
    </div>
  );
}

function InteractiveStars({ value, onChange }) {
  const [hoverValue, setHoverValue] = useState(0);
  const displayValue = hoverValue || value;

  return (
    <div className="mt-4 flex justify-center gap-1.5">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => onChange(rating)}
          onMouseEnter={() => setHoverValue(rating)}
          onMouseLeave={() => setHoverValue(0)}
          className="cursor-pointer text-neutral-300 transition-colors hover:text-neutral-950"
          aria-label={`${rating} star${rating === 1 ? "" : "s"}`}
        >
          <SharpStar
            className={rating <= displayValue ? "text-neutral-950" : "text-neutral-300"}
            fill={rating <= displayValue ? "currentColor" : "transparent"}
            size={25}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewRow({ review, saving, onEdit, onDelete }) {
  const name =
    [review.user?.firstName, review.user?.lastName].filter(Boolean).join(" ") ||
    "Customer";
  const showOwnerActions = Boolean(onEdit || onDelete);

  return (
    <article className="relative border-b border-neutral-200 py-4 sm:py-6 sm:pb-8">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
        <Stars value={review.rating} size={15} gap={3} smSize={17} smGap={3.5} />
        <time className="text-[12px] leading-5 text-neutral-500 sm:pl-6 sm:text-right sm:text-[14px]">
          {formatDate(review.createdAt)}
        </time>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 sm:gap-x-2.5 sm:gap-y-2">
        <span className="text-[13px] font-normal text-neutral-700 sm:text-[15px]">{name}</span>
        {review.verifiedPurchase && (
          <span className="bg-neutral-950 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white sm:text-[10px]">
            Verified
          </span>
        )}
        {review.isOwnReview && !review.approved && (
          <span className="border border-neutral-300 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-[0.08em] text-neutral-500 sm:text-[10px]">
            Pending approval
          </span>
        )}
      </div>

      {review.title && (
        <h3 className="mt-2 text-[13px] font-semibold uppercase tracking-[0.07em] text-neutral-950 sm:mt-2.5 sm:text-[14px]">
          {review.title}
        </h3>
      )}

      <p className="mt-1.5 max-w-[940px] text-[13px] leading-6 text-neutral-700 sm:mt-2 sm:text-[15px] sm:leading-7">
        {review.text}
      </p>

      {review.photos?.length ? (
        <div className="mt-3 flex max-w-full flex-wrap gap-2.5 sm:mb-1 sm:mt-4 sm:gap-3">
          {review.photos.slice(0, 4).map((photo, index) => {
            const photoUrl = getPhotoUrl(photo);
            if (!photoUrl) return null;

            return (
              <a
                key={`${photoUrl}-${index}`}
                href={photoUrl}
                target="_blank"
                rel="noreferrer"
                className="block max-w-[82px] cursor-pointer bg-neutral-50 sm:max-w-[112px]"
              >
                <img
                  src={photoUrl}
                  alt={`Review photo ${index + 1}`}
                  className="h-auto max-h-[82px] w-auto max-w-full object-contain sm:max-h-[112px]"
                />
              </a>
            );
          })}
        </div>
      ) : null}

      {showOwnerActions && (
        <div className="mt-3 flex items-center justify-end gap-3 sm:absolute sm:bottom-6 sm:right-0 sm:mt-0">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              disabled={saving}
              className="cursor-pointer text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-500 transition-colors hover:text-neutral-950 disabled:cursor-not-allowed disabled:text-neutral-300 sm:text-[11px]"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={saving}
              className="cursor-pointer text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-500 transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:text-neutral-300 sm:text-[11px]"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function Pagination({ currentPage, totalPages, onChange }) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav
      aria-label="Review pagination"
      className="mt-5 flex items-center justify-center gap-5 text-[14px] text-neutral-950"
    >
      {currentPage > 1 && (
        <button
          type="button"
          onClick={() => onChange(currentPage - 1)}
          className="flex h-8 w-8 cursor-pointer items-center justify-center"
          aria-label="Previous reviews page"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.7} />
        </button>
      )}

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onChange(page)}
          className={[
            "h-8 min-w-8 cursor-pointer px-2 text-[14px]",
            page === currentPage
              ? "border border-neutral-950 font-semibold"
              : "text-neutral-700",
          ].join(" ")}
        >
          {page}
        </button>
      ))}

      {currentPage < totalPages && (
        <>
          <button
            type="button"
            onClick={() => onChange(currentPage + 1)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center"
            aria-label="Next reviews page"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.7} />
          </button>
          <button
            type="button"
            onClick={() => onChange(totalPages)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center"
            aria-label="Last reviews page"
          >
            <ChevronsRight className="h-4 w-4" strokeWidth={1.7} />
          </button>
        </>
      )}
    </nav>
  );
}

function Stars({ value, size = 18, gap = 4, smSize = null, smGap = null }) {
  const rating = Math.max(0, Math.min(5, Number(value) || 0));
  const renderStars = (starSize) => (
    <>
      {[1, 2, 3, 4, 5].map((star) => {
        const fillPercent = Math.max(0, Math.min(1, rating - (star - 1))) * 100;

        return (
          <span
            key={star}
            className="relative block shrink-0"
            style={{ width: starSize, height: starSize }}
          >
            <SharpStar
              className="absolute inset-0 text-neutral-300"
              fill="transparent"
              size={starSize}
            />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fillPercent}%` }}
            >
              <SharpStar
                className="text-neutral-950"
                fill="currentColor"
                size={starSize}
              />
            </span>
          </span>
        );
      })}
    </>
  );

  if (smSize) {
    return (
      <div aria-label={`${rating.toFixed(1)} out of 5 stars`}>
        <div className="flex items-center sm:hidden" style={{ gap }}>
          {renderStars(size)}
        </div>
        <div
          className="hidden items-center sm:flex"
          style={{ gap: smGap ?? gap }}
          aria-hidden="true"
        >
          {renderStars(smSize)}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center"
      style={{ gap }}
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
    >
      {renderStars(size)}
    </div>
  );
}

function FixedStars({ value }) {
  const renderFixedStars = (size) =>
    [1, 2, 3, 4, 5].map((star) => (
      <SharpStar
        key={star}
        className={star <= value ? "text-neutral-950" : "text-neutral-300"}
        fill={star <= value ? "currentColor" : "transparent"}
        size={size}
      />
    ));

  return (
    <div aria-hidden="true">
      <div className="flex items-center gap-1 sm:hidden">
        {renderFixedStars(12)}
      </div>
      <div className="hidden items-center gap-1.5 sm:flex">
        {renderFixedStars(14)}
      </div>
    </div>
  );
}

function SharpStar({ className = "", fill = "transparent", size = 18 }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
    >
      <polygon
        points="12 1.6 15.18 8.11 22.35 9.12 17.16 14.16 18.42 21.28 12 17.88 5.58 21.28 6.84 14.16 1.65 9.12 8.82 8.11"
        fill={fill}
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

function buildReviewForm(source = emptyForm, user) {
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    source.displayName ||
    "";

  return {
    rating: Number(source.rating) || 0,
    title: source.title || "",
    text: source.text || "",
    displayName,
    email: user?.email || source.email || "",
    photos: Array.isArray(source.photos) ? source.photos : [],
    files: [],
  };
}

function validateReviewForm(form) {
  if (!Number(form.rating)) {
    return "Please select a rating.";
  }

  if (!form.title.trim()) {
    return "Please enter a review title.";
  }

  if (!form.text.trim()) {
    return "Please enter your review content.";
  }

  if (!form.displayName.trim()) {
    return "Please enter a display name.";
  }

  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    return "Please enter a valid email address.";
  }

  return "";
}

async function uploadReviewMedia(files) {
  const signatureResponse = await fetch("/api/upload/review-signature", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder: "reviews" }),
  });

  const signatureBody = await signatureResponse.json().catch(() => null);

  if (!signatureResponse.ok || signatureBody?.success === false) {
    throw new Error(
      signatureBody?.error?.message || "Unable to prepare review image upload."
    );
  }

  const signatureData = signatureBody?.data || signatureBody;

  return Promise.all(
    files.map(async (file) => {
      const body = new FormData();
      body.append("file", file);
      body.append("api_key", signatureData.apiKey);
      body.append("timestamp", String(signatureData.timestamp));
      body.append("folder", signatureData.folder);
      body.append("signature", signatureData.signature);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`,
        {
          method: "POST",
          body,
        }
      );
      const uploadBody = await uploadResponse.json().catch(() => null);

      if (!uploadResponse.ok) {
        throw new Error(uploadBody?.error?.message || "Review image upload failed.");
      }

      return {
        url: uploadBody.secure_url,
        publicId: uploadBody.public_id,
      };
    })
  );
}

function getPhotoUrl(photo) {
  if (!photo) return "";
  if (typeof photo === "string") return photo;
  return photo.url || photo.secure_url || "";
}
