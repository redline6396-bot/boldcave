'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Home,
  PackagePlus,
  PackageSearch,
  ShoppingCart,
  Star,
  TicketPercent,
  Users,
} from 'lucide-react';

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/homepage', icon: Home, label: 'Homepage' },
  { path: '/list', icon: PackageSearch, label: 'Products' },
  { path: '/add', icon: PackagePlus, label: 'Add Product' },
  { path: '/orders', icon: ShoppingCart, label: 'Orders' },
  { path: '/users', icon: Users, label: 'Users' },
  { path: '/reviews', icon: Star, label: 'Reviews' },
  { path: '/coupon', icon: TicketPercent, label: 'Coupons' },
];

const Sidebar = () => {
  const pathname = usePathname();
  const isActive = (path) => pathname === path || pathname.startsWith(`${path}/`);

  return (
    <aside className='w-16 shrink-0 border-r border-gray-200 bg-white md:w-60'>
      <div className='flex flex-col gap-2 p-3 text-[15px]'>
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`flex items-center gap-3 rounded px-3 py-2 transition-colors ${
              isActive(item.path) ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
            title={item.label}
          >
            <item.icon size={18} />
            <p className='hidden md:block'>{item.label}</p>
          </Link>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
