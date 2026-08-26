const PINCODE_LOOKUP_TIMEOUT_MS = 3500;

function formatLocationValue(value) {
  return String(value || "").trim().toUpperCase();
}

export async function lookupIndianPincode(pincode) {
  const pin = String(pincode || "").trim();

  if (!/^\d{6}$/.test(pin)) {
    return { city: "", state: "" };
  }

  const controller = new globalThis.AbortController();
  const timeout = setTimeout(() => controller.abort(), PINCODE_LOOKUP_TIMEOUT_MS);

  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
      cache: "no-store",
      signal: controller.signal,
    });
    const data = await response.json().catch(() => []);
    const postOffices = Array.isArray(data?.[0]?.PostOffice)
      ? data[0].PostOffice
      : [];
    const primaryOffice = postOffices[0] || {};

    return {
      city: formatLocationValue(
        primaryOffice.District || primaryOffice.Block || primaryOffice.Name
      ),
      state: formatLocationValue(primaryOffice.State),
    };
  } catch {
    return { city: "", state: "" };
  } finally {
    clearTimeout(timeout);
  }
}
