// 'use client';

// import React, { useState } from 'react';
// import { AlertCircle, TrendingUp, Zap, Lock, Truck, CreditCard, RotateCcw, Check } from 'lucide-react';

// const benefits = [
//   { title: 'Direct from Farmers', description: 'Fair prices, transparent sourcing' },
//   { title: 'No Preservatives', description: 'Pure, natural ingredients only' },
//   { title: 'Quality Tested', description: 'Lab-verified for safety and purity' },
//   { title: 'Transparent Practices', description: 'Complete traceability and accountability' },
// ];

// const stats = [
//   { number: 'Farm to Home', label: 'Direct Sourcing', subText: 'Fresh & Transparent' },
//   { number: '100% Natural', label: 'No Adulteration', subText: 'Lab Tested' },
//   { number: 'Ethically Sourced', label: 'Farmer Support', subText: 'Fair Trade' },
//   { number: 'Quality Promise', label: 'Every Order', subText: 'Every Time' },
// ];

// const trustPoints = [
//   { icon: Lock, label: 'Secure Payments', description: 'SSL encrypted transactions' },
//   { icon: Truck, label: 'Fast Shipping', description: 'Delivery in 2-3 days' },
//   { icon: CreditCard, label: 'Free Returns', description: '7-day money-back guarantee' },
//   { icon: RotateCcw, label: 'Easy Exchanges', description: 'Hassle-free process' },
// ];

// const certifications = [
//   {
//     image: 'https://images.seeklogo.com/logo-png/30/1/fssai-logo-png_seeklogo-304263.png',
//     alt: 'FSSAI',
//     badge: 'FSSAI',
//     title: 'Food Safety Authority',
//     meta: 'License No: XXXXXXXXXXXXXX',
//     desc: 'Govt. certified food safety standards',
//     accent: '#2F6B3F',
//   },
//   {
//     image: '/images/de48d09d-2697-4be8-9fc4-6ae2383064ec.jpg',
//     alt: 'Naturally Sourced',
//     badge: 'NATURAL',
//     title: 'Naturally Sourced',
//     meta: 'Direct from Farmers',
//     desc: 'Fresh & carefully selected',
//     accent: '#2F6B3F',
//   },
//   {
//     image: '/images/hygeine.jpg',
//     alt: 'Hygienic Processing',
//     badge: 'HYGIENE',
//     title: 'Hygienic Processing',
//     meta: 'Clean Handling Standards',
//     desc: 'Packed with care',
//     accent: '#2F6B3F',
//   },
//   {
//     image: '/images/vecteezy_made-in-india-stamp-logo-icon-symbol-design-seal-national_24208335.jpg',
//     alt: 'Made in India',
//     badge: 'INDIA',
//     title: 'Made in India',
//     meta: 'Locally Manufactured',
//     desc: 'Supporting domestic agriculture',
//     accent: '#2F6B3F',
//   },
// ];

// export function BenefitsSection() {
//   const [subscribed, setSubscribed] = useState(false);
//   const [email, setEmail] = useState('');

//   const handleNewsletterSubmit = (e) => {
//     e.preventDefault();
//     setSubscribed(true);
//     setEmail('');
//     setTimeout(() => setSubscribed(false), 6000);
//   };

//   return (
//     <>
//       {/* ── Stats ── */}
//       <section className="py-12 sm:py-16" style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E6E1D8' }}>
//         <div className="mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-10">
//             {stats.map((stat, index) => (
//               <div key={index} className="text-center">
//                 <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold mb-2" style={{ color: '#3A3A3A' }}>
//                   {stat.number}
//                 </div>
//                 <div className="text-xs sm:text-sm md:text-base font-medium mb-1" style={{ color: '#3A3A3A' }}>
//                   {stat.label}
//                 </div>
//                 <div className="text-xs sm:text-xs md:text-sm" style={{ color: '#999' }}>
//                   {stat.subText}
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* ── Certifications — FIXED ── */}
//       <section
//         className="py-14 sm:py-20"
//         style={{
//           backgroundColor: '#F8F6F2',
//           borderTop: '1px solid #E6E1D8',
//           borderBottom: '1px solid #E6E1D8',
//         }}
//       >
//         <div className="mx-auto px-4 sm:px-6 lg:px-12">
//           {/* Header */}
//           <div className="text-center mb-8 sm:mb-10">
//             <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#666' }}>
//               Verified & Trusted
//             </p>
//             <h3 className="text-xl sm:text-2xl font-semibold mb-2" style={{ color: '#5B4636' }}>
//               Industry Certifications
//             </h3>
//             <p className="text-xs sm:text-sm max-w-md mx-auto" style={{ color: '#999' }}>
//               Third-party verified and compliant
//             </p>
//           </div>

