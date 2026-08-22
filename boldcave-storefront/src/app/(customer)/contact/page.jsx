"use client";

import React, { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NotificationContext } from "@/context/NotificationContext";
import {
  Mail,
  Clock,
  Send,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  MapPin,
  ChevronDown,
} from "lucide-react";
import emailjs from "@emailjs/browser";

const subjects = [
  "Product Inquiry",
  "Bulk / Wholesale Order",
  "Business Partnership",
  "Media / Collaboration",
  "General Question",
];

const contactCards = [
  {
    icon: Mail,
    title: "Email",
    text: "contact@boldcave.com",
    href: "mailto:contact@boldcave.com",
  },
  {
    icon: MapPin,
    title: "Address",
    text: "Mukundpur, Delhi - 110042, India",
  },
  {
    icon: Clock,
    title: "Hours",
    text: "Mon - Sat, 9 AM - 7 PM IST",
  },
];

const quickPoints = [
  {
    title: "Wholesale orders",
    text: "For bulk fragrance and gifting enquiries.",
  },
  {
    title: "Product questions",
    text: "Ask about ingredients, notes, sizes, or packaging.",
  },
  {
    title: "Order support",
    text: "For delivery, returns, refunds, or order issues.",
  },
];

export default function ContactPage() {
  const router = useRouter();
  const { success, error: showError } = useContext(NotificationContext);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "Product Inquiry",
    message: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    const userId = process.env.NEXT_PUBLIC_EMAILJS_USER;

    if (userId) {
      emailjs.init(userId);
    }
  }, []);

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (
      !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)
    ) {
      errors.email = "Please enter a valid email";
    }

    if (!formData.subject) {
      errors.subject = "Please select a subject";
    }

    if (!formData.message.trim()) {
      errors.message = "Message is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      subject: "Product Inquiry",
      message: "",
    });
    setFormErrors({});
    setSubmitSuccess(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      showError?.("Please fix the errors above");
      return;
    }

    setIsLoading(true);

    try {
      const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE;
      const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE;
      const userId = process.env.NEXT_PUBLIC_EMAILJS_USER;

      if (!serviceId || !templateId || !userId) {
        throw new Error("EmailJS not configured");
      }

      await emailjs.send(
        serviceId,
        templateId,
        {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || "Not provided",
          subject: formData.subject,
          message: formData.message,
          time: new Date().toLocaleString("en-IN", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        },
        userId
      );

      setSubmitSuccess(true);
      success?.("Thank you for contacting us. Our team will respond within 24–48 hours.");

      setTimeout(() => {
        resetForm();
      }, 3500);
    } catch (error) {
      console.error("EmailJS error:", error);
      showError?.(error?.message || "Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailRequest = () => {
    const { name, email, message } = formData;

    if (!message.trim()) {
      showError?.("Please write a message before sending");
      return;
    }

    const emailBody = `Hi BOLD CAVE,\n\nName: ${
      name || "Not provided"
    }\nEmail: ${email || "Not provided"}\n\nMessage:\n${message}`;

    const mailUrl = `mailto:contact@boldcave.com?subject=${encodeURIComponent(
      formData.subject || "Customer enquiry"
    )}&body=${encodeURIComponent(emailBody)}`;

    window.location.href = mailUrl;
    success?.("Opening email...");
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbf8f1] font-body text-[#332519]">
      {/* Hero */}
      <section className="border-b border-[#e8dfd1] bg-[#fffdf8]">
        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-7 md:px-8 lg:px-12 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-end">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#405526]">
                Contact Us
              </p>

              <h1 className="mt-4 font-display text-[42px] font-medium leading-[0.98] tracking-[-0.045em] text-[#332519] sm:text-[56px] lg:text-[64px]">
                Let’s talk about
                <span className="block italic text-[#405526]">
                  fine fragrance.
                </span>
              </h1>

              <p className="mt-5 max-w-[560px] text-[14px] leading-7 text-[#5f5648] sm:text-[15px]">
                Have a question about our fragrances, delivery, returns,
                wholesale supply, or your order? Send us a message and our team
                will get back to you.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#contact-form"
                  className="inline-flex h-11 items-center justify-center rounded-[6px] bg-[#405526] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#30421e]"
                >
                  Send a Message
                </a>

                <button
                  type="button"
                  onClick={() => router.push("/orders")}
                  className="inline-flex h-11 items-center justify-center rounded-[6px] border border-[#405526] bg-[#fffdf8] px-6 text-sm font-semibold text-[#405526] transition-colors hover:bg-[#f4eee2]"
                >
                  My Orders
                </button>
              </div>
            </div>

            <div className="rounded-[16px] border border-[#e8dfd1] bg-[#fbf8f1] p-4">
              <div className="grid gap-0 divide-y divide-[#e8dfd1] rounded-[12px] border border-[#e8dfd1] bg-[#fffdf8]">
                {quickPoints.map((point) => (
                  <QuickPoint key={point.title} {...point} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact cards */}
      <section className="border-b border-[#e8dfd1] bg-[#fbf8f1]">
        <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-7 md:px-8 lg:px-12">
          <div className="grid gap-3 md:grid-cols-3">
            {contactCards.map((card) => (
              <ContactCard key={card.title} {...card} />
            ))}
          </div>
        </div>
      </section>

      {/* Main contact form area */}
      <section id="contact-form" className="bg-[#fbf8f1]">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-12 sm:px-7 md:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:px-12 lg:py-14">
          {/* Left editorial block */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[18px] border border-[#e8dfd1] bg-[#fffdf8] p-6 sm:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#405526]">
                BOLD CAVE
              </p>

              <h2 className="mt-3 font-display text-[34px] font-medium leading-[1.02] tracking-[-0.04em] text-[#332519] sm:text-[40px]">
                We are here for your orders, fragrances, and questions.
              </h2>

              <p className="mt-5 text-[14px] leading-7 text-[#5f5648]">
                For order issues, returns, delivery problems, product inquiries,
                wholesale, or partnerships, use the form here.
              </p>

              <div className="mt-7 space-y-4 border-t border-[#eee6d9] pt-6">
                <InfoLine
                  icon={MapPin}
                  title="Serving"
                  text="Fragrance customers across India"
                />
                <InfoLine
                  icon={Clock}
                  title="Reply time"
                  text="Usually within 24–48 hours"
                />
                <InfoLine
                  icon={Mail}
                  title="Email"
                  text="contact@boldcave.com"
                />
              </div>

              <button
                type="button"
                onClick={() => router.push("/orders")}
                className="mt-7 inline-flex h-11 w-full items-center justify-center rounded-[6px] border border-[#405526] bg-[#fffdf8] px-6 text-sm font-semibold text-[#405526] transition-colors hover:bg-[#f4eee2] sm:w-auto"
              >
                Need help with an order?
              </button>
            </div>
          </aside>

          {/* Form */}
          <div>
            {submitSuccess ? (
              <SuccessCard onReset={resetForm} />
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-[18px] border border-[#e8dfd1] bg-[#fffdf8] p-5 shadow-[0_14px_40px_rgba(58,45,29,0.04)] sm:p-7 lg:p-8"
              >
                <div className="border-b border-[#e8dfd1] pb-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#405526]">
                    Message Form
                  </p>

                  <h2 className="mt-2 font-display text-[32px] font-medium leading-none tracking-[-0.035em] text-[#332519] sm:text-[40px]">
                    Send us a message
                  </h2>

                  <p className="mt-3 max-w-[560px] text-[13px] leading-6 text-[#5f5648]">
                    Share your details clearly so we can respond with the right
                    information.
                  </p>
                </div>

                <div className="mt-7 space-y-6">
                  <div className="grid gap-5 md:grid-cols-2">
                    <FormField label="Full Name" required error={formErrors.name}>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Your full name"
                        className={inputClass(formErrors.name)}
                      />
                    </FormField>

                    <FormField
                      label="Email Address"
                      required
                      error={formErrors.email}
                    >
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="your@email.com"
                        className={inputClass(formErrors.email)}
                      />
                    </FormField>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <FormField label="Phone Number">
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="10-digit mobile number"
                        className={inputClass()}
                      />
                    </FormField>

                    <FormField label="Subject" required error={formErrors.subject}>
                      <div className="relative">
                        <select
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          className={`${inputClass(formErrors.subject)} appearance-none pr-10`}
                        >
                          {subjects.map((subject) => (
                            <option key={subject} value={subject}>
                              {subject}
                            </option>
                          ))}
                        </select>

                        <ChevronDown
                          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#405526]"
                          strokeWidth={1.7}
                        />
                      </div>
                    </FormField>
                  </div>

                  <FormField label="Message" required error={formErrors.message}>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us about your inquiry..."
                      rows={6}
                      maxLength={2000}
                      className={`${inputClass(formErrors.message)} min-h-[150px] resize-none py-3`}
                    />

                    <p className="mt-2 text-[11px] text-[#8a8173]">
                      {formData.message.length}/2000 characters
                    </p>
                  </FormField>

                  <div className="grid gap-3 pt-2 sm:grid-cols-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex h-12 items-center justify-center gap-2 rounded-[6px] bg-[#405526] text-sm font-semibold text-white transition-colors hover:bg-[#30421e] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" strokeWidth={1.8} />
                          Send Message
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleEmailRequest}
                      className="flex h-12 items-center justify-center gap-2 rounded-[6px] border border-[#405526] bg-[#fffdf8] text-sm font-semibold text-[#405526] transition-colors hover:bg-[#f4eee2]"
                    >
                      <Mail className="h-4 w-4" strokeWidth={1.8} />
                      Email Us
                    </button>
                  </div>

                  <p className="text-center text-[11px] leading-5 text-[#7a756b]">
                    We use submitted information to respond to your request.{" "}
                    <Link
                      href="/privacy"
                      className="font-medium text-[#405526] underline underline-offset-2"
                    >
                      Privacy Policy
                    </Link>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function QuickPoint({ title, text }) {
  return (
    <div className="px-4 py-4">
      <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#405526]">
        {title}
      </p>
      <p className="mt-1 text-[13px] text-[#5f5648]">{text}</p>
    </div>
  );
}

function ContactCard({ icon: Icon, title, text, href }) {
  const content = (
    <div className="flex h-full items-start gap-4 rounded-[14px] border border-[#e8dfd1] bg-[#fffdf8] p-5 transition-colors hover:border-[#c9b99c]">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f4eddf] text-[#405526]">
        <Icon className="h-5 w-5" strokeWidth={1.6} />
      </span>

      <div className="min-w-0">
        <h3 className="text-[14px] font-semibold text-[#332519]">{title}</h3>
        <p className="mt-1 break-words text-[13px] leading-6 text-[#5f5648]">
          {text}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }

  return content;
}

function InfoLine({ icon: Icon, title, text }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[#405526]" strokeWidth={1.6} />

      <div>
        <p className="text-[13px] font-semibold text-[#332519]">{title}</p>
        <p className="mt-0.5 text-[13px] leading-6 text-[#5f5648]">{text}</p>
      </div>
    </div>
  );
}

function FormField({ label, required = false, error, children }) {
  return (
    <div>
      <label className="mb-2 block text-[13px] font-semibold text-[#332519]">
        {label} {required && <span className="text-[#c9504a]">*</span>}
      </label>

      {children}

      {error && (
        <p className="mt-2 flex items-center gap-1 text-[12px] font-medium text-[#c9504a]">
          <AlertCircle className="h-3.5 w-3.5" strokeWidth={1.7} />
          {error}
        </p>
      )}
    </div>
  );
}

function inputClass(hasError = false) {
  return `w-full rounded-[8px] border bg-[#fffdf8] px-4 py-3 text-[14px] text-[#332519] outline-none transition-colors placeholder:text-[#9a9183] focus:border-[#405526] ${
    hasError ? "border-[#c9504a] bg-[#fff7f6]" : "border-[#ded4c3]"
  }`;
}

function SuccessCard({ onReset }) {
  return (
    <div className="rounded-[18px] border border-[#e8dfd1] bg-[#fffdf8] p-6 text-center shadow-[0_14px_40px_rgba(58,45,29,0.04)] sm:p-10">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f4eddf] text-[#405526]">
        <CheckCircle className="h-8 w-8" strokeWidth={1.6} />
      </div>

      <h2 className="mt-6 font-display text-[34px] font-medium tracking-[-0.035em] text-[#332519]">
        Message sent
      </h2>

      <p className="mx-auto mt-3 max-w-[420px] text-sm leading-6 text-[#5f5648]">
        Thank you for contacting us. Our team will respond within 24–48 hours.
      </p>

      <button
        type="button"
        onClick={onReset}
        className="mt-8 inline-flex h-11 items-center justify-center rounded-[6px] bg-[#405526] px-6 text-sm font-semibold text-white"
      >
        Send Another Message
      </button>
    </div>
  );
}
