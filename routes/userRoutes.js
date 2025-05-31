// USER ROUTES WITH SWAGGER

const express = require('express');
const router = express.Router();
const {verifyToken} = require('../middlewares/authMiddleware');
const requestController = require('../controller/requestController');
const feedbackController = require('../controller/feedbackController');
const mailController = require('../controller/mailController');

router.post('/requests', verifyToken,  requestController.createRequest);

router.get('/requests/my', verifyToken,  requestController.getUserRequests);

router.get('/mails', verifyToken,  mailController.getMyMails);

router.post('/mails/:mailId/confirm', verifyToken,  mailController.confirmOffer);

router.delete('/mails/:mailId/reject', verifyToken,  mailController.rejectOffer);

router.post('/feedback', verifyToken,  feedbackController.leaveFeedback);

const userController = require('../controller/userController');

router.get('/me', verifyToken, userController.getMyProfile);

router.put('/profile/update', verifyToken, userController.updateMyProfile);

router.put('/profile/change-password', verifyToken, userController.changePassword);
router.post('/requests/:id/cancel', verifyToken, userController.cancelRequest);

module.exports = router;

