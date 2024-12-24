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

module.exports = {
  joinRoomValidator,
};
