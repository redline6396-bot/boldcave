import admin from '../config/firebaseAdmin.js';

const authUser = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    
    const [type, idToken] = header.split(' ');

    if (type !== 'Bearer' || !idToken) {
      console.error('Auth: Missing or invalid header format');
      return res.status(401).json({ success: false, message: 'Not Authorized.' });
    }

    try {
      const decoded = await admin.auth().verifyIdToken(idToken);

      // Initialize req.body if it doesn't exist (for GET requests)
      if (!req.body) {
        req.body = {};
      }
      
      req.body.userId = decoded.uid;
      req.body.userEmail = decoded.email;
      // Try to get display name from token, otherwise use email or uid
      req.body.userName = decoded.name || decoded.email?.split('@')[0] || decoded.uid;
      
      // Also set on req object for easier access in all methods
      req.userId = decoded.uid;
      req.userEmail = decoded.email;
      req.userName = req.body.userName;

      next();
    } catch (tokenError) {
      console.error('Token verification failed:', {
        name: tokenError.name,
        message: tokenError.message,
        code: tokenError.code
      });
      
      if (tokenError.code === 'auth/id-token-expired') {
        return res.status(401).json({ success: false, message: 'Token expired. Please sign in again.' });
      } else if (tokenError.code === 'auth/invalid-id-token') {
        return res.status(401).json({ success: false, message: 'Invalid token. Please sign in again.' });
      } else {
        return res.status(401).json({ success: false, message: 'Authentication failed', error: tokenError.message });
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    return res.status(401).json({ success: false, message: 'Authentication error', error: error.message });
  }
};

export default authUser;