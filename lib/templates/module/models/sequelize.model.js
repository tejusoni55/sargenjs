"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class <%= moduleName %> extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  <%= moduleName %>.init(
    {
      // columns of the table
      <% if (modelAttributes && modelAttributes.length > 0) { %>
      <% modelAttributes.forEach((attr, index) => { %>
      <%= attr.name %>: {
        type: DataTypes.<%= attr.type %>,
        allowNull: true,
      }<%= index < modelAttributes.length - 1 ? ',' : '' %>
      <% }); %>
      <% } else { %>
      // No custom attributes defined
      <% } %>
    },
    {
      sequelize,
      modelName: "<%= moduleName %>",
      tableName: "<%= moduleName %>",
    }
  );
  return <%= moduleName %>;
};
