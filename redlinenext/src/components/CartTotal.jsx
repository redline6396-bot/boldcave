'use client';

import React, { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../context/ShopContext'

const CartTotal = () => {
    const { currency, getCartAmount, cartItems, products, cartCount } = useContext(ShopContext)
    const [cartBreakdown, setCartBreakdown] = useState([])

    useEffect(() => {
        const breakdown = []
        for (const itemId in cartItems) {
            const product = products.find((p) => p._id === itemId)
            if (product) {
                const quantity = cartItems[itemId]
                if (quantity > 0) {
                    breakdown.push({
                        name: product.name,
                        quantity: quantity,
                        price: product.price,
                        total: product.price * quantity
                    })
                }
            }
        }
        setCartBreakdown(breakdown)
    }, [cartItems, products])

    const subtotal = getCartAmount()
    const deliveryFee = 0
    const total = subtotal + deliveryFee

    return (
        <div className='w-full'>
            {/* Header */}
            <div className='pb-3 mb-4 border-b-2 border-gray-200'>
                <h2 className='text-lg sm:text-base md:text-xl font-bold text-gray-900'>Cart Summary</h2>
                <p className='text-xs md:text-sm text-gray-600 mt-1'>{cartCount} item{cartCount !== 1 ? 's' : ''} in your order</p>
            </div>
            
            {/* Item Breakdown */}
            {cartBreakdown.length > 0 && (
                <div className='mb-4 pb-4 border-b border-gray-200'>
                    <h3 className='text-sm font-semibold text-gray-700 mb-2'>Items</h3>
                    <div className='space-y-1'>
                        {cartBreakdown.map((item, index) => (
                            <div key={index} className='flex items-start justify-between gap-2 text-xs md:text-sm'>
                                <div className='min-w-0 flex-1'>
                                    <p className='text-gray-800 font-medium truncate'>{item.name}</p>
                                    <p className='text-gray-500 text-xs'>Qty: {item.quantity}</p>
                                </div>
                                <span className='shrink-0 font-semibold text-gray-900 whitespace-nowrap'>{currency}{item.total.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Price Breakdown */}
            <div className='space-y-2 mb-4 pb-4 border-b border-gray-200'>
                <div className='flex justify-between items-center text-sm'>
                    <span className='text-gray-700'>Subtotal</span>
                    <span className='text-gray-900 font-medium'>{currency}{subtotal.toFixed(2)}</span>
                </div>
            </div>
            
            {/* Total */}
            <div className='bg-gray-50 w-full p-4'>
                <div className='flex justify-between items-center mb-1'>
                    <span className='text-xs text-gray-600'>You'll pay</span>
                </div>
                <div className='flex justify-between items-center'>
                    <span className='text-base md:text-lg font-bold text-gray-900'>Total</span>
                    <span className='text-lg md:text-xl font-bold text-gray-900'>{currency}{total.toFixed(2)}</span>
                </div>
                <p className='text-xs text-gray-500 mt-2 text-center'>Tax included where applicable</p>
            </div>
        </div>
    )
}

export default CartTotal
