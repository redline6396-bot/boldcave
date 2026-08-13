'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { assets } from '@/assets/assets';

const Sidebar = () => {
  const pathname = usePathname();

  const isActive = (path) => {
    return pathname === path || pathname.startsWith(path + '/');
  };

  const navItems = [
    { path: '/admin', icon: assets.order_icon, label: 'Dashboard' },
    { path: '/add', icon: assets.add_icon, label: 'Add Items' },
    { path: '/list', icon: assets.order_icon, label: 'List Items' },
    { path: '/orders', icon: assets.order_icon, label: 'Order Items' },
    { path: '/reviews', icon: assets.order_icon, label: 'Reviews' },
    { path: '/coupon', icon: assets.order_icon, label: 'Coupons' }
  ];

  return (
    <div className='w-18 md:w-[18%] min-h-screen border-r-2'>
      <div className='flex flex-col gap-4 pt-6 pl-[20%] text-[15px]'>
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`flex items-center gap-3 border border-r-0 px-3 py-2 rounded-l transition-colors ${
              isActive(item.path)
                ? 'border-gray-600 bg-gray-100'
                : 'border-gray-300'
            }`}
          >
            <img className='w-5 h-5' src={item.icon} alt="" />
            <p className='hidden md:block text-gray-800'>{item.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
