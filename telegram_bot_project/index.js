require('dotenv').config();
const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');

const bot = new Telegraf(process.env.BOT_TOKEN);

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log("Connected to MongoDB");
}).catch(err => {
    console.error("MongoDB connection error:", err);
});

const userSchema = new mongoose.Schema({
    userId: Number,
    balance: { type: Number, default: 0 },
    energy: { type: Number, default: 100 },
    lastTap: { type: Date, default: null },
    package: { type: Number, default: 0 },
    lastCompound: { type: Date, default: null },
    lastDailyClaim: { type: Date, default: null }
});
const User = mongoose.model('User', userSchema);

function calculateDailyReturn(pkg) {
    return pkg * 0.035;
}

async function ensureUser(userId) {
    let user = await User.findOne({ userId });
    if (!user) {
        user = new User({ userId });
        await user.save();
    }
    return user;
}

bot.start(async (ctx) => {
    const userId = ctx.from.id;
    await ensureUser(userId);
    ctx.reply("🚀 Welcome to Techno Surge!
Use /buy to choose a package.
Then /tap daily to earn USDT.");
});

bot.command('buy', async (ctx) => {
    ctx.reply("💼 Available Packages:
100 USDT
250 USDT
500 USDT
2500 USDT

Use /select [amount] to choose.");
});

bot.command('select', async (ctx) => {
    const userId = ctx.from.id;
    const args = ctx.message.text.split(" ");
    const amount = parseInt(args[1]);

    if (![100, 250, 500, 2500].includes(amount)) {
        return ctx.reply("❌ Invalid package. Choose 100, 250, 500 or 2500.");
    }

    const user = await ensureUser(userId);
    user.package = amount;
    user.balance = 0;
    user.energy = 100;
    user.lastTap = null;
    user.lastCompound = null;
    user.lastDailyClaim = new Date();
    await user.save();

    ctx.reply(`✅ Package of ${amount} USDT activated! Use /tap daily and grow your earnings.`);
});

bot.command('tap', async (ctx) => {
    const userId = ctx.from.id;
    const user = await ensureUser(userId);

    if (!user.package) {
        return ctx.reply("❗ You need to buy a package first. Use /buy.");
    }

    const now = new Date();
    if (user.energy <= 0) {
        return ctx.reply("⚡ You're out of energy! Wait until tomorrow to refill.");
    }

    const timeSinceLastTap = user.lastTap ? (now - new Date(user.lastTap)) / 1000 : null;
    if (timeSinceLastTap && timeSinceLastTap < 60) {
        return ctx.reply("⏱️ You can only tap once per minute. Wait a bit.");
    }

    const earned = calculateDailyReturn(user.package) / 10;
    user.balance += earned;
    user.energy -= 10;
    user.lastTap = now;
    await user.save();

    ctx.reply(`💸 You tapped and earned ${earned.toFixed(2)} USDT!
Energy: ${user.energy}%
Balance: ${user.balance.toFixed(2)} USDT`);
});

bot.command('balance', async (ctx) => {
    const userId = ctx.from.id;
    const user = await ensureUser(userId);
    ctx.reply(`💰 Balance: ${user.balance.toFixed(2)} USDT
⚡ Energy: ${user.energy}%
📦 Package: ${user.package || 'None'}`);
});

bot.command('compound', async (ctx) => {
    const userId = ctx.from.id;
    const user = await ensureUser(userId);

    if (user.balance <= 0) return ctx.reply("❌ Nothing to compound.");

    user.package += user.balance;
    ctx.reply(`📦 Your package increased by ${user.balance.toFixed(2)} USDT! New package: ${user.package.toFixed(2)} USDT`);
    user.balance = 0;
    user.lastCompound = new Date();
    await user.save();
});

bot.command('withdraw', async (ctx) => {
    const userId = ctx.from.id;
    const user = await ensureUser(userId);

    if (user.balance < 10) {
        return ctx.reply("❌ Minimum withdrawal is 10 USDT.");
    }

    const amount = user.balance;
    user.balance = 0;
    await user.save();
    ctx.reply(`✅ Withdrawal request submitted for ${amount.toFixed(2)} USDT.
(Manual processing pending implementation)`);
});

bot.command('daily', async (ctx) => {
    const userId = ctx.from.id;
    const user = await ensureUser(userId);
    const now = new Date();

    const lastClaim = user.lastDailyClaim || new Date(0);
    const isSameDay = now.toDateString() === new Date(lastClaim).toDateString();

    if (isSameDay) {
        return ctx.reply("📆 You already claimed your daily energy today.");
    }

    const bonus = (now.getDay() === 6 || now.getDay() === 0) ? 120 : 100;
    user.energy = bonus;
    user.lastDailyClaim = now;
    await user.save();

    ctx.reply(`⚡ Daily energy refilled to ${bonus}%. ${(bonus > 100) ? "🎉 Weekend bonus!" : ""}`);
});

bot.launch();
console.log("Techno Surge bot running...");
