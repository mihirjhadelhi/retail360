/**
 * Pagination utility for MongoDB queries
 * @param {Object} Model - Mongoose model
 * @param {Object} query - MongoDB query object
 * @param {Object} options - Pagination options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 25)
 * @param {Object} options.sort - Sort object (default: { createdAt: -1 })
 * @param {Object|Array} options.populate - Populate options
 * @returns {Promise<Object>} Paginated results with metadata
 */
async function paginate(Model, query = {}, options = {}) {
  const {
    page = 1,
    limit = 25,
    sort = { createdAt: -1 },
    populate = null
  } = options;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit))); // Max 100 items per page
  const skip = (pageNum - 1) * limitNum;

  // Get total count
  const total = await Model.countDocuments(query);

  // Build query
  let dbQuery = Model.find(query).sort(sort).skip(skip).limit(limitNum);

  // Apply population if provided
  if (populate) {
    if (Array.isArray(populate)) {
      populate.forEach(pop => {
        if (typeof pop === 'string') {
          dbQuery = dbQuery.populate(pop);
        } else if (pop.path) {
          // Handle object format: { path: 'field', select: 'fields' }
          dbQuery = dbQuery.populate(pop);
        } else {
          dbQuery = dbQuery.populate(pop);
        }
      });
    } else {
      dbQuery = dbQuery.populate(populate);
    }
  }

  // Execute query
  const data = await dbQuery.exec();

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limitNum);
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;

  return {
    data,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNextPage,
      hasPrevPage
    }
  };
}

module.exports = { paginate };

