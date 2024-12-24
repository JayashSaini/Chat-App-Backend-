const mongoose = require('mongoose');
const { ApiError } = require('../utils/ApiError.js');

const errorHandler = function (err, req, res, _) {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode =
      error.statusCode || error instanceof mongoose.Error ? 400 : 500;
    const message = error.message || 'Something went wrong';

    error = new ApiError(statusCode, message, error?.errors || [], err.stack);
  }

  // Now we are sure that the `error` variable will be an instance of ApiError class

  const response = {
    ...error,
    message: error.message,
    ...(process.env.NODE_ENV === 'production' ? {} : { stack: error.stack }),
  };

  // Send error response
  return res.status(error.statusCode).json(response);
};

module.exports = { errorHandler };
