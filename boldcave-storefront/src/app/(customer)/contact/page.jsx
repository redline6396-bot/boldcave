export const metadata = {
  title: "Contact Us",
  description:
    "Get in touch with Bold Cave for product, order, account, privacy and business-related enquiries.",
  alternates: {
    canonical: "/contact",
  },
};

const CONTACT_EMAIL = "contact@boldcave.com";

export default function ContactPage() {
  return (
    <main className="bg-white text-black">
      <section className="mx-auto max-w-[980px] px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:px-10 lg:pb-24 lg:pt-20">
        <h1 className="font-serif text-[48px] font-normal leading-none tracking-[-0.035em] sm:text-[60px] lg:text-[72px]">
          Contact Us
        </h1>

        <div className="mt-12 space-y-11 sm:mt-14 sm:space-y-12 lg:mt-16 lg:space-y-14">
          <ContactSection title="GET IN TOUCH">
            <p>
              Have a question about Bold Cave, our fragrances, your account or an
              order? Send us an email and our team will help you with the relevant
              information.
            </p>

            <p>
              Email:{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="cursor-pointer text-black underline underline-offset-4 transition-opacity hover:opacity-60"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </ContactSection>

          <ContactSection title="ORDER & DELIVERY SUPPORT">
            <p>
              For help related to an existing order, delivery or payment, please
              include your order ID and the mobile number used while placing the
              order. This helps us identify your order quickly.
            </p>

            <p>
              Please do not share OTPs, card details, UPI PINs or other sensitive
              payment information over email.
            </p>
          </ContactSection>

          <ContactSection title="PRIVACY & DATA REQUESTS">
            <p>
              You can also contact us for requests related to your personal data,
              including correction, information or deletion requests, as well as
              privacy-related grievances.
            </p>

            <p>
              Send your request to{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
                  "Privacy Request - Bold Cave"
                )}`}
                className="cursor-pointer text-black underline underline-offset-4 transition-opacity hover:opacity-60"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </ContactSection>

          <ContactSection title="BUSINESS & COLLABORATIONS">
            <p>
              For business enquiries, partnerships, retail opportunities or
              collaborations, contact us by email with a short introduction and
              the purpose of your enquiry.
            </p>

            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
                "Business Enquiry - Bold Cave"
              )}`}
              className="mt-1 inline-flex cursor-pointer items-center border-b border-black pb-1 text-[12px] font-medium uppercase tracking-[0.12em] text-black transition-opacity hover:opacity-60 sm:text-[13px]"
            >
              Contact Bold Cave
            </a>
          </ContactSection>
        </div>
      </section>
    </main>
  );
}

function ContactSection({ title, children }) {
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
