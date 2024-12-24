const { Router } = require('express');
const {
  addNewParticipantInGroupChat,
  createAGroupChat,
  createOrGetAOneOnOneChat,
  deleteGroupChat,
  deleteOneOnOneChat,
  getAllChats,
  getGroupChatDetails,
  leaveGroupChat,
  removeParticipantFromGroupChat,
  renameGroupChat,
  searchAvailableUsers,
} = require('../controllers/chat.controllers.js');
const { verifyJWT } = require('../middlewares/auth.middlewares.js');
const {
  createAGroupChatValidator,
  updateGroupChatNameValidator,
} = require('../validators/chat.validators.js');
const {
  mongoIdPathVariableValidator,
} = require('../validators/mongodb.validators.js');
const { validate } = require('../validators/validate.js');

const router = Router();

router.use(verifyJWT);

router.route('/').get(getAllChats);

router.route('/users').get(searchAvailableUsers);

router
  .route('/c/:receiverId')
  .post(
    mongoIdPathVariableValidator('receiverId'),
    validate,
    createOrGetAOneOnOneChat
  );

router
  .route('/group')
  .post(createAGroupChatValidator(), validate, createAGroupChat);

router
  .route('/group/:chatId')
  .get(mongoIdPathVariableValidator('chatId'), validate, getGroupChatDetails)
  .patch(
    mongoIdPathVariableValidator('chatId'),
    updateGroupChatNameValidator(),
    validate,
    renameGroupChat
  )
  .delete(mongoIdPathVariableValidator('chatId'), validate, deleteGroupChat);

router
  .route('/group/:chatId/:participantId')
  .post(
    mongoIdPathVariableValidator('chatId'),
    mongoIdPathVariableValidator('participantId'),
    validate,
    addNewParticipantInGroupChat
  )
  .delete(
    mongoIdPathVariableValidator('chatId'),
    mongoIdPathVariableValidator('participantId'),
    validate,
    removeParticipantFromGroupChat
  );

router
  .route('/leave/group/:chatId')
  .delete(mongoIdPathVariableValidator('chatId'), validate, leaveGroupChat);

router
  .route('/remove/:chatId')
  .delete(mongoIdPathVariableValidator('chatId'), validate, deleteOneOnOneChat);

module.exports = router;
