import Link from "next/link";

function LinkedText({ text }) {
  const parts = String(text).split(
    /(contact@boldcave\.com|www\.boldcave\.com)/g
  );

  return parts.map((part, index) => {
    if (part === "contact@boldcave.com") {
      return (
        <a
          key={`${part}-${index}`}
          href="mailto:contact@boldcave.com"
          className="cursor-pointer font-medium text-neutral-950 underline underline-offset-4"
        >
          {part}
        </a>
      );
    }

    if (part === "www.boldcave.com") {
      return (
        <a
          key={`${part}-${index}`}
          href="https://www.boldcave.com"
          className="cursor-pointer font-medium text-neutral-950 underline underline-offset-4"
        >
          {part}
        </a>
      );
    }

    return part;
  });
}

function displayHeading(title) {
  return String(title || "");
}

export default function PolicyDocument({
  title,
  lastUpdated = "19 August 2026",
  intro,
  sections,
}) {
  const introParagraphs = Array.isArray(intro) ? intro : intro ? [intro] : [];

  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <article className="mx-auto max-w-[800px] px-5 pb-[60px] pt-8 sm:px-6 sm:pt-9">
        <header className="mb-[30px] text-center">
          <h1 className="mb-3 text-[30px] font-medium leading-[1.15] tracking-normal text-[#111] sm:text-[34px]">
            {title}
          </h1>
          <p className="text-[13px] font-normal leading-[1.4] text-neutral-600">
            Last Updated: {lastUpdated}
          </p>
        </header>

        <div className="text-left">
          {introParagraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="mb-3 break-words text-[15px] font-normal leading-[1.45] text-[#333]"
            >
              <LinkedText text={paragraph} />
            </p>
          ))}

          {sections.map((section) => (
            <section key={section.title} className="mt-5">
              <h2 className="mb-[7px] text-[16px] font-semibold leading-[1.35] tracking-normal text-[#111]">
                {displayHeading(section.title)}
              </h2>

              {section.paragraphs?.length > 0 && (
                <div>
                  {section.paragraphs.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="mb-3 break-words text-[15px] font-normal leading-[1.45] text-[#333] last:mb-0"
                    >
                      <LinkedText text={paragraph} />
                    </p>
                  ))}
                </div>
              )}

              {section.items?.length > 0 && (
                <ul className="mb-3 list-disc space-y-1.5 pl-5 text-[15px] font-normal leading-[1.45] text-[#333]">
                  {section.items.map((item) => (
                    <li key={item}>
                      <LinkedText text={item} />
                    </li>
                  ))}
                </ul>
              )}

              {section.links?.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-3">
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="cursor-pointer text-[13px] font-medium uppercase tracking-[0.12em] text-neutral-950 underline underline-offset-4"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
