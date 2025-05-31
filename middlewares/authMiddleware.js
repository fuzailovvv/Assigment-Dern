const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ msg: 'Token required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, role }
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Invalid or expired token' });
    }
};

exports.isUser = (req, res, next) => {
    if (req.user.role !== 'user') {
        return res.status(403).json({ msg: 'Only users allowed' });
    }
    next();
};

exports.isUsta = (req, res, next) => {
    if (req.user.role !== 'usta') {
        return res.status(403).json({ msg: 'Only ustas allowed' });
    }
    next();
};

exports.isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Only admins allowed' });
    }
    next();
};
