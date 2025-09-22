// Create <%= moduleName %> service
create<%= moduleNameCapitalized %>: async function (data) {
    try {
      <% if (modelAttributes && modelAttributes.length > 0) { %>
      // Create database record with model attributes
      const newRecord = await <%= moduleName %>Model.create(data);
      return {
        success: true,
        message: "Created successfully",
        data: newRecord
      }
      <% } else { %>
      // TODO: Add database logic here
      return {
        success: true,
        message: "Created successfully",
        data: []
      }
      <% } %>
    } catch (error) {
      return {
        success: false,
        message: error.message,
      }
    }
},
  
// Get <%= moduleName %> service
get<%= moduleNameCapitalized %>: async function (req) {
    try {
        <% if (modelAttributes && modelAttributes.length > 0) { %>
        // Get paginated records from the database
        const result = await paginationService.findWithPagination(<%= moduleName %>Model, req);
        return {
            success: true,
            message: "Retrieved successfully",
            data: result
        }
        <% } else { %>
        // TODO: Add database logic here
        return {
            success: true,
            message: "Retrieved successfully",
            data: []
        }
        <% } %>
    } catch (error) {
        return {
            success: false,
            message: error.message,
        }
    }
},

// Update <%= moduleName %> service
update<%= moduleNameCapitalized %>: async function (id, data) {
    try {
        <% if (modelAttributes && modelAttributes.length > 0) { %>
        // Update database record by id
        await <%= moduleName %>Model.update(data, { where: { id: id } });
        <% } else { %>
        // TODO: Add database logic here
        <% } %>
        return {
            success: true,
            message: "Updated successfully",
            data: { id, ...data }
        }
    } catch (error) {
        return {
            success: false,
            message: error.message,
        }
    }
},

// Delete <%= moduleName %> service
delete<%= moduleNameCapitalized %>: async function (id) {
    try {
        <% if (modelAttributes && modelAttributes.length > 0) { %>
        // Delete database record by id
        await <%= moduleName %>Model.destroy({ where: { id: id } });
        <% } else { %>
        // TODO: Add database logic here
        <% } %>
        return {
            success: true,
            message: "Deleted successfully",
            data: { id }
        }
    } catch (error) {
        return {
            success: false,
            message: error.message,
        }
    }
},