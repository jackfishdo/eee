
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 50 },
  earningsToday: { type: Number, default: 0 },
  dailyProgress: { type: Number, default: 0 },
  tapsNeeded: { type: Number, default: 20 },
  lastTapDate: { type: String, default: () => new Date().toISOString().split('T')[0] }
});

module.exports = mongoose.model('User', userSchema);
