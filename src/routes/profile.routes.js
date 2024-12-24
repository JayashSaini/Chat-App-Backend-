const { Router } = require('express');
const router = Router();
const {
  getMyProfile,
  updateMyProfile,
} = require('../controllers/profile.controllers.js');
const { verifyJWT } = require('../middlewares/auth.middlewares.js');
const { profileValidator } = require('../validators/profile.validators.js');
const { validate } = require('../validators/validate.js');

router.use(verifyJWT);

router
  .route('/')
  .get(getMyProfile)
  .patch(profileValidator(), validate, updateMyProfile);

module.exports = router;
