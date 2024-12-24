const { Router } = require('express');
const {
  userRegister,
  userLogin,
  verifyEmail,
  refreshAccessToken,
  forgotPasswordRequest,
  resetForgottenPassword,
  userLogout,
  verifyOtp,
  resendEmailVerification,
  userSelf,
  handleSocialLogin,
  updateAvatar,
} = require('../../controllers/auth/user.controllers.js');
const {
  userRegisterValidator,
  userLoginValidator,
  userForgotPasswordValidator,
  userResetForgottenPasswordValidator,
  userVerifyOtpValidator,
} = require('../../validators/auth/user.validators.js');
const { validate } = require('../../validators/validate.js');
const { verifyJWT } = require('../../middlewares/auth.middlewares.js');
require('../../passport/index.js'); // import the passport config
const passport = require('passport');
const { upload } = require('../../middlewares/multer.middlewares.js');

const router = Router();

//unsecured routes
router.route('/register').post(userRegisterValidator(), validate, userRegister);
router.route('/login').post(userLoginValidator(), validate, userLogin);
router.route('/refresh-token').post(refreshAccessToken);
router.route('/verify-email/:verificationToken').get(verifyEmail);
router.route('/resend-verify-email').post(resendEmailVerification);

router
  .route('/forgot-password')
  .post(userForgotPasswordValidator(), validate, forgotPasswordRequest);

router.route('/verify-otp').post(userVerifyOtpValidator(), validate, verifyOtp);

router
  .route('/reset-password/:resetToken')
  .post(
    userResetForgottenPasswordValidator(),
    validate,
    resetForgottenPassword
  );

// Secured Routes
router.route('/logout').post(verifyJWT, userLogout);
router.route('/self').get(verifyJWT, userSelf);
router
  .route('/update-avatar')
  .patch(verifyJWT, upload.single('avatar'), updateAvatar);

//SSO Routes

router.route('/google').get(
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  }),
  (req, res) => {
    res.send('redirecting to google...');
  }
);
router
  .route('/google/callback')
  .get(passport.authenticate('google'), handleSocialLogin);

// router.route('/google/callback').get((req, res, next) => {
//   // Middleware for passport authentication
//   passport.authenticate('google', async (err, user, info) => {
//     // Check if there's an error or user object
//     if (err || !user) {
//       // If there's an error or user object is not found, handle the error response
//       if (info && info.redirectTo) {
//         // Redirect the user to the specified URL with the error message
//         return res.redirect(
//           info.redirectTo + '?error=' + encodeURIComponent(info.message)
//         );
//       }
//       // If no redirection specified, handle other types of errors or redirect to a default error page
//       return res.redirect('?error=' + encodeURIComponent('unhandled error'));
//     }
//     // If authentication succeeds, proceed to the next middleware
//     const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
//       user._id
//     );
//     const options = {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//     };

//     return res
//       .status(301)
//       .cookie('accessToken', accessToken, options) // set the access token in the cookie
//       .cookie('refreshToken', refreshToken, options) // set the refresh token in the cookie
//       .redirect(
//         `${process.env.CLIENT_SSO_REDIRECT_URL}/${accessToken}/${refreshToken}`
//       );
//   })(req, res, next); // Call the middleware with req, res, next
// });
module.exports = router;
