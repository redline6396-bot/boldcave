'use client';

import React from 'react';
import { motion } from 'framer-motion';

const PrivacyPolicyPage = () => {
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
      title: "1. Introduction & Overview",
      content: [
        "Green Valley Naturals ('Company', 'we', 'our', or 'us') operates the website and digital product platform. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.",
        "We use your data to provide and improve the Service. By using the Service, you agree to the collection and use of information in accordance with this policy."
      ]
    },
    {
      title: "2. Information Collection & Usage",
      subsections: [
        {
          subtitle: "2.1 Personal Identification Information",
          items: ["Full Name", "Email Address", "Phone Number", "Country/Location", "Billing Address"]
        },
        {
          subtitle: "2.2 Payment Information",
          content: "Payment processing is handled exclusively through Razorpay. We do NOT store your complete credit/debit card details."
        },
        {
          subtitle: "2.3 Automatically Collected Data",
          items: ["IP Address & Device Information", "Browser Type & OS", "Pages Visited", "Referrer URLs", "Cookie & Session Data"]
        }
      ]
    },
    {
      title: "3. Purpose of Data Collection",
      content: [
        "Account Creation & Management",
        "Order Processing & Fulfillment",
        "Payment Facilitation",
        "Customer Support",
        "Communication & Notifications",
        "Analytics & Service Improvement",
        "Fraud Prevention",
        "Legal Compliance"
      ]
    },
    {
      title: "4. Data Security & Protection",
      subsections: [
        {
          subtitle: "4.1 Security Measures",
          items: [
            "SSL/TLS Encryption for data in transit",
            "Secure password hashing",
            "Regular security audits",
            "Restricted access controls",
            "HTTPS protocol across the entire website"
          ]
        }
      ]
    },
    {
      title: "5. Your Privacy Rights & Choices",
      subsections: [
        {
          subtitle: "5.1 Access & Portability",
          content: "You have the right to request and download a copy of all your personal data."
        },
        {
          subtitle: "5.2 Deletion & Erasure",
          content: "You may request deletion of your account and associated data."
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
          <h1 className='text-4xl sm:text-5xl font-bold mb-3' style={{ color: '#1A1A1A' }}>Privacy Policy</h1>
          <p className='text-sm' style={{ color: '#999' }}>Last Updated: January 2025</p>
          <div className='mt-6 p-6 rounded-lg' style={{ backgroundColor: '#F8F6F2' }}>
            <p style={{ color: '#3A3A3A' }}>
              At Green Valley Naturals, we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information.
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
            If you have questions about this Privacy Policy, please contact us at <a href="mailto:support@greenvalley.com" className='font-semibold' style={{ color: '#2F6B3F' }}>support@greenvalley.com</a>
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default PrivacyPolicyPage;
