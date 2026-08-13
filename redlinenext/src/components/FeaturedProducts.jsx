'use client';

import React, { useContext } from 'react';
import { ShopContext } from '@/context/ShopContext';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

const FeaturedProducts = () => {
  const router = useRouter();
  const { products, addToCart, currency } = useContext(ShopContext);

  // Use admin products only
  const allProducts = products && products.length > 0 ? products : [];

  // Filter for featured products
  const featuredProducts = allProducts.filter(product => product.featured === true).slice(0, 4);

  // Helper function to get product price (first variant's selling price)
  const getProductPrice = (product) => {
    if (product.variants && product.variants.length > 0) {
      return Number(product.variants[0].sellingPrice) || 0;
    }
    return 0;
  };

  // Helper function to get product original price
  const getOriginalPrice = (product) => {
    if (product.variants && product.variants.length > 0) {
      return product.variants[0].originalPrice || null;
    }
    return product.originalPrice || null;
  };

  // Helper function to check if product is out of stock (all variants have 0 stock)
  const isProductOutOfStock = (product) => {
    if (!product.variants || product.variants.length === 0) return false;
    return product.variants.every(variant => (variant.stockQty || 0) === 0);
  };

  // Calculate discount from margin (Original Price - Selling Price)
  const getDiscount = (product) => {
    if (product.variants && product.variants.length > 0) {
      const variant = product.variants[0];
      const sellingPrice = Number(variant.sellingPrice) || 0;
      const originalPrice = Number(variant.originalPrice) || 0;
      
      if (originalPrice > sellingPrice && sellingPrice > 0) {
        return Math.round(((originalPrice - sellingPrice) / originalPrice) * 100);
      }
    }
    return 0;
  };

  if (featuredProducts.length === 0) {
    return null;
  }

  return (
    <section className="py-12 px-4 md:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold" style={{ color: '#1A1A1A' }}>
            Featured Products
          </h2>
          <p className="text-sm mt-2" style={{ color: '#555' }}>
            Curated collection of our best products
          </p>
        </div>

        {/* Featured Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => {
            const productId = product.id || product._id;
            const discount = getDiscount(product);
            const productPrice = getProductPrice(product);
            const originalPrice = getOriginalPrice(product);

            // Normalize image
            const productImage = (() => {
              if (product.image) return product.image;
              if (Array.isArray(product.images)) {
                return typeof product.images[0] === 'string' ? product.images[0] : product.images[0]?.url;
              }
              return 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png';
            })();

            return (
              <div
                key={productId}
                onClick={() => router.push(`/product/${productId}`)}
                className="group rounded-lg border overflow-hidden transition hover:shadow-lg cursor-pointer"
                style={{ borderColor: '#E6E1D8' }}
              >
                {/* Product Image Container */}
                <div className="relative overflow-hidden bg-gray-100 h-48 sm:h-56 md:h-64 flex items-center justify-center">
                  <img
                    src={productImage}
                    alt={product.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 p-3"
                    style={{
                      filter: isProductOutOfStock(product) ? 'grayscale(100%)' : 'grayscale(0%)',
                      opacity: isProductOutOfStock(product) ? 0.85 : 1
                    }}
                    onError={(e) => (e.target.src = 'https://via.placeholder.com/400?text=No+Image')}
                  />

                  {/* Out of Stock Badge */}
                  {isProductOutOfStock(product) && (
                    <div
                      className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: '#666' }}
                    >
                      Out of Stock
                    </div>
                  )}

                  {/* Discount Badge */}
                  {!isProductOutOfStock(product) && discount > 0 && (
                    <div
                      className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: '#D6524A' }}
                    >
                      -{discount}%
                    </div>
                  )}

                  {/* Featured Badge */}
                  <div
                    className="absolute top-3 right-3 px-2 py-1 rounded text-xs font-bold text-white"
                    style={{ backgroundColor: '#2F6B3F' }}
                  >
                    Featured
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  {/* Category Badge */}
                  {product.categories && product.categories.length > 0 && (
                    <span className="inline-block text-xs font-medium mb-2 px-2 py-1 rounded" style={{ backgroundColor: '#F5F5F5', color: '#666' }}>
                      {product.categories[0]}
                    </span>
                  )}

                  {/* Name - Large & Bold */}
                  <h3 className="text-lg md:text-xl font-bold leading-snug mb-1 tracking-tight" style={{ color: '#1A1A1A' }}>
                    {product.name}
                  </h3>

                  {/* Weight */}
                  {(() => {
                    const variant = product.variants?.[0];
                    const weight = variant?.weight || '';
                    return weight ? (
                      <p className="text-xs mb-3" style={{ color: '#999' }}>
                        {weight}
                      </p>
                    ) : null;
                  })()}

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex text-sm" style={{ color: '#2F6B3F' }}>
                      {[...Array(5)].map((_, i) => (
                        <span key={i}>{i < Math.floor(product.rating || 0) ? '★' : '☆'}</span>
                      ))}
                    </div>
                    <span className="text-xs" style={{ color: '#999' }}>
                      ({product.reviews || 0})
                    </span>
                  </div>

                  {/* Tags */}
                  {product.tags && product.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {product.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 rounded"
                          style={{ backgroundColor: '#F0F8F4', color: '#2F6B3F' }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Price */}
                  <div className="flex flex-col gap-1 mb-3">
                    {(() => {
                      const variant = product.variants?.[0];
                      const sp = Number(variant?.sellingPrice) || 0;
                      const cp = Number(variant?.costPrice) || 0;
                      const disc = sp > cp && sp > 0 ? Math.round(((sp - cp) / sp) * 100) : 0;
                      const originalPrice = variant?.originalPrice ? Number(variant.originalPrice) : (disc > 0 ? Math.round(sp + (sp * disc / 100)) : sp);
                      
                      return (
                        <>
                          <div className="flex items-baseline gap-2">
                            {originalPrice > sp && (
                              <span className="text-xs line-through" style={{ color: '#999' }}>
                                {currency}{originalPrice}
                              </span>
                            )}
                            <span className="font-bold text-base" style={{ color: '#2F6B3F' }}>
                              {currency}{sp}
                            </span>
                            {disc > 0 && (
                              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#D6524A', color: '#FFF' }}>
                                Save {disc}%
                              </span>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Button */}
                  <button
                    onClick={(e) => {
                      if (isProductOutOfStock(product)) return;
                      e.stopPropagation();
                      addToCart(productId, 1);
                    }}
                    disabled={isProductOutOfStock(product)}
                    className="w-full py-2 rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: isProductOutOfStock(product) ? '#CCCCCC' : '#2F6B3F',
                      color: '#FFF',
                      cursor: isProductOutOfStock(product) ? 'not-allowed' : 'pointer',
                      opacity: isProductOutOfStock(product) ? 0.6 : 1,
                      filter: isProductOutOfStock(product) ? 'grayscale(100%)' : 'grayscale(0%)'
                    }}
                  >
                    Add to Cart
                    {!isProductOutOfStock(product) && <ChevronRight size={14} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
