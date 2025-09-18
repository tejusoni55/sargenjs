module.exports = {
  user_create_schema: {
    name: { type: "string", min: 2, max: 50 },
    email: { type: "email" },
    age: { type: "number", positive: true, integer: true, optional: true },
    phone: { type: "string", pattern: /^[0-9]{10}$/, optional: true }
  }
};
