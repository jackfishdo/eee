
// Simplified EnergyTapper backend server
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const SECRET = process.env.JWT_SECRET || 'secret123';
const MONGO_URI = process.env.MONGO_URI || 'your-mongodb-uri';

mongoose.connect(MONGO_URI).then(() => console.log('MongoDB connected'));

// Schemas
const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  balance: { type: Number, default: 0 },
  daysTapped: { type: Number, default: 0 },
  packageAmount: { type: Number, default: 0 },
  packageProfitPercent: { type: Number, default: 0 },
  packageDaysRequired: { type: Number, default: 0 },
  pendingPayment: { type: Boolean, default: false }
});
const User = mongoose.model('User', UserSchema);

// Routes
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  const user = new User({ username, password });
  await user.save();
  res.json({ message: 'Registered successfully' });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: user._id }, SECRET);
  res.json({ token });
});

app.get('/api/user/balance', async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  const decoded = jwt.verify(token, SECRET);
  const user = await User.findById(decoded.id);
  res.json({ balance: user.balance });
});

app.post('/api/user/tap', async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  const decoded = jwt.verify(token, SECRET);
  const user = await User.findById(decoded.id);
  if (!user.packageAmount) return res.status(400).json({ message: 'No active package' });
  let dailyProfit = (user.packageAmount * user.packageProfitPercent / 100) / user.packageDaysRequired;
  user.balance += dailyProfit;
  user.daysTapped += 1;
  await user.save();
  res.json({ message: 'Tapped energy!' });
});

app.post('/api/user/buy', async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  const decoded = jwt.verify(token, SECRET);
  const { amount } = req.body;
  const user = await User.findById(decoded.id);
  user.pendingPayment = true;
  // Save package details but only activate manually later
  if (amount == 100) { user.packageAmount = 100; user.packageProfitPercent = 23; user.packageDaysRequired = 50; }
  if (amount == 250) { user.packageAmount = 250; user.packageProfitPercent = 26; user.packageDaysRequired = 45; }
  if (amount == 500) { user.packageAmount = 500; user.packageProfitPercent = 29; user.packageDaysRequired = 40; }
  if (amount == 2500) { user.packageAmount = 2500; user.packageProfitPercent = 36; user.packageDaysRequired = 30; }
  await user.save();
  res.json({ message: 'Payment pending, admin will verify.' });
});

app.post('/api/user/withdraw', async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  const decoded = jwt.verify(token, SECRET);
  const user = await User.findById(decoded.id);
  if (user.daysTapped >= user.packageDaysRequired) {
    res.json({ message: 'Withdraw request received!' });
  } else {
    res.status(400).json({ message: `Need ${user.packageDaysRequired} days of tapping to withdraw.` });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