//           {/* Cards */}
//           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
//             {certifications.map((cert, i) => (
//               <div
//                 key={i}
//                 className="flex flex-col items-center text-center p-3 rounded-lg"
//                 style={{ backgroundColor: '#FFFFFF' }}
//               >
//                 {/* Image — More compact */}
//                 <div
//                   className="relative w-full flex items-center justify-center mb-3"
//                   style={{ height: '80px', backgroundColor: '#FFFFFF', borderRadius: '8px' }}
//                 >
//                   <img
//                     src={cert.image}
//                     alt={cert.alt}
//                     className="w-full h-full object-contain p-3"
//                     onError={(e) => {
//                       e.target.src =
//                         'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80';
//                     }}
//                   />
//                 </div>

//                 {/* Text — Minimal */}
//                 <h4 className="font-semibold text-xs leading-tight mb-1" style={{ color: '#3A3A3A' }}>
//                   {cert.title}
//                 </h4>
//                 <p className="text-[10px]" style={{ color: '#999' }}>
//                   {cert.meta}
//                 </p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* ── Trust & Compliance ── */}
//       <section className="py-12 sm:py-16 lg:py-20" style={{ backgroundColor: '#FFFFFF' }}>
//         <div className="mx-auto px-9 sm:px-6 lg:px-12">
//           <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
//             <div>
//               <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#666' }}>
//                 Trust & Compliance
//               </p>
//               <h2 className="text-2xl sm:text-3xl font-bold leading-tight mb-6" style={{ color: '#5B4636' }}>
//                 Government Certified.<br />
//                 <span style={{ color: '#3A3A3A' }}>100% Transparent.</span>
//               </h2>
//               <p className="text-sm sm:text-base lg:text-lg leading-relaxed mb-4" style={{ color: '#666' }}>
//                 Licensed by the Food Safety and Standards Authority of India (FSSAI), we follow strict food safety practices at every stage. From sourcing to packaging, we ensure clean handling and quality you can trust.
//               </p>
//               <p className="text-sm sm:text-base lg:text-lg leading-relaxed mb-8" style={{ color: '#666' }}>
//                 Our commitment isn't just about meeting standards — it's about exceeding them.
//               </p>
//               <div className="pt-4" style={{ borderTop: '1px solid #E6E1D8' }}>
//                 <p className="text-sm sm:text-base font-semibold mb-3" style={{ color: '#3A3A3A' }}>Certifications Include:</p>
//                 <ul className="space-y-2">
//                   {['FSSAI Licensed Food Authority', '100% Pure & Unadulterated', 'Lab Tested Quality Standards'].map((item) => (
//                     <li key={item} className="text-sm sm:text-base lg:text-base flex gap-2" style={{ color: '#666' }}>
//                       <span style={{ color: '#2F6B3F', fontWeight: '600' }}>•</span>
//                       {item}
//                     </li>
//                   ))}
//                 </ul>
//               </div>
//             </div>

