<%= importACLJson%>

class AclMiddleware {
  checkPermission(role, resource, action) {
    const rolePermissions = acl.roles[role];
    if (!rolePermissions) return false;

    const resourcePermissions = rolePermissions.resources[resource];
    return resourcePermissions && resourcePermissions.includes(action);
  }

  enforcePermission(resource, action) {
    return (req, res, next) => {
      const userRole = req.user?.role; // Assume role is added to req.user during authentication
      if (!userRole || !this.checkPermission(userRole, resource, action)) {
        return res.status(403).json({ error: "Forbidden: Insufficient permissions." });
      }
      next();
    };
  }
}

module.exports = new AclMiddleware();
