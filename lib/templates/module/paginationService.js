/**
 * Pagination Service
 * Provides pagination functionality for database queries
 */
const PER_PAGE = process.env.PER_PAGE || 10;
const DEFAULT_PAGE = process.env.DEFAULT_PAGE || 1;

class PaginationService {
  /**
   * Find records with pagination
   * @param {Object} model - Sequelize model instance
   * @param {Object} req - Express request object
   * @param {Object} options - Additional options
   * @param {Object} options.where - Where clause for filtering
   * @param {Array} options.order - Order clause for sorting
   * @returns {Object} Paginated result with metadata
   */
  async findWithPagination(model, req = { query: {} }, options = {}) {
    try {
      // Validate model
      if (!model) {
        throw new Error("Model is required for pagination");
      }

      if (typeof model.findAndCountAll !== "function") {
        throw new Error(
          "Model must have findAndCountAll method (Sequelize model required)"
        );
      }

      if (!req.query) {
        throw new Error("Request object must have valid query property");
      }

      // Validate and parse pagination parameters
      const page = req.query.page ? parseInt(req.query.page) : DEFAULT_PAGE;
      const pageSize = req.query.limit ? parseInt(req.query.limit) : PER_PAGE;

      const offset = (page - 1) * pageSize;

      const { count, rows } = await model.findAndCountAll({
        where: options.where || {},
        limit: pageSize,
        offset: offset,
        order: options.order || [["createdAt", "DESC"]],
      });

      return {
        totalCounts: count,
        totalPages: Math.ceil(count / pageSize),
        currentPage: page,
        pageLimit: pageSize,
        items: rows,
      };
    } catch (error) {
      console.error("Error fetching paginated items:", error);
      throw error;
    }
  }
}

module.exports = new PaginationService();
