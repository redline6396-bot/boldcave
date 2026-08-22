export const metadata = {
  title: "About Us | Bold Cave",
  description:
    "Discover Bold Cave — a fragrance brand built around confidence, individuality and the side of you that refuses to stay hidden.",
};

export default function AboutPage() {
  return (
    <main className="bg-white text-black">
      <section className="mx-auto max-w-[980px] px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:px-10 lg:pb-24 lg:pt-20">
        <h1 className="font-serif text-[48px] font-normal leading-none tracking-[-0.035em] sm:text-[60px] lg:text-[72px]">
          About Us
        </h1>

        <div className="mt-12 space-y-11 sm:mt-14 sm:space-y-12 lg:mt-16 lg:space-y-14">
          <AboutSection title="WHO ARE WE?">
            <p>
              Bold Cave is a modern fragrance brand created for people who do
              not want to blend into the background. We believe fragrance is
              more than something you wear — it can become part of how you
              enter a room, how you are remembered, and how you express
              yourself without saying a word.
            </p>

            <p>
              Our fragrances are built around distinct personalities, from
              fresh and effortless to dark, intense and commanding. The idea is
              simple: choose the scent that feels like your bold side, and wear
              it your way.
            </p>
          </AboutSection>

          <AboutSection title="OUR STORY">
            <p>
              Bold Cave began with one thought: everyone has a side of
              themselves that feels more confident, more expressive and more
              fearless. Sometimes it only needs the right moment to come out.
            </p>

            <p>
              That became the idea behind our line — <em>Enter Your Bold Side.</em>{" "}
              Bold Cave is where that side lives. Every fragrance is created to
              carry its own mood and character, giving you a scent for the
              version of yourself you want to bring forward.
            </p>
          </AboutSection>

          <AboutSection title="CRAFTED WITH INTENTION">
            <p>
              Our focus is on creating fragrances with a clear identity,
              balanced performance and a premium experience from the first
              spray to the final dry-down. Every profile is selected with
              attention to how its notes evolve, how it performs through the
              day and how naturally it fits into real occasions.
            </p>

            <p>
              Our manufacturing and formulation partners follow established
              processes for fragrance production, filling and quality checks.
              As Bold Cave grows, this section will be updated with the final
              manufacturing story and production details behind the brand.
            </p>
          </AboutSection>
        </div>
      </section>
    </main>
  );
}

function AboutSection({ title, children }) {
  return (
    <section>
      <h2 className="font-serif text-[24px] font-normal uppercase leading-tight tracking-[0.025em] sm:text-[28px] lg:text-[30px]">
        {title}
      </h2>

      <div className="mt-5 max-w-[860px] space-y-5 text-[14px] font-normal leading-[1.9] tracking-[0.015em] text-[#666] sm:text-[15px] lg:text-[16px]">
        {children}
      </div>
    </section>
  );
}
