const Request = require('../model/Request');
const Mail = require('../model/Mail');

// Foydalanuvchi tomonidan yangi so‘rov yuborish
exports.createRequest = async (req, res) => {
    try {
        const { requestType, requestName, description, location } = req.body;

        const newRequest = await Request.create({
            userId: req.user.id,
            requestType,
            requestName,
            description,
            location,
            status: 'pending'
        });

        res.status(201).json(newRequest);
    } catch (err) {
        res.status(500).json({ msg: 'So‘rov yuborishda xatolik' });
    }
};

// Foydalanuvchining barcha so‘rovlari
exports.getUserRequests = async (req, res) => {
    try {
        const requests = await Request.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json(requests);
    } catch (err) {
        res.status(500).json({ msg: 'Foydalanuvchi so‘rovlari olinmadi' });
    }
};

// Usta uchun hali hech kim offer bermagan so‘rovlar
exports.getFreeRequests = async (req, res) => {
    try {
        const allMails = await Mail.find();
        const offeredRequestIds = allMails.map(mail => mail.requestId.toString());

        const requests = await Request.find({
            _id: { $nin: offeredRequestIds },
            status: 'pending'
        }).populate('userId', 'fullname email');

        res.status(200).json(requests);
    } catch (err) {
        res.status(500).json({ msg: 'Bo‘sh so‘rovlar olinmadi' });
    }
};

// Ustaning barcha o‘zi offer bergan so‘rovlari
exports.getMyOfferedRequests = async (req, res) => {
    const ustaId = req.user.id;

    try {
        const mails = await Mail.find({ ustaId }).populate({
            path: 'requestId',
            populate: { path: 'userId', select: 'fullname email' }
        }).sort({ createdAt: -1 });

        const myRequests = mails
            .filter(mail => mail.requestId)
            .map(mail => ({
                request: mail.requestId,
                offer: {
                    _id: mail._id,
                    price: mail.price,
                    message: mail.message,
                    status: mail.status,
                    createdAt: mail.createdAt
                }
            }));

        res.json(myRequests);
    } catch (err) {
        res.status(500).json({ msg: 'Ustaning offer bergan so‘rovlari olinmadi' });
    }
};

exports.updateRequestStatus = async (req, res) => {
    const requestId = req.params.id;
    const { status } = req.body; // expected: 'in_progress' or 'completed'

    try {
        const request = await Request.findById(requestId);
        if (!request) {
            return res.status(404).json({ msg: "So‘rov topilmadi" });
        }
        if (!['confirmed', 'in_progress'].includes(request.status)) {
            return res.status(403).json({ msg: "So‘rov hozirgi holatida yangilanishi mumkin emas" });
        }

        // Faqat foydalanuvchi tomonidan tasdiqlangan offer egasi ustasi o'zgartira oladi
        const mail = await Mail.findOne({ requestId, ustaId: req.user.id });
        if (!mail) {
            return res.status(403).json({ msg: "Bu ish sizga tegishli emas" });
        }

        request.status = status;
        await request.save();

        res.status(200).json({ msg: "Holat muvaffaqiyatli yangilandi", request });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'So‘rov holatini yangilashda xatolik yuz berdi' });
    }
};
