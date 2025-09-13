// Create <%= moduleName %>
create<%= moduleName %>: async function (req, res) {
  try {
    const result = await <%= moduleName %>Service.create<%= moduleName %>(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
},

// Get <%= moduleName %>
get<%= moduleName %>: async function (req, res) {
  try {
    const result = await <%= moduleName %>Service.get<%= moduleName %>(req.query);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
},

// Update <%= moduleName %>
update<%= moduleName %>: async function (req, res) {
  try {
    const result = await <%= moduleName %>Service.update<%= moduleName %>(req.params.id, req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
},

// Delete <%= moduleName %>
delete<%= moduleName %>: async function (req, res) {
  try {
    const result = await <%= moduleName %>Service.delete<%= moduleName %>(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
},