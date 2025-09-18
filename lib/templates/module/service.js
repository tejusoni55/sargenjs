/**
 * <%= moduleName %> Service
 */
<%= modelImport %><% if (modelImport) { %>
const <%= moduleName %>Model = db.<%= moduleName %>;<% } %><% if (modelAttributes && modelAttributes.length > 0) { %>
const paginationService = require("./paginationService.js");<% } %>

module.exports = {
  // Add your service methods here
  <%= crudServices %>
}; 