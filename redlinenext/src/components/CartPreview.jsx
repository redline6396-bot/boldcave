'use client';

import React, { useContext, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ShopContext } from '../context/ShopContext';

const CartPreview = () => {
  const router = useRouter();
  const { cartItems, products, currency = '₹' } = useContext(ShopContext);

  // Calculate total items in cart
  const getTotalCartItems = useMemo(() => {
    let total = 0;
    Object.values(cartItems).forEach(item => {
      if (typeof item === 'object') {
        total += Object.values(item).reduce((sum, qty) => sum + (Number(qty) || 0), 0);
      } else {
        total += Number(item) || 0;
      }
    });
    return total;
  }, [cartItems]);

  // Get cart items for preview with prices
  const cartItemsData = useMemo(() => {
    const items = [];
    let totalPrice = 0;

    Object.entries(cartItems).forEach(([productId, variants]) => {
      const prod = products?.find(p => String(p.id || p._id) === String(productId));
      if (prod) {
        if (typeof variants === 'object') {
          Object.entries(variants).forEach(([weight, qty]) => {
            if (qty > 0) {
              // Handle different image formats
              let image = null;
              if (prod.images && Array.isArray(prod.images)) {
                image = prod.images[0];
                if (typeof image === 'object' && image.url) {
                  image = image.url;
                }
              } else if (prod.image) {
                image = prod.image;
              }

              const variant = prod.variants?.find(v => String(v.weight).trim() === String(weight).trim());
              const price = variant?.sellingPrice || 0;
              totalPrice += price * qty;

              items.push({
                id: productId,
                image: image || '/placeholder.png',
                quantity: qty
              });
            }
          });
        } else if (variants > 0) {
          // Handle different image formats
          let image = null;
          if (prod.images && Array.isArray(prod.images)) {
            image = prod.images[0];
            if (typeof image === 'object' && image.url) {
              image = image.url;
            }
          } else if (prod.image) {
            image = prod.image;
          }

          const price = prod.variants?.[0]?.sellingPrice || 0;
          totalPrice += price * variants;

          items.push({
            id: productId,
            image: image || '/placeholder.png',
            quantity: variants
          });
        }
      }
    });

    return { items, totalPrice };
  }, [cartItems, products]);

  if (getTotalCartItems === 0) return null;

  const { items, totalPrice } = cartItemsData;
  const displayItems = items.slice(0, 3);
  const remainingCount = getTotalCartItems - 3;

  return (
    <div className="fixed bottom-6 right-4 z-40 animate-slide-up p-2 mb-2">
      <div className="max-w-xs lg:max-w-sm rounded-xl bg-white shadow-2xl">
        <div className="px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-3 sm:gap-4">
          {/* Left: Product Images & Info */}
          <div className="flex items-center gap-4 min-w-0">
            {/* Product Images */}
            <div className="flex items-center -space-x-2 sm:-space-x-3">
              {displayItems.map((item, idx) => (
                <div
                  key={idx}
                  className="w-8 sm:w-10 h-8 sm:h-10 rounded-full border-2 border-white shadow-sm shrink-0 overflow-hidden bg-gray-100"
                >
                  <img
                    src={item.image}
                    alt="product"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/40?text=Product';
                    }}
                  />
                </div>
              ))}
              
              {/* Remaining Count Circle */}
              {remainingCount > 0 && (
                <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-green-600 text-white flex items-center justify-center text-[10px] sm:text-xs font-bold border-2 border-white shadow-sm shrink-0">
                  +{remainingCount}
                </div>
              )}
            </div>

            {/* Text Info */}
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium">
                {getTotalCartItems} item{getTotalCartItems !== 1 ? 's' : ''} in cart
              </p>
              <p className="text-sm sm:text-base font-bold text-gray-900">
                {currency}{totalPrice.toFixed(0)}
              </p>
            </div>
          </div>

          {/* Right: CTA Button */}
          <button
            onClick={() => router.push('/cart')}
            className="px-4 sm:px-6 py-1.5 sm:py-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs sm:text-sm rounded-lg sm:rounded-xl whitespace-nowrap transition-colors duration-200 shrink-0"
          >
            View Cart
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CartPreview;
