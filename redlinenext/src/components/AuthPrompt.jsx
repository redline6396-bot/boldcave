'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Shield, Zap } from 'lucide-react';

export default function AuthPrompt({ title = 'Sign In to Continue', subtitle = 'Access your personalized content and features' }) {
  const router = useRouter();

  const features = [
    { icon: Shield, text: 'Secure account access' },
    { icon: Zap, text: 'Personalized experience' },
    { icon: LogIn, text: 'Easy sign in with email' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F8F6F2] via-white to-[#F0EDE8] px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-xl shadow-xl border border-[#E6E1D8] p-8 sm:p-10">
          {/* Icon */}
          <div className="w-16 h-16 bg-[#2F6B3F] rounded-full flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-8 h-8 text-white" strokeWidth={2} />
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-[#2F6B3F] mb-2">
            {title}
          </h1>

          {/* Subtitle */}
          <p className="text-center text-[#8A6F55] text-sm sm:text-base mb-8">
            {subtitle}
          </p>

          {/* Benefits */}
          <div className="space-y-3 mb-10">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#E8F4ED] flex items-center justify-center shrink-0">
                  <feature.icon className="w-3 h-3 text-[#2F6B3F]" strokeWidth={2.5} />
                </div>
                <p className="text-[#3A3A3A] text-sm font-medium">{feature.text}</p>
              </div>
            ))}
          </div>

          {/* Primary CTA */}
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-[#2F6B3F] text-white font-semibold py-3 px-4 rounded-lg hover:shadow-lg hover:opacity-90 transition-all mb-3 flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" strokeWidth={2} />
            <span>Sign In</span>
          </button>

          {/* Secondary CTA */}
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-[#F8F6F2] text-[#2F6B3F] font-semibold py-3 px-4 rounded-lg hover:bg-[#F0EDE8] transition-all border border-[#E6E1D8]"
          >
            Create Account
          </button>

          {/* Footer Text */}
          <p className="text-center text-[#AAA] text-xs mt-6">
            100% Organic & Fresh | Secure Shopping
          </p>
        </div>

        {/* Trust Indicators */}
        <div className="text-center mt-8">
          <p className="text-[#8A6F55] text-xs font-medium mb-3">TRUSTED BY THOUSANDS</p>
          <div className="flex justify-center gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-[#2F6B3F]"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
