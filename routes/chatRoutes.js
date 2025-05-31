const express = require("express")
const router = express.Router()
const chatController = require("../controller/chatController")
const auth = require("../middlewares/authMiddleware") // Tokenni tekshiruvchi middleware



// Xabar yuborish
router.post("/send", auth.verifyToken, chatController.sendMessage)

// Chatdagi xabarlarni olish
router.get("/:requestId", auth.verifyToken, chatController.getChatMessages)


module.exports = router
