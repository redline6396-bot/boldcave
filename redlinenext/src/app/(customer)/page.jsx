'use client';

import React from 'react';
import HeroCarousel from '@/components/home/HeroCarousel';
import CollectionSection from '@/components/home/CollectionSection';
import ForHimSection from '@/components/home/ForHimSection';
import OurStorySection from '@/components/home/OurStorySection';
import ForHerSection from '@/components/home/ForHerSection';
import CartPreview from '@/components/CartPreview';
export default function Home() {
  return (
    <div>
      <HeroCarousel />
      <CollectionSection />
      <ForHimSection />
      <OurStorySection />
      <ForHerSection />
      <CartPreview />
    </div>
  );
}
