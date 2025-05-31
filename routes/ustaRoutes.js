
const express = require('express');
const router = express.Router();
const { verifyToken} = require('../middlewares/authMiddleware');
const requestController = require('../controller/requestController');
const mailController = require('../controller/mailController');

router.get('/requests/free', verifyToken, requestController.getFreeRequests);

router.get('/requests/my-offers', verifyToken, requestController.getMyOfferedRequests);

router.patch('/requests/:id/status', verifyToken, requestController.updateRequestStatus);

router.post('/mails', verifyToken, mailController.sendOffer);
const userController = require('../controller/userController');
router.get('/me', verifyToken, userController.getMyProfile);
router.put('/profile/update', verifyToken, userController.updateMyProfile);
router.put('/profile/change-password', verifyToken, userController.changePassword);

module.exports = router;
