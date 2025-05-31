const Mail = require('../model/Mail');
const Request = require('../model/Request');
const User = require('../model/User');
exports.sendOffer = async (req, res) => {
    const { requestId, price, message } = req.body;
    const ustaId = req.user.id;

    try {
        const request = await Request.findById(requestId);
        if (!request) return res.status(404).json({ msg: 'So‘rov topilmadi' });

        if (request.status !== 'pending') {
            return res.status(400).json({ msg: 'Bu so‘rovga hozircha taklif yuborib bo‘lmaydi' });
        }

        const alreadySent = await Mail.findOne({ requestId, ustaId });
        if (alreadySent) return res.status(400).json({ msg: 'Siz bu so‘rovga allaqachon taklif yuborgansiz' });

        const mail = new Mail({
            requestId,
            userId: request.userId,
            ustaId,
            price,
            message
        });

        await mail.save();

        // 🟡 Usta birinchi offer yuborganda — request holati "waiting" bo‘ladi
        request.status = 'waiting';
        await request.save();

        const usta = await User.findById(ustaId).select('fullname');

        res.status(201).json({
            msg: 'Taklif yuborildi',
            mail: {
                _id: mail._id,
                requestId: mail.requestId,
                price: mail.price,
                message: mail.message,
                createdAt: mail.createdAt,
                usta: {
                    _id: usta._id,
                    fullname: usta.fullname
                }
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Taklif yuborishda xatolik yuz berdi' });
    }
};

exports.confirmOffer = async (req, res) => {
    const { mailId } = req.params;
    const userId = req.user.id;

    try {
        const mail = await Mail.findById(mailId);
        if (!mail || mail.userId.toString() !== userId)
            return res.status(403).json({ msg: 'Ruxsat yo‘q' });

        const request = await Request.findById(mail.requestId);
        if (!request) return res.status(404).json({ msg: 'So‘rov topilmadi' });

        if (request.status !== 'waiting') {
            return res.status(400).json({ msg: 'So‘rov allaqachon tasdiqlangan yoki bekor qilingan' });
        }

        request.status = 'confirmed';
        request.price = mail.price;
        request.ustaId = mail.ustaId;
        await request.save();

        res.json({ msg: 'Taklif tasdiqlandi, ish boshlanishi mumkin' });
    } catch (err) {
        res.status(500).json({ msg: 'Tasdiqlashda xatolik yuz berdi' });
    }
};

exports.rejectOffer = async (req, res) => {
    const { mailId } = req.params;
    const userId = req.user.id;

    try {
        const mail = await Mail.findById(mailId);
        if (!mail || mail.userId.toString() !== userId)
            return res.status(403).json({ msg: 'Ruxsat yo‘q' });

        await mail.deleteOne();

        // Agar bu taklif rad etilgan bo‘lsa, request holati o‘zgarmaydi (hali boshqa ustalar taklif yuborishi mumkin)
        res.json({ msg: 'Taklif rad etildi' });
    } catch (err) {
        res.status(500).json({ msg: 'Rad etishda xatolik yuz berdi' });
    }
};


exports.getMyMails = async (req, res) => {
    const userId = req.user.id;

    try {
        const mails = await Mail.find({ userId })
            .populate('requestId', 'requestName requestType status location')
            .populate('ustaId', 'fullname phone location experience')
            .sort({ createdAt: -1 });

        res.json({
            msg: 'Yuborilgan takliflar',
            count: mails.length,
            data: mails.map(mail => ({
                _id: mail._id,
                price: mail.price,
                message: mail.message,
                createdAt: mail.createdAt,
                request: mail.requestId,
                usta: mail.ustaId
            }))
        });
    } catch (err) {
        res.status(500).json({ msg: 'Takliflarni olishda xatolik' });
    }
};
