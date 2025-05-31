const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requestType: { type: String, enum: ['Hardware', 'Software', 'Network'], required: true },
    requestName: { type: String, required: true },
    description: { type: String },
    location: { type: String },
    price: { type: Number, default: null }, // Taklif tasdiqlangandan keyin saqlanadi
    status: {
        type: String,
        enum: ['pending', 'waiting', 'confirmed', 'in_progress', 'completed', 'cancelled'],
        default: 'pending'
    }
}, { timestamps: true });

module.exports = mongoose.model('Request', requestSchema);
