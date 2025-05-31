const User = require('../model/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    const { fullname, username, email, password } = req.body;

    try {
        const existingUsername = await User.findOne({ username });
        const existingEmail = await User.findOne({ email });

        if (existingUsername) return res.status(400).json({ msg: 'Username already taken' });
        if (existingEmail) return res.status(400).json({ msg: 'Email already registered' });

        const hashed = await bcrypt.hash(password, 10);
        const newUser = new User({ fullname, username, email, password: hashed });
        await newUser.save();

        const token = jwt.sign({ id: newUser._id, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.status(201).json({
            msg: 'Registered and logged in',
            token,
            user: {
                id: newUser._id,
                fullname: newUser.fullname,
                username: newUser.username,
                role: newUser.role
            }
        });
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '31d' });

        res.json({
            msg: 'Login successful',
            token,
            user: {
                id: user._id,
                fullname: user.fullname,
                username: user.username,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({ msg: 'Login error' });
    }
};
exports.getRole = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('role fullname email');
        if (!user) return res.status(404).json({ msg: 'Foydalanuvchi topilmadi' });

        res.json({
            id: user._id,
            role: user.role,
            fullname: user.fullname,
            email: user.email
        });
    } catch (err) {
        res.status(500).json({ msg: 'Foydalanuvchini olishda xatolik yuz berdi' });
    }
};

// 1. Foydalanuvchi email kiritadi => emailga 6 xonali kod yuboriladi
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ msg: 'Email ro‘yxatdan o‘tmagan' });

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 daqiqa

        await PasswordReset.findOneAndUpdate(
            { email },
            { code, expiresAt },
            { upsert: true }
        );

        // Yuborish
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        });

        await transporter.sendMail({
            from: process.env.MAIL_USER,
            to: email,
            subject: 'Parol tiklash kodingiz',
            text: `Sizning tasdiqlash kodingiz: ${code}`
        });

        res.json({ msg: 'Emailga kod yuborildi' });
    } catch (err) {
        console.error('Forgot Password:', err);
        res.status(500).json({ msg: 'Kod yuborishda xatolik' });
    }
};

// 2. Kodni tekshirish
exports.verifyCode = async (req, res) => {
    const { email, code } = req.body;

    try {
        const record = await PasswordReset.findOne({ email });
        if (!record || record.code !== code) {
            return res.status(400).json({ msg: 'Kod noto‘g‘ri' });
        }

        if (record.expiresAt < new Date()) {
            return res.status(400).json({ msg: 'Kod muddati tugagan' });
        }

        res.json({ msg: 'Kod to‘g‘ri. Endi yangi parol o‘rnating' });
    } catch (err) {
        console.error('Verify Code:', err);
        res.status(500).json({ msg: 'Kod tekshiruvida xatolik' });
    }
};

// 3. Parolni yangilash (hashlangan holda)
exports.resetPassword = async (req, res) => {
    const { email, code, newPassword } = req.body;

    try {
        const record = await PasswordReset.findOne({ email });
        if (!record || record.code !== code) {
            return res.status(400).json({ msg: 'Kod noto‘g‘ri' });
        }

        if (record.expiresAt < new Date()) {
            return res.status(400).json({ msg: 'Kod muddati tugagan' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.findOneAndUpdate({ email }, { password: hashedPassword });

        await PasswordReset.deleteOne({ email });

        res.json({ msg: 'Parol muvaffaqiyatli tiklandi' });
    } catch (err) {
        console.error('Reset Password:', err);
        res.status(500).json({ msg: 'Parolni tiklashda xatolik' });
    }
};
