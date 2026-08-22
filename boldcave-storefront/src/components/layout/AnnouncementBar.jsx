"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ANNOUNCEMENT_DELAY = 4000;
const SLIDE_DURATION = 450;

const messages = [
  "EXPLORE THE COLLECTION",
  "FIND YOUR SIGNATURE SCENT",
  "DISCOVER FIVE DISTINCT FRAGRANCES",
];

export default function AnnouncementBar() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState(null);
  const [direction, setDirection] = useState("next");
  const [isMoving, setIsMoving] = useState(false);
  const currentIndexRef = useRef(0);
  const frameRef = useRef(null);
  const cleanupRef = useRef(null);

  const normalizeIndex = useCallback((index) => {
    return ((index % messages.length) + messages.length) % messages.length;
  }, []);

  const finishTransition = useCallback(() => {
    setPreviousIndex(null);
    setIsMoving(false);
  }, []);

  const changeAnnouncement = useCallback(
    (step) => {
      const fromIndex = normalizeIndex(currentIndexRef.current);
      const toIndex = normalizeIndex(fromIndex + step);

      if (fromIndex === toIndex) {
        return;
      }

      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }

      if (cleanupRef.current) {
        window.clearTimeout(cleanupRef.current);
      }

      currentIndexRef.current = toIndex;
      setDirection(step > 0 ? "next" : "previous");
      setPreviousIndex(fromIndex);
      setCurrentIndex(toIndex);
      setIsMoving(false);

      frameRef.current = window.requestAnimationFrame(() => {
        setIsMoving(true);
      });

      cleanupRef.current = window.setTimeout(
        finishTransition,
        SLIDE_DURATION + 40
      );
    },
    [finishTransition, normalizeIndex]
  );

  const goToNext = useCallback(() => {
    changeAnnouncement(1);
  }, [changeAnnouncement]);

  const goToPrevious = useCallback(() => {
    changeAnnouncement(-1);
  }, [changeAnnouncement]);

  useEffect(() => {
    const timer = window.setTimeout(goToNext, ANNOUNCEMENT_DELAY);

    return () => window.clearTimeout(timer);
  }, [currentIndex, goToNext]);

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }

      if (cleanupRef.current) {
        window.clearTimeout(cleanupRef.current);
      }
    };
  }, []);

  const currentMessage = messages[normalizeIndex(currentIndex)];
  const previousMessage =
    previousIndex === null ? null : messages[normalizeIndex(previousIndex)];
  const isTransitioning = previousMessage !== null;
  const slideMessages = !isTransitioning
    ? [currentMessage]
    : direction === "next"
      ? [previousMessage, currentMessage]
      : [currentMessage, previousMessage];
  const trackTransform = !isTransitioning
    ? "translateX(0)"
    : direction === "next"
      ? isMoving
        ? "translateX(-50%)"
        : "translateX(0)"
      : isMoving
        ? "translateX(0)"
        : "translateX(-50%)";

  return (
    <div className="flex h-[27px] w-full items-center border-b border-neutral-200 bg-white text-neutral-950 sm:h-6">
      <div className="mx-auto flex h-full w-full max-w-[720px] items-center justify-center gap-1 px-2 sm:gap-5 sm:px-4">
        <button
          type="button"
          onClick={goToPrevious}
          aria-label="Previous announcement"
          className="flex h-7 w-7 shrink-0 items-center justify-center text-neutral-950 transition-opacity hover:opacity-55"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
        </button>

        <div className="relative h-full min-w-0 flex-1 overflow-hidden">
          <div
            className="flex h-full"
            style={{
              width: isTransitioning ? "200%" : "100%",
              transform: trackTransform,
              transition: isTransitioning
                ? `transform ${SLIDE_DURATION}ms ease-in-out`
                : "none",
            }}
          >
            {slideMessages.map((message, index) => (
            <p
              key={`${message}-${index}`}
            className="flex h-full shrink-0 items-center justify-center overflow-hidden px-1 text-center text-[8px] font-medium uppercase tracking-[0.06em] text-neutral-950 min-[380px]:text-[9px] sm:px-2 sm:text-[11px] sm:tracking-[0.14em]"
              style={{ width: isTransitioning ? "50%" : "100%" }}
            >
              <span className="block max-w-full whitespace-nowrap">{message}</span>
            </p>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={goToNext}
          aria-label="Next announcement"
          className="flex h-7 w-7 shrink-0 items-center justify-center text-neutral-950 transition-opacity hover:opacity-55"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
