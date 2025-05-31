const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI); // oddiy qilib yozamiz
        console.log('MongoDB Atlas ulandi');
    } catch (error) {
        console.error('MongoDB ulanishda xatolik:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