//             <div className="space-y-2">
//               {benefits.map((benefit, index) => (
//                 <div
//                   key={index}
//                   className="p-2 sm:p-6 rounded-lg"
//                   style={{ backgroundColor: '#F8F6F2', border: '1px solid #E6E1D8' }}
//                 >
//                   <div className="flex gap-2 sm:gap-4">
//                     <div
//                       className="shrink-0 w-5 h-5 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mt-0"
//                       style={{ backgroundColor: '#FFFFFF', border: '2px solid #DDD' }}
//                     >
//                       <svg className="w-2.5 h-2.5 sm:w-5 sm:h-5" style={{ color: '#666' }} fill="currentColor" viewBox="0 0 20 20">
//                         <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//                       </svg>
//                     </div>
//                     <div className="flex-1 min-w-0">
//                       <h4 className="text-[11px] sm:text-base font-semibold mb-0 sm:mb-1 leading-tight" style={{ color: '#3A3A3A' }}>{benefit.title}</h4>
//                       <p className="text-[9px] sm:text-sm leading-tight sm:leading-relaxed" style={{ color: '#999' }}>{benefit.description}</p>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* ── Farm to Table ── */}
//       <section className="py-12 sm:py-16 lg:py-20" style={{ backgroundColor: '#FFFFFF' }}>
//         <div className="mx-auto px-8 sm:px-6 lg:px-12">
//           <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
//             <div className="order-2 md:order-1">
//               <div className="rounded-xl overflow-hidden shadow-sm" style={{ border: '1px solid #E6E1D8' }}>
//                 <img
//                   src="https://imgs.etvbharat.com/etvbharat/prod-images/30-01-2026/1200-675-25929679-thumbnail-16x9-agriculture111-aspera.jpg"
//                   alt="Direct from organic farms"
//                   className="w-full h-48 sm:h-72 md:h-96 object-cover"
//                 />
//               </div>
//             </div>
//             <div className="order-1 md:order-2">
//               <h3 className="text-2xl sm:text-3xl lg:text-4xl font-semibold mb-4 lg:mb-6" style={{ color: '#5B4636' }}>
//                 Direct from Farm
//               </h3>
//               <p className="text-sm sm:text-base lg:text-lg leading-relaxed mb-6 lg:mb-8" style={{ color: '#666' }}>
//                 Growing a community of trusted farmers. Direct sourcing, transparent pricing, and incredible freshness in every package.
//               </p>
//               <div className="space-y-4">
//                 {[
//                   { icon: Zap, title: 'Harvested Fresh', sub: 'Daily pickings at peak freshness' },
//                   { icon: AlertCircle, title: 'Zero Chemicals', sub: 'Completely pesticide-free farming' },
//                   { icon: TrendingUp, title: 'Fair Price', sub: 'Transparent pricing benefits everyone' },
//                 ].map(({ icon: Icon, title, sub }) => (
//                   <div key={title} className="flex gap-3">
//                     <div>
//                       <div className="text-sm lg:text-base font-semibold" style={{ color: '#3A3A3A' }}>{title}</div>
//                       <div className="text-xs lg:text-sm" style={{ color: '#666' }}>{sub}</div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* ── Trust Strip ── */}
//       <section style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E6E1D8', borderBottom: '1px solid #E6E1D8' }}>
//         <div className="mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="py-8 sm:py-10 lg:py-12 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
//             {trustPoints.map((point, index) => {
//               const IconComponent = point.icon;
//               return (
//                 <div key={index} className="text-center">
//                   <IconComponent className="w-6 h-6 lg:w-7 lg:h-7 mx-auto mb-2 lg:mb-3" style={{ color: '#666' }} strokeWidth={1.5} />
//                   <div className="text-sm lg:text-base font-semibold" style={{ color: '#3A3A3A' }}>{point.label}</div>
//                   <div className="text-xs lg:text-sm mt-1" style={{ color: '#999' }}>{point.description}</div>
//                 </div>
//               );
//             })}
//           </div>
//         </div>
//       </section>

//       {/* ── Newsletter ── */}
//       <section className="py-8 sm:py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E6E1D8' }}>
//         <div className="mx-auto">
//           <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-center px-6 sm:px-8 py-8 sm:py-10 rounded-xl" style={{ backgroundColor: '#F8F6F2', border: '1px solid #E6E1D8' }}>
//             <div>
//               <h3 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 leading-tight" style={{ color: '#1A1A1A' }}>
//                 Join Our Community
//               </h3>
//               <p className="text-sm sm:text-base mb-1.5" style={{ color: '#666' }}>
//                 Get organic tips, exclusive offers, and new product updates
//               </p>
//               <p className="text-xs sm:text-sm" style={{ color: '#999' }}>No spam. Unsubscribe anytime.</p>
//             </div>
//             {subscribed ? (
//               <div className="flex items-center gap-3 lg:max-w-xl">
//                 <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#F0F9F0', border: '2px solid #2F6B3F' }}>
//                   <Check size={20} style={{ color: '#2F6B3F' }} />
//                 </div>
//                 <div>
//                   <p className="font-semibold text-sm" style={{ color: '#2F6B3F' }}>Thanks for subscribing!</p>
//                   <p className="text-xs" style={{ color: '#666' }}>Check your email for updates</p>
//                 </div>
//               </div>
//             ) : (
//               <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 lg:max-w-xl">
//                 <input
//                   type="email"
//                   placeholder="Enter your email address"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   className="flex-1 px-4 sm:px-5 py-3 sm:py-3 rounded-lg text-sm outline-none transition-all"
//                   style={{
//                     backgroundColor: '#FFFFFF',
//                     color: '#3A3A3A',
//                     border: '1px solid #E6E1D8',
//                   }}
//                   onFocus={(e) => {
//                     e.target.style.borderColor = '#1A1A1A';
//                     e.target.style.boxShadow = '0 0 0 3px rgba(26, 26, 26, 0.1)';
//                   }}
//                   onBlur={(e) => {
//                     e.target.style.borderColor = '#E6E1D8';
//                     e.target.style.boxShadow = 'none';
//                   }}
//                   required
//                 />
//                 <button
//                   type="submit"
//                   className="px-6 sm:px-8 py-3 sm:py-3 rounded-lg font-semibold text-sm whitespace-nowrap transition-all hover:opacity-85 active:scale-95"
//                   style={{
//                     backgroundColor: '#2F6B3F',
//                     color: '#FFFFFF',
//                   }}
//                 >
//                   Subscribe
//                 </button>
//               </form>
//             )}
//           </div>
//         </div>
//       </section>
//     </>
//   );
// }

