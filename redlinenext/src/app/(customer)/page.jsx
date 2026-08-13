'use client';

import React from 'react';
import Hero from '@/components/Hero';
import Category from '@/components/Category';
import HomeProducts from '@/components/HomeProducts';
import BenefitsSection from '@/components/BenefitsSection';
import ReviewsSection from '@/components/ReviewsSection';
import NewsletterStrip from '@/components/NewsletterStrip';
import FeaturedProducts from '@/components/FeaturedProducts';
import BestsellingProducts from '@/components/BestsellingProducts';
import CartPreview from '@/components/CartPreview';
import OurStorySection from "@/components/OurStorySection";
export default function Home() {
  return (
    <div>
      <Hero />
      <Category />
      <HomeProducts />
      <BenefitsSection />
      <OurStorySection />
      <ReviewsSection />
      <NewsletterStrip />
      <FeaturedProducts />
      <BestsellingProducts />
      <CartPreview />
    </div>
  );
}
