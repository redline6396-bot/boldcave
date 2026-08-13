/**
 * Middleware to merge user data (userId, userEmail, userName) into req.body
 * This is needed because multer overwrites req.body with form fields only
 * This middleware should run AFTER authUser and multer
 */
const mergeUserData = (req, res, next) => {
  // Merge user info from req object (set by authUser) into req.body
  if (req.userId) {
    req.body.userId = req.userId;
  }
  if (req.userEmail) {
    req.body.userEmail = req.userEmail;
  }
  if (req.userName) {
    req.body.userName = req.userName;
  }
  next();
};

export default mergeUserData;
