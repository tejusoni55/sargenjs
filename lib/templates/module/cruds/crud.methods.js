// Create <%= moduleName %>
create<%= moduleNameCapitalized %>: async function (req, res) {
  try {
    const result = await <%= moduleName %>Service.create<%= moduleNameCapitalized %>(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
},

// Get <%= moduleName %>
get<%= moduleNameCapitalized %>: async function (req, res) {
  try {
    const result = await <%= moduleName %>Service.get<%= moduleNameCapitalized %>(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
},

// Update <%= moduleName %>
update<%= moduleNameCapitalized %>: async function (req, res) {
  try {
    const result = await <%= moduleName %>Service.update<%= moduleNameCapitalized %>(req.params.id, req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
},

// Delete <%= moduleName %>
delete<%= moduleNameCapitalized %>: async function (req, res) {
  try {
    const result = await <%= moduleName %>Service.delete<%= moduleNameCapitalized %>(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
},