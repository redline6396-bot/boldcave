export const normalizeProductCategory = (value) =>
  String(value || "").trim().toLowerCase();

const normalizeAudienceList = (product) => {
  const rawAudience = product?.audienceTags ?? [];
  const values = Array.isArray(rawAudience) ? rawAudience : [rawAudience];

  return values
    .flatMap((value) =>
      typeof value === "string" ? value.split(/[,/|]/) : [value]
    )
    .map((value) => normalizeProductCategory(value))
    .filter(Boolean);
};

export const matchesProductCategory = (product, selectedCategory) => {
  if (selectedCategory === "all") {
    return true;
  }

  const audiences = normalizeAudienceList(product);
  const hasMen = audiences.includes("men");
  const hasWomen = audiences.includes("women");
  const hasUnisex = audiences.includes("unisex");
  const isPureUnisex = hasUnisex && !hasMen && !hasWomen;

  if (selectedCategory === "men") {
    return hasMen || isPureUnisex;
  }

  if (selectedCategory === "unisex") {
    return hasUnisex;
  }

  if (selectedCategory === "women") {
    return hasWomen || isPureUnisex;
  }

  return true;
};
