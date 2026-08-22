'use client';

import React from 'react';
import HeroCarousel from '@/components/home/HeroCarousel';
import CollectionSection from '@/components/home/CollectionSection';
import ReviewsSection from '@/components/home/ReviewsSection';
import OurStorySection from '@/components/home/OurStorySection';
import FAQSection from '@/components/home/FAQSection';
export default function Home() {
  return (
    <div>
      <HeroCarousel />
      <CollectionSection />
      <OurStorySection />
      <ReviewsSection />
      <FAQSection />
    </div>
  );
}
