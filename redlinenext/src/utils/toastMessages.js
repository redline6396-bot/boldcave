// Toast notification messages - standardized across the app
// Use these to ensure consistent messaging and professional appearance
// 
// USAGE EXAMPLE:
// import { ToastMessages } from '../utils/toastMessages';
// const { success } = useContext(NotificationContext);
// 
// success(ToastMessages.addedToCart(productName));
// error(ToastMessages.errorAddingToCart);

export const ToastMessages = {
  // Cart Operations
  addedToCart: (productName) => `${productName} added to cart`,
  removedFromCart: (productName) => `${productName} removed from cart`,
  quantityUpdated: 'Quantity updated',
  cartCleared: 'Your cart has been cleared',
  proceedingToCheckout: 'Proceeding to checkout...',

  movedToCart: (productName) => `${productName} added to cart`,

  // Order Operations
  orderPlaced: 'Order placed successfully! 🎉',
  orderCancelled: 'Order cancelled',
  orderTracking: 'Loading order details...',
  trackingUpdated: 'Tracking information updated',

  // Account & Auth
  profileUpdated: 'Your profile has been updated successfully',
  passwordChanged: 'Your password has been changed successfully',
  loggedIn: 'Welcome back! 👋',
  loggedOut: 'You have been logged out successfully',
  accountCreated: 'Your account has been created successfully',

  // Error Messages
  errorAddingToCart: 'Failed to add to cart',
  errorRemovingFromCart: 'Failed to remove from cart',
  errorUpdatingProfile: 'Failed to update profile',
  errorGeneral: 'Something went wrong. Please try again.',
  outOfStock: 'This item is out of stock',
  invalidInput: 'Please check your input and try again',

  // Success Messages
  copiedToClipboard: 'Copied to clipboard',
  savedSuccessfully: 'Saved successfully',
  deletedSuccessfully: 'Deleted successfully',
  uploadedSuccessfully: 'Uploaded successfully',
  
  // Loading/Info Messages
  loading: 'Loading...',
  processing: 'Processing your request...',
  saving: 'Saving changes...',
  
  // Warning Messages
  unsavedChanges: 'You have unsaved changes',
  lowStock: (count) => `Only ${count} left in stock`,
  sessionExpiring: 'Your session is about to expire',
};
