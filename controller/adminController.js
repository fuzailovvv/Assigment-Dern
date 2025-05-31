const User = require("../model/User")
const Request = require("../model/Request")
const Mail = require("../model/Mail")
const Feedback = require("../model/Feedback")

// Barcha foydalanuvchilar ro'yxatini olish (parolsiz)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}, "-password").sort({ createdAt: -1 })

        // Har bir foydalanuvchi uchun so'rovlar sonini hisoblash
        const usersWithStats = await Promise.all(
            users.map(async (user) => {
                const requestCount = await Request.countDocuments({ userId: user._id })
                const activeRequestCount = await Request.countDocuments({
                    userId: user._id,
                    status: { $in: ['pending', 'confirmed', 'inprogress'] }
                })

                return {
                    ...user.toObject(),
                    requestCount,
                    activeRequestCount,
                    canMakeUsta: requestCount === 0 && user.role === 'user'
                }
            })
        )

        res.json(usersWithStats)
    } catch (err) {
        console.error("Get all users error:", err)
        res.status(500).json({ msg: "Foydalanuvchilar ro'yxatini olishda xatolik yuz berdi" })
    }
}

// Foydalanuvchining rolini "usta" ga o'zgartirish
exports.makeUsta = async (req, res) => {
    const { userId } = req.params

    try {
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ msg: "Foydalanuvchi topilmadi" })
        }

        // Check if user is already usta or admin
        if (user.role === "usta") {
            return res.status(400).json({ msg: "Foydalanuvchi allaqachon usta" })
        }

        if (user.role === "admin") {
            return res.status(400).json({ msg: "Admin rolini o'zgartirib bo'lmaydi" })
        }

        // Foydalanuvchining faol so'rovlarini tekshirish
        const activeRequests = await Request.find({
            userId: user._id,
            status: { $in: ['pending', 'confirmed', 'inprogress'] }
        })

        if (activeRequests.length > 0) {
            return res.status(400).json({
                msg: "Foydalanuvchini usta qilish mumkin emas",
                reason: "Foydalanuvchining faol so'rovlari mavjud",
                details: {
                    activeRequestsCount: activeRequests.length,
                    activeRequests: activeRequests.map(req => ({
                        id: req._id,
                        name: req.requestName,
                        status: req.status,
                        createdAt: req.createdAt
                    }))
                }
            })
        }

        // Barcha so'rovlarni tekshirish (agar birorta ham so'rov bo'lsa)
        const totalRequests = await Request.countDocuments({ userId: user._id })

        if (totalRequests > 0) {
            return res.status(400).json({
                msg: "Foydalanuvchini usta qilish mumkin emas",
                reason: "Foydalanuvchining so'rovlar tarixi mavjud",
                details: {
                    totalRequestsCount: totalRequests,
                    message: "Faqat yangi foydalanuvchilarni usta qilish mumkin"
                }
            })
        }

        // Foydalanuvchining takliflarini tekshirish (agar u boshqa ustalarga taklif yuborgan bo'lsa)
        const sentMails = await Mail.countDocuments({
            requestId: { $in: await Request.find({ userId: user._id }).distinct('_id') }
        })

        if (sentMails > 0) {
            return res.status(400).json({
                msg: "Foydalanuvchini usta qilish mumkin emas",
                reason: "Foydalanuvchi so'rovlariga takliflar kelgan",
                details: {
                    receivedOffersCount: sentMails
                }
            })
        }

        // Agar barcha tekshiruvlar muvaffaqiyatli bo'lsa, usta qilish
        const updatedUser = await User.findByIdAndUpdate(userId, { role: "usta" }, { new: true, select: "-password" })

        res.json({
            msg: 'Foydalanuvchi roli "usta" ga o\'zgartirildi',
            user: updatedUser,
        })
    } catch (err) {
        console.error("Make usta error:", err)
        res.status(500).json({ msg: "Rolni o'zgartirishda xatolik yuz berdi" })
    }
}

// Foydalanuvchini va unga tegishli barcha ma'lumotlarni o'chirish
exports.deleteUser = async (req, res) => {
    const { userId } = req.params

    try {
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ msg: "Foydalanuvchi topilmadi" })
        }

        // Prevent deleting admin users
        if (user.role === "admin") {
            return res.status(400).json({ msg: "Admin foydalanuvchisini o'chirib bo'lmaydi" })
        }

        // Start transaction-like operations
        try {
            // 1. Foydalanuvchining barcha so'rovlari va ularning IDlarini olish
            const userRequests = await Request.find({ userId: user._id })
            const requestIds = userRequests.map((req) => req._id)

            // 2. Ushbu so'rovlarga tegishli barcha takliflarni o'chirish
            if (requestIds.length > 0) {
                await Mail.deleteMany({ requestId: { $in: requestIds } })
            }

            // 3. Ushbu foydalanuvchi tomonidan yuborilgan takliflarni o'chirish (usta bo'lsa)
            await Mail.deleteMany({ ustaId: user._id })

            // 4. Foydalanuvchiga tegishli barcha fikrlarni o'chirish
            await Feedback.deleteMany({ userId: user._id })

            // 5. Usta bo'lsa, u haqidagi barcha fikrlarni ham o'chirish
            if (user.role === "usta") {
                await Feedback.deleteMany({ ustaId: user._id })
            }

            // 6. So'rovlarni o'chirish
            if (requestIds.length > 0) {
                await Request.deleteMany({ userId: user._id })
            }

            // 7. Foydalanuvchining o'zini o'chirish
            await User.findByIdAndDelete(user._id)

            res.json({
                msg: "Foydalanuvchi va unga tegishli barcha ma'lumotlar o'chirildi",
                deletedUser: {
                    id: user._id,
                    fullname: user.fullname,
                    email: user.email,
                    role: user.role,
                },
            })
        } catch (deleteError) {
            console.error("Delete operation error:", deleteError)
            throw deleteError
        }
    } catch (err) {
        console.error("Delete user error:", err)
        res.status(500).json({ msg: "Foydalanuvchini o'chirishda xatolik yuz berdi" })
    }
}

