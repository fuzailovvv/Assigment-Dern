
const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');

router.post('/register', authController.register);

router.post('/login', authController.login);

module.exports = router;


const {verifyToken, isUser, isAdmin, isUsta} = require('../middlewares/authMiddleware');

router.get('/me', verifyToken, (req, res) => {
    res.json({msg: 'Welcome, authenticated user!', user: req.user});
});

router.get('/admin-panel', verifyToken, isAdmin, (req, res) => {
    res.json({msg: 'Adminga xush kelibsiz'});
});

router.get('/usta-panel', verifyToken, isUsta, (req, res) => {
    res.json({msg: 'Usta paneliga hush kelibsiz'});
});

router.get('/user-profile', verifyToken, isUser, (req, res) => {
    res.json({msg: 'User profil sahifasi'});
});

router.get('/role', verifyToken, authController.getRole);

// router.post('/forgot-password', authController.forgotPassword);
// router.post('/verify-code', authController.verifyCode);
// router.post('/reset-password', authController.resetPassword);



module.exports = router;
