"use client";

import { useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";

const META_PIXEL_ID = "1061596686650693";
const META_PIXEL_READY_EVENT = "boldcave:meta-pixel-ready";
const ADVANCED_MATCHING_APPLIED_KEY = "__boldcaveMetaPixelAdvancedMatchingApplied";

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeIndianPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const nationalNumber = /^[6-9]\d{9}$/.test(digits)
    ? digits
    : /^91[6-9]\d{9}$/.test(digits)
      ? digits.slice(2)
      : "";

  return nationalNumber ? `91${nationalNumber}` : "";
}

function buildAdvancedMatching(user) {
  const email = normalizeText(user?.email);
  const phone = normalizeIndianPhone(user?.phone);
  const firstName = normalizeText(user?.firstName);
  const lastName = normalizeText(user?.lastName);

  return {
    ...(email ? { em: email } : {}),
    ...(phone ? { ph: phone } : {}),
    ...(firstName ? { fn: firstName } : {}),
    ...(lastName ? { ln: lastName } : {}),
  };
}

export default function MetaPixelAdvancedMatching() {
  const { user } = useAuth();
  const advancedMatching = useMemo(() => buildAdvancedMatching(user), [user]);
  const hasAdvancedMatching = Object.keys(advancedMatching).length > 0;

  useEffect(() => {
    if (!hasAdvancedMatching) return undefined;

    function applyAdvancedMatching() {
      if (
        typeof window.fbq !== "function" ||
        window[ADVANCED_MATCHING_APPLIED_KEY]
      ) {
        return;
      }

      window.fbq("init", META_PIXEL_ID, advancedMatching);
      window[ADVANCED_MATCHING_APPLIED_KEY] = true;
    }

    applyAdvancedMatching();
    window.addEventListener(META_PIXEL_READY_EVENT, applyAdvancedMatching);

    return () => {
      window.removeEventListener(META_PIXEL_READY_EVENT, applyAdvancedMatching);
    };
  }, [advancedMatching, hasAdvancedMatching]);

  return null;
}
