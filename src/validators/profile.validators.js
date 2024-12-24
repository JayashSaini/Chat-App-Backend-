const { body } = require('express-validator');

const profileValidator = () => {
  return [
    body('firstName')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('First name is required'),
    body('lastName')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Last name is required'),
    body('phoneNumber')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Phone number is required')
      .isNumeric()
      .withMessage('Phone number is invalid.')
      .isLength({ min: 10, max: 10 })
      .withMessage('Phone number is invalid. It must be 10 digits long.'),
    body('email')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Email is invalid'),
  ];
};

module.exports = { profileValidator };
