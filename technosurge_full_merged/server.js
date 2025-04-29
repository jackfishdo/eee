require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Telegraf } = require('telegraf');
const User = require('./models/User');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected (merged server)'))
  .catch(err => console.error('MongoDB error:', err));

// Express route
app.get('/api/balance/:username', async (req, res) => {
  const user = await User.findOne({ username: req.params.username });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ balance: user.balance.toFixed(2), tapsToday: user.tapsToday });
});

// Telegram Bot
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start(async (ctx) => {
  const user = await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    { $setOnInsert: { username: ctx.from.username, balance: 50, package: 0, tapsToday: 0, bonusPercent: 0, totalEarned: 0 } },
    { upsert: true, new: true }
  );
  ctx.reply('🚀 Welcome to Techno Surge! Use /tap to start earning.');
});

bot.command('tap', async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user || user.package <= 0) return ctx.reply('🚫 Please invest first using /invest 100 or /invest 250');
  if (user.tapsToday >= 20) return ctx.reply('⚡ Energy empty for today!');

  user.tapsToday += 1;
  const reward = user.package * 0.035 / 20;
  user.balance += reward;
  await user.save();

  const bar = "⚡".repeat(user.tapsToday) + "⚪".repeat(20 - user.tapsToday);
  ctx.reply(`+${reward.toFixed(2)} USDT! Energy: ${bar}`);
});

bot.command('balance', async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  ctx.reply(`💰 Balance: ${user?.balance.toFixed(2) || 0} USDT`);
});

bot.launch().then(() => console.log("Telegram bot launched"));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server and bot running on port ${PORT}`));
