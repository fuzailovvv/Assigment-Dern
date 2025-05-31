const Feedback = require('../model/Feedback');
const Request = require('../model/Request');
const Mail = require('../model/Mail');

exports.leaveFeedback = async (req, res) => {
    const { requestId, rating, comment } = req.body;
    const userId = req.user.id;

    try {
        const request = await Request.findById(requestId);
        if (!request || request.status !== 'completed') {
            return res.status(400).json({ msg: 'Faqat tugagan ish uchun fikr bildirishingiz mumkin' });
        }

        const mail = await Mail.findOne({ requestId, userId });
        if (!mail) {
            return res.status(400).json({ msg: 'Ustaga fikr qoldirib bo‘lmaydi' });
        }

        const existingFeedback = await Feedback.findOne({ requestId });
        if (existingFeedback) {
            return res.status(409).json({ msg: 'Bu ish uchun allaqachon fikr bildirilgan' });
        }

        const feedback = await Feedback.create({
            requestId,
            userId,
            ustaId: mail.ustaId,
            rating,
            comment
        });

        res.status(201).json(feedback);
    } catch (err) {
        res.status(500).json({ msg: 'Fikr yuborishda xatolik' });
    }
};
