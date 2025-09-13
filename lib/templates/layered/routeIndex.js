const express = require('express');
const router = express.Router();

// Import route modules here
// Example: const userRoutes = require('./user.routes');

// Register routes here
// Example: router.use('/users', userRoutes);

// Default API route
router.get('/', (req, res) => {
  res.json({
    message: 'API is running',
    version: 'v1'
  });
});

module.exports = router; 