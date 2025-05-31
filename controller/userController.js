const User = require("../model/User");
const Request = require('../model/Request'); // ✅ model faylining nomi va joylashuvi to‘g‘ri bo‘lishi kerak
const bcrypt = require('bcryptjs');

exports.getMyProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'Foydalanuvchi topilmadi' });
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ msg: 'Profilni olishda xatolik yuz berdi' });
    }
};
exports.updateMyProfile = async (req, res) => {
    const userId = req.user.id;
    const { fullname, username, email } = req.body;

    try {

        const updateData = {
            fullname: fullname?.trim(),
            username: username?.trim(),
            email: email?.trim()
        };


        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true, select: '-password' }
        );

        if (!updatedUser) {
            return res.status(404).json({ msg: 'Foydalanuvchi topilmadi' });
        }

        res.json({
            msg: 'Profil muvaffaqiyatli yangilandi',
            user: updatedUser
        });
    } catch (err) {
        console.error('Profile update error:', err);

        // Handle validation errors
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ msg: errors.join(', ') });
        }

        // Handle duplicate key errors
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[0];
            const fieldNames = {
                username: 'Foydalanuvchi nomi',
                email: 'Email',
                phone: 'Telefon raqami'
            };
            return res.status(400).json({
                msg: `${fieldNames[field] || field} allaqachon mavjud`
            });
        }

        res.status(500).json({ msg: 'Profilni yangilashda xatolik yuz berdi' });
    }
};

// Parolni yangilash
exports.changePassword = async (req, res) => {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ msg: 'Foydalanuvchi topilmadi' });

        // Eski parolni tekshirish
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Joriy parol noto‘g‘ri' });
        }

        // Yangi parolni hash qilish
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ msg: 'Parol muvaffaqiyatli yangilandi' });
    } catch (err) {
        res.status(500).json({ msg: 'Parolni yangilashda xatolik yuz berdi' });
    }
};
// Foydalanuvchi o‘zining so‘rovini bekor qiladi
exports.cancelRequest = async (req, res) => {
    const userId = req.user.id;
    const requestId = req.params.id;

    try {
        const request = await Request.findById(requestId);

        if (!request) {
            return res.status(404).json({ msg: 'So‘rov topilmadi' });
        }

        if (request.userId.toString() !== userId) {
            return res.status(403).json({ msg: 'Siz bu so‘rovni bekor qila olmaysiz' });
        }

        if (request.status === 'confirmed') {
            return res.status(400).json({ msg: 'Tasdiqlangan so‘rovni bekor qilib bo‘lmaydi' });
        }

        request.status = 'cancelled'; // bekor qilingan holat
        await request.save();

        res.json({ msg: 'So‘rov muvaffaqiyatli bekor qilindi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'So‘rovni bekor qilishda xatolik yuz berdi' });
    }
};
