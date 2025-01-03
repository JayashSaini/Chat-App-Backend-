const { body } = require('express-validator');
const { RoomLinkFormat } = require('../constants');

const joinRoomValidator = () => {
  return [
    body('roomId')
      .optional({ checkFalsy: true })
      .trim()
      .notEmpty()
      .withMessage('Room ID cannot be empty if provided'),

    body('roomId')
      .optional({ checkFalsy: true })
      .trim()
      .notEmpty()
      .withMessage('Password cannot be empty if provided'),

    body('link')
      .optional({ checkFalsy: true })
      .trim()
      .notEmpty()
      .withMessage('Link cannot be empty if provided')
      .bail()
      .custom((link) => {
        if (!link.includes(RoomLinkFormat)) {
          throw new Error('Invalid link provided');
        }
        return true;
      }),

    body().custom((value, { req }) => {
      const { roomId, link } = req.body;
      // Either roomId OR link should be present, but not both.
      if ((roomId && link) || (!roomId && !link)) {
        throw new Error(
          'You must provide either a Room ID or a Link, but not both.'
        );
      }
      return true;
    }),
  ];
};

const setPasswordValidator = () => {
  return [
    // Password validation
    body('password')
      .trim()
      .notEmpty()
      .withMessage('Password cannot be empty')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(
        /^(?=.*[a-zA-Z])(?=.*\d)[A-Za-z\d]{8,}$/, // Regex: At least one letter (upper/lowercase) and one number
        'i'
      )
      .withMessage(
        'Password must contain at least one alphabet and one number'
      ),

    // Confirm Password validation
    body('confirmPassword')
      .trim()
      .notEmpty()
      .withMessage('Confirm password cannot be empty')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Password and confirm password do not match');
        }
        return true;
      }),

    // Room ID validation
    body('roomId').trim().notEmpty().withMessage('Room ID is required'),
  ];
};
module.exports = {
  joinRoomValidator,
  setPasswordValidator,
};
