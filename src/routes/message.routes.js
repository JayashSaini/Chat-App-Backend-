const { Router } = require('express');
const {
  deleteMessage,
  getAllMessages,
  sendMessage,
} = require('../controllers/message.controllers.js');
const { verifyJWT } = require('../middlewares/auth.middlewares.js');
const { upload } = require('../middlewares/multer.middlewares.js');
const { sendMessageValidator } = require('../validators/message.validators.js');
const {
  mongoIdPathVariableValidator,
} = require('../validators/mongodb.validators.js');
const { validate } = require('../validators/validate.js');

const router = Router();

router.use(verifyJWT);

router
  .route('/:chatId')
  .get(mongoIdPathVariableValidator('chatId'), validate, getAllMessages)
  .post(
    upload.fields([{ name: 'attachments', maxCount: 5 }]),
    mongoIdPathVariableValidator('chatId'),
    sendMessageValidator(),
    validate,
    sendMessage
  );

//Delete message route based on Message id

router
  .route('/:chatId/:messageId')
  .delete(
    mongoIdPathVariableValidator('chatId'),
    mongoIdPathVariableValidator('messageId'),
    validate,
    deleteMessage
  );

module.exports = router;
