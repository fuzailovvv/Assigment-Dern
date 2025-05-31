// controllers/chatController.js
const Message = require('../model/Messages');
const Request = require('../model/Request');
const Mail = require('../model/Mail');

// Yangi xabar yuborish
exports.sendMessage = async (req, res) => {
    const { requestId, text } = req.body;
    const senderId = req.user.id;

    try {
        const request = await Request.findById(requestId).populate("userId");
        if (!request) return res.status(404).json({ msg: "So'rov topilmadi" });

        const offer = await Mail.findOne({ requestId }).populate("ustaId");
        if (!offer) {
            return res.status(404).json({ msg: "Taklif topilmadi", error: "NO_OFFER" });
        }

        const isUser = senderId === request.userId._id.toString();
        const isUsta = senderId === offer.ustaId._id.toString();

        if (!isUser && !isUsta) return res.status(403).json({ msg: "Siz bu so'rovda ishtirokchi emassiz" });

        if (request.status !== "in_progress") {
            return res.status(403).json({ msg: "Chat faqat in_progress holatida ochiladi", canWrite: false });
        }

        const receiverId = isUser ? offer.ustaId._id.toString() : request.userId._id.toString();
        const receiverInfo = isUser ? offer.ustaId : request.userId;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ msg: "Xabar matni bo'sh bo'lishi mumkin emas" });
        }

        const message = await Message.create({ requestId, senderId, receiverId, text: text.trim(), read: false });

        const populatedMessage = await Message.findById(message._id)
            .populate("senderId", "fullname username")
            .populate("receiverId", "fullname username");

        res.status(201).json({
            msg: "Xabar yuborildi",
            message: populatedMessage,
            chatInfo: {
                canWrite: true,
                receiver: {
                    id: receiverInfo._id,
                    fullname: receiverInfo.fullname,
                    username: receiverInfo.username,
                }
            }
        });
    } catch (err) {
        console.error("sendMessage error:", err);
        res.status(500).json({ msg: "Xabar yuborishda xatolik yuz berdi", error: err.message });
    }
};

// Chatdagi barcha xabarlarni olish
exports.getChatMessages = async (req, res) => {
    const { requestId } = req.params;
    const userId = req.user.id;

    try {
        const request = await Request.findById(requestId).populate("userId");
        if (!request) return res.status(404).json({ msg: "So'rov topilmadi" });

        const offer = await Mail.findOne({ requestId }).populate("ustaId");
        if (!offer) {
            return res.json({
                messages: [],
                canWrite: false,
                status: "no_offer",
                error: "NO_OFFER",
                msg: "Bu so'rov uchun taklif topilmadi",
                request: {
                    id: request._id,
                    requestName: request.requestName,
                    requestType: request.requestType,
                    status: request.status,
                    user: {
                        id: request.userId._id,
                        fullname: request.userId.fullname,
                        username: request.userId.username,
                    },
                    usta: null,
                },
            });
        }

        const isUser = userId === request.userId._id.toString();
        const isUsta = userId === offer.ustaId._id.toString();

        if (!isUser && !isUsta) return res.status(403).json({ msg: "Chatga kirishga ruxsat yo'q" });

        const messages = await Message.find({ requestId })
            .populate("senderId", "fullname username")
            .populate("receiverId", "fullname username")
            .sort({ createdAt: 1 });

        const messagesWithOwnership = messages.map((message) => ({
            ...message.toObject(),
            isOwnMessage: message.senderId._id.toString() === userId,
        }));

        const canWrite = request.status === "in_progress";

        await Message.updateMany({ requestId, receiverId: userId, read: false }, { read: true });

        res.json({
            messages: messagesWithOwnership,
            canWrite,
            status: request.status,
            request: {
                id: request._id,
                requestName: request.requestName,
                requestType: request.requestType,
                status: request.status,
                user: {
                    id: request.userId._id,
                    fullname: request.userId.fullname,
                    username: request.userId.username,
                },
                usta: {
                    id: offer.ustaId._id,
                    fullname: offer.ustaId.fullname,
                    username: offer.ustaId.username,
                },
            },
        });
    } catch (err) {
        console.error("getChatMessages error:", err);
        res.status(500).json({ msg: "Xabarlarni olishda xatolik yuz berdi", error: err.message });
    }
};
