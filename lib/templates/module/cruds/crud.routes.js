router.get("/", <%= moduleName %>Controller.get<%= moduleNameCapitalized %>);
router.post("/", <%= moduleName %>Controller.create<%= moduleNameCapitalized %>);
router.put("/:id", <%= moduleName %>Controller.update<%= moduleNameCapitalized %>);
router.delete("/:id", <%= moduleName %>Controller.delete<%= moduleNameCapitalized %>);