// export default BenefitsSection;



"use client";

import { Leaf, Wheat, HandHeart, Sprout } from "lucide-react";

const benefits = [
  {
    title: "Rich in Fibre",
    description: "Supports better digestion",
    icon: Wheat,
  },
  {
    title: "Naturally Nutritious",
    description: "Wholesome & nourishing",
    icon: Leaf,
  },
  {
    title: "No Additives",
    description: "No artificial colours or preservatives",
    icon: HandHeart,
  },
  {
    title: "Ethically Sourced",
    description: "Supporting farmers & local communities",
    icon: Sprout,
  },
];

export default function BenefitsSection() {
  const handleImageError = (event) => {
    event.currentTarget.style.display = "none";
  };

  return (
    <section
      className="relative w-full overflow-hidden border-y border-[#e8dfd1] bg-[#fbf8f1] font-body"
      aria-label="Why choose Green Valley Naturals"
    >
      {/* Decorative image - desktop/tablet only */}
      <img
        src="/images/benefits-flour-bowl.png"
        alt=""
        aria-hidden="true"
        onError={handleImageError}
        className="pointer-events-none absolute right-0 top-0 hidden h-full w-[255px] object-cover object-left md:block lg:w-[285px]"
      />

      {/* Soft fade before decorative image */}
      <div className="pointer-events-none absolute right-[170px] top-0 hidden h-full w-[155px] bg-gradient-to-r from-transparent to-[#fbf8f1]/20 md:block lg:right-[195px]" />

      <div className="relative mx-auto max-w-[1440px] px-5 py-7 sm:px-7 md:px-8 md:py-6 lg:px-12 lg:py-0">
        <div className="flex flex-col lg:min-h-[108px] lg:flex-row lg:items-center">
          {/* Intro Heading */}
          <div className="shrink-0 lg:w-[205px] lg:border-r lg:border-[#e6dccb] lg:pr-8">
            <p className="font-display text-[31px] font-medium leading-[0.98] tracking-[-0.035em] text-[#352618] sm:text-[34px] lg:text-[31px]">
              Good for you,
              <span className="block">Good for all.</span>
            </p>
          </div>

          {/* Benefits */}
          <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-6 sm:gap-x-8 md:grid-cols-4 lg:mt-0 lg:flex lg:flex-1 lg:items-center lg:gap-7 lg:pl-9 xl:gap-10 xl:pr-[245px]">
            {benefits.map(({ title, description, icon: Icon }) => (
              <BenefitItem
                key={title}
                icon={Icon}
                title={title}
                description={description}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BenefitItem({ icon: Icon, title, description }) {
  return (
    <div className="flex min-w-0 items-start gap-3 lg:max-w-[155px]">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center text-[#405526]">
        <Icon className="h-[27px] w-[27px]" strokeWidth={1.35} />
      </span>

      <div className="min-w-0">
        <h3 className="text-[12px] font-semibold leading-[1.35] text-[#332519] sm:text-[13px] lg:text-[11px] xl:text-[12px]">
          {title}
        </h3>

        <p className="mt-1 text-[10px] leading-[1.45] text-[#62594b] sm:text-[11px] lg:text-[10px]">
          {description}
        </p>
      </div>
    </div>
  );
}