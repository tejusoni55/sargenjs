/**
 * <%= moduleName %> Service
 */
<%= modelImport %>
const <%= moduleName %>Model = db.<%= moduleName %>;

module.exports = {
  // Add your service methods here
  <%= crudServices %>
}; 