const { body } = require('express-validator');
const { User } = require('../../models/auth/user.models.js');

const userRegisterValidator = () => {
  return [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Email is invalid')
      .custom(async (value) => {
        // Check if username already exists in the database
        const exitsingUser = await User.findOne({ email: value });
        if (exitsingUser) {
          if (exitsingUser.isEmailVerified) {
            throw new Error('Email already exists');
          }
        }
      }),
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required')
      .isLowercase()
      .withMessage('Username must be lowercase')
      .isLength({ min: 4 })
      .withMessage('Username must be at lease 4 characters long')
      .custom(async (value) => {
        // Check if username already exists in the database
        const exitsingUser = await User.findOne({ username: value });
        if (exitsingUser) {
          throw new Error('Username already exists');
        }
      }),
    body('password')
      .trim()
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 8 })
      .withMessage('Password must be at lease 8 characters long'),
  ];
};

const userLoginValidator = () => {
  return [
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required')
      .isLowercase()
      .withMessage('Username must be lowercase')
      .isLength({ min: 4 })
      .withMessage('Username must be at lease 4 characters long'),
    body('password')
      .trim()
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at lease 6 characters long'),
  ];
};

const userForgotPasswordValidator = () => {
  return [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Email is invalid'),
  ];
};
const userVerifyOtpValidator = () => {
  return [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Email is invalid'),
    body('otp').trim().notEmpty().withMessage('OTP is required'),
  ];
};

const userResetForgottenPasswordValidator = () => {
  return [
    body('newPassword')
      .trim()
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at lease 6 characters long'),
    body('confirmPassword')
      .trim()
      .notEmpty()
      .withMessage('confirm Password is required')
      .custom((value, { req }) => {
        // Check if the confirm password matches the new password
        if (value !== req.body.newPassword) {
          throw new Error(`Confirm password doesn't match`);
        }
        return true;
      }),
  ];
};

module.exports = {
  userRegisterValidator,
  userLoginValidator,
  userVerifyOtpValidator,
  userResetForgottenPasswordValidator,
  userForgotPasswordValidator,
};
