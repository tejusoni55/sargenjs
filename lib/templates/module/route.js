/**
 * <%= moduleName %> Routes
 */
<%= controllerImport%>

const express = require('express');
const router = express.Router();

// Add your routes here
<%= crudRoutes %>

module.exports = router; 