// Tizim statistikasi
exports.getSystemStats = async (req, res) => {
    try {
        // Parallel queries for better performance
        const [userCount, requestCount, mailCount, feedbackCount] = await Promise.all([
            User.countDocuments(),
            Request.countDocuments(),
            Mail.countDocuments(),
            Feedback.countDocuments(),
        ])

        // Additional statistics
        const [ustaCount, adminCount, regularUserCount] = await Promise.all([
            User.countDocuments({ role: "usta" }),
            User.countDocuments({ role: "admin" }),
            User.countDocuments({ role: "user" }),
        ])

        // Request status statistics
        const [pendingRequests, completedRequests] = await Promise.all([
            Request.countDocuments({ status: "pending" }),
            Request.countDocuments({ status: "completed" }),
        ])

        res.json({
            userCount,
            requestCount,
            mailCount,
            feedbackCount,
            userBreakdown: {
                ustaCount,
                adminCount,
                regularUserCount,
            },
            requestStats: {
                pendingRequests,
                completedRequests,
            },
        })
    } catch (err) {
        console.error("Get system stats error:", err)
        res.status(500).json({ msg: "Statistikani olishda xatolik yuz berdi" })
    }
}

// Eng yaxshi baholangan ustalarni ko'rish
exports.getTopRatedUstas = async (req, res) => {
    try {
        const topUstas = await Feedback.aggregate([
            {
                $group: {
                    _id: "$ustaId",
                    avgRating: { $avg: "$rating" },
                    feedbackCount: { $sum: 1 },
                },
            },
            {
                $match: {
                    feedbackCount: { $gte: 1 }, // At least 1 feedback
                },
            },
            {
                $sort: {
                    avgRating: -1,
                    feedbackCount: -1,
                },
            },
            {
                $limit: 10,
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "usta",
                },
            },
            {
                $unwind: "$usta",
            },
            {
                $match: {
                    "usta.role": "usta", // Only include users with usta role
                },
            },
            {
                $project: {
                    _id: 0,
                    ustaId: "$usta._id",
                    fullname: "$usta.fullname",
                    username: "$usta.username",
                    email: "$usta.email",
                    avgRating: { $round: ["$avgRating", 2] },
                    feedbackCount: 1,
                    createdAt: "$usta.createdAt",
                },
            },
        ])

        res.json(topUstas)
    } catch (err) {
        console.error("Get top rated ustas error:", err)
        res.status(500).json({ msg: "Eng yaxshi ustalarni olishda xatolik yuz berdi" })
    }
}

// Foydalanuvchi haqida batafsil ma'lumot olish
exports.getUserDetails = async (req, res) => {
    const userId = req.params.id;

    try {
        // Foydalanuvchini topamiz, parolsiz
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ msg: "Foydalanuvchi topilmadi" });
        }

        // U yuborgan so‘rovlar
        const requests = await Request.find({ userId: user._id }).sort({ createdAt: -1 });

        // Usta bo‘lsa, u yuborgan takliflar (Mail)
        const sentOffers = user.role === 'usta'
            ? await Mail.find({ ustaId: user._id }).populate('requestId', 'requestName status').sort({ createdAt: -1 })
            : [];

        // U yuborgan so‘rovlarga kelgan takliflar
        const requestIds = requests.map(req => req._id);
        const receivedOffers = requestIds.length > 0
            ? await Mail.find({ requestId: { $in: requestIds } })
                .populate('ustaId', 'fullname phone')
                .populate('requestId', 'requestName status')
                .sort({ createdAt: -1 })
            : [];

        // Foydalanuvchining o‘zi yozgan baholar
        const givenFeedbacks = await Feedback.find({ userId: user._id })
            .populate('ustaId', 'fullname phone')
            .sort({ createdAt: -1 });

        // Agar usta bo‘lsa, unga yozilgan baholar
        const receivedFeedbacks = user.role === 'usta'
            ? await Feedback.find({ ustaId: user._id })
                .populate('userId', 'fullname')
                .sort({ createdAt: -1 })
            : [];

        // Statistika obyekti
        const stats = {
            requestCount: requests.length,
            activeRequestCount: requests.filter(r => ['pending', 'confirmed', 'inprogress'].includes(r.status)).length,
            sentOffersCount: sentOffers.length,
            receivedOffersCount: receivedOffers.length,
            givenFeedbacksCount: givenFeedbacks.length,
            receivedFeedbacksCount: receivedFeedbacks.length,
            canMakeUsta: requests.length === 0 && user.role === 'user'
        };

        res.json({
            user,
            stats,
            requests,
            sentOffers,
            receivedOffers,
            givenFeedbacks,
            receivedFeedbacks
        });

    } catch (err) {
        console.error("Get user details error:", err);
        res.status(500).json({ msg: "Foydalanuvchi ma'lumotlarini olishda xatolik yuz berdi" });
    }
};