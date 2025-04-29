
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;

if (!JWT_SECRET || !MONGO_URI) {
  console.error('Missing env variables.');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB error:', err);
    process.exit(1);
  });

const User = require('./user');

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const existing = await User.findOne({ username: username.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Username taken.' });
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({
      username: username.toLowerCase(),
      password: hashed,
      balance: 50,
      earningsToday: 0,
      dailyProgress: 0,
      tapsNeeded: 20,
      lastTapDate: new Date().toISOString().split('T')[0]
    });
    await user.save();
    res.status(201).json({ message: 'Registered.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username: username.toLowerCase() });
  if (!user) return res.status(400).json({ message: 'Invalid credentials.' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });

  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token });
});

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Missing token' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.id);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

app.get('/api/user/status', authMiddleware, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  if (req.user.lastTapDate !== today) {
    req.user.earningsToday = 0;
    req.user.dailyProgress = 0;
    req.user.lastTapDate = today;
    req.user.save();
  }
  res.json({
    balance: req.user.balance,
    earningsToday: req.user.earningsToday,
    dailyProgress: req.user.dailyProgress,
    tapsNeeded: req.user.tapsNeeded
  });
});

app.post('/api/user/update', authMiddleware, async (req, res) => {
  const { balance, earningsToday, dailyProgress, tapsNeeded } = req.body;
  req.user.balance = balance;
  req.user.earningsToday = earningsToday;
  req.user.dailyProgress = dailyProgress;
  req.user.tapsNeeded = tapsNeeded;
  await req.user.save();
  res.json({ message: 'Progress updated.' });
});

app.get('/', (req, res) => {
  res.send('TechnoSurge backend running');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
