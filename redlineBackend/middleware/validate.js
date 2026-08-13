const validateBody = (fields = []) => (req, res, next) => {
  const missing = fields.filter((field) => {
    const value = req.body?.[field];
    return value === undefined || value === null || value === '';
  });

  if (missing.length > 0) {
    return res.json({
      success: false,
      message: `Missing required fields: ${missing.join(', ')}`
    });
  }

  next();
};

export { validateBody };