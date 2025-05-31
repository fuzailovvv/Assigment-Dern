// models/Mail.js
const mongoose = require('mongoose');
const mailSchema = new mongoose.Schema({
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ustaId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    price: Number,
    message: String
}, { timestamps: true });

module.exports = mongoose.model('Mail', mailSchema);
