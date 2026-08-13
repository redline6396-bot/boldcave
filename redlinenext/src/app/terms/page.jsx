'use client';

import React from 'react';
import { motion } from 'framer-motion';

const TermsConditionsPage = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: [
        "By accessing and using the Green Valley Naturals website and purchasing products, you agree to be bound by these Terms and Conditions.",
        "If you do not agree to these terms, you must immediately discontinue use of our service.",
        "We reserve the right to modify these terms at any time."
      ]
    },
    {
      title: "2. Definitions",
      subsections: [
        {
          subtitle: "2.1 'Service' includes:",
          items: [
            "The Green Valley Naturals website and all associated pages",
            "Organic products and merchandise",
            "Customer support and account management",
            "Payment processing and order fulfillment"
          ]
        },
        {
          subtitle: "2.2 'User' or 'Customer' means:",
          items: [
            "Any individual accessing our website",
            "Any person purchasing products from us",
            "Legal entities purchasing for commercial use"
          ]
        }
      ]
    },
    {
      title: "3. Products & Ordering",
      subsections: [
        {
          subtitle: "3.1 Product Descriptions",
          content: "We strive to provide accurate product descriptions and specifications. However, we do not guarantee absolute accuracy."
        },
        {
          subtitle: "3.2 Pricing",
          items: [
            "Prices are in INR and subject to change without notice",
            "Price changes do not affect confirmed orders",
            "All prices include applicable taxes"
          ]
        }
      ]
    },
    {
      title: "4. Intellectual Property Rights",
      subsections: [
        {
          subtitle: "4.1 Our Ownership",
          content: "All website content, logos, graphics, and trademarks are owned by Green Valley Naturals or licensed from third parties and protected by copyright laws."
        }
      ]
    },
    {
      title: "5. Refunds & Returns",
      subsections: [
        {
          subtitle: "5.1 Return Policy",
          content: "Products can be returned within 7 days if unused and in original packaging."
        },
        {
          subtitle: "5.2 Refund Process",
          items: [
            "Contact support within 7 days of purchase",
            "Provide order ID and proof",
            "Refunds processed within 5-7 business days",
            "Refunds returned to original payment method"
          ]
        }
      ]
    }
  ];

  return (
    <motion.div
      className='bg-white min-h-screen py-12'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <motion.div className='mb-12' variants={itemVariants} initial='hidden' animate='visible'>
          <h1 className='text-4xl sm:text-5xl font-bold mb-3' style={{ color: '#1A1A1A' }}>Terms & Conditions</h1>
          <p className='text-sm' style={{ color: '#999' }}>Last Updated: January 2025</p>
          <div className='mt-6 p-6 rounded-lg' style={{ backgroundColor: '#F8F6F2' }}>
            <p style={{ color: '#3A3A3A' }}>
              These Terms and Conditions govern your use of Green Valley Naturals website and purchase of products. Please read them carefully before making any purchases.
            </p>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div className='space-y-8' variants={containerVariants} initial='hidden' animate='visible'>
          {sections.map((section, idx) => (
            <motion.section key={idx} className='border-b pb-8' style={{ borderColor: '#E6E1D8' }} variants={itemVariants}>
              <h2 className='text-2xl font-bold mb-4' style={{ color: '#1A1A1A' }}>{section.title}</h2>

              {section.content && (
                <div className='space-y-3 mb-4'>
                  {Array.isArray(section.content) ? (
                    <ul className='list-decimal list-inside space-y-2'>
                      {section.content.map((item, i) => (
                        <li key={i} style={{ color: '#3A3A3A' }}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: '#3A3A3A' }}>{section.content}</p>
                  )}
                </div>
              )}

              {section.subsections && (
                <div className='space-y-6'>
                  {section.subsections.map((sub, i) => (
                    <div key={i}>
                      <h3 className='text-lg font-semibold mb-2' style={{ color: '#333' }}>{sub.subtitle}</h3>
                      {sub.content && <p className='mb-3' style={{ color: '#3A3A3A' }}>{sub.content}</p>}
                      {sub.items && (
                        <ul className='list-disc list-inside space-y-2 ml-4'>
                          {sub.items.map((item, j) => (
                            <li key={j} style={{ color: '#3A3A3A' }}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.section>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.div className='mt-12 p-6 rounded-lg' style={{ backgroundColor: '#F8F6F2' }} variants={itemVariants}>
          <p style={{ color: '#3A3A3A' }}>
            If you have questions about these Terms and Conditions, please contact us at <a href="mailto:support@greenvalley.com" className='font-semibold' style={{ color: '#2F6B3F' }}>support@greenvalley.com</a>
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default TermsConditionsPage;
