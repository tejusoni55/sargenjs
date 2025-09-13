router.get("/", <%= moduleName %>Controller.get<%= moduleName %>);
router.post("/", <%= moduleName %>Controller.create<%= moduleName %>);
router.put("/:id", <%= moduleName %>Controller.update<%= moduleName %>);
router.delete("/:id", <%= moduleName %>Controller.delete<%= moduleName %>);