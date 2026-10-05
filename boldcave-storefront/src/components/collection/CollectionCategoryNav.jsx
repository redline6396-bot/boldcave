import Link from "next/link";

const categories = [
  { label: "SHOP ALL", value: "all", href: "/collection" },
  { label: "MEN", value: "men", href: "/collection?category=Men" },
  {
    label: "UNISEX",
    value: "unisex",
    href: "/collection?category=Unisex",
  },
  {
    label: "WOMEN",
    value: "women",
    href: "/collection?category=Women",
  },
];

export default function CollectionCategoryNav({
  activeCategory = "all",
  className = "",
  onCategoryChange,
}) {
  const selectedCategory = categories.some(
    (category) => category.value === activeCategory
  )
    ? activeCategory
    : "all";

  return (
    <nav
      aria-label="Collection categories"
      className={[
        "mx-auto flex w-[240px] max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-3 sm:w-auto sm:max-w-[580px] sm:gap-x-6 lg:gap-x-9",
        className,
      ].join(" ")}
    >
      {categories.map((category) => {
        const isActive = selectedCategory === category.value;
        const categoryClassName = [
          "flex h-8 shrink-0 cursor-pointer items-center justify-center bg-white px-1 text-[11px] font-semibold uppercase leading-none tracking-[0.11em] transition-colors duration-200 sm:h-9 sm:text-[12px] lg:h-9 lg:text-[13px]",
          isActive
            ? "text-neutral-950 underline decoration-neutral-950 decoration-1 underline-offset-[6px]"
            : "text-neutral-500 hover:text-neutral-950",
        ].join(" ");

        if (onCategoryChange) {
          return (
            <button
              key={category.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => onCategoryChange(category.value)}
              className={categoryClassName}
            >
              {category.label}
            </button>
          );
        }

        return (
          <Link
            key={category.value}
            href={category.href}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={categoryClassName}
          >
            {category.label}
          </Link>
        );
      })}
    </nav>
  );
}
