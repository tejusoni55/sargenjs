/**
 * Test Controller
 * Provides test endpoints to verify API functionality
 */

/**
 * GET /api/v1/test/test-api
 * Test endpoint to verify API is working
 */
exports.testApi = (req, res) => {
  res.json({
    success: true,
    message: "Test API endpoint is working!",
    timestamp: new Date().toISOString()
  });
}; 