/**
 * Test Routes
 * Routes for testing API functionality
 */
const router = require('express').Router();
const testController = require('<%=controllerPath%>');

// Test endpoint
router.get('/test-api', testController.testApi);

module.exports = router; 