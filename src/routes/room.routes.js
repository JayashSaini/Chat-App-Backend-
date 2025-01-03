const { Router } = require('express');
const router = Router();

const {
  createRoom,
  joinRoom,
  getRoomById,
  setRoomPassword,
  toggleChatEnable,
} = require('../controllers/room.controllers.js');
const { verifyJWT } = require('../middlewares/auth.middlewares.js');
const {
  joinRoomValidator,
  setPasswordValidator,
} = require('../validators/room.validators.js');
const { validate } = require('../validators/validate.js');

router.use(verifyJWT);

router.route('/').post(createRoom);

router.route('/join').post(joinRoomValidator(), validate, joinRoom);

router.route('/:roomId').get(getRoomById);
router.route('/chat/:roomId').patch(toggleChatEnable);

router
  .route('/set-password')
  .patch(setPasswordValidator(), validate, setRoomPassword);

module.exports = router;
