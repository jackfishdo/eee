const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  username: { type: String },
  balance: { type: Number, default: 50 },
  package: { type: Number, default: 0 },
  tapsToday: { type: Number, default: 0 },
  bonusPercent: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', userSchema);
