import express from 'express';
import Circle from '../models/Circle.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// Helper function to generate 6-character uppercase code
const generateCircleCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'FAM-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Create a new Circle
router.post('/create', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ status: 'error', message: 'Circle name is required' });
    }

    // Check if user already in a circle
    const currentUser = await User.findById(req.user._id);
    if (currentUser.circle) {
      return res.status(400).json({ status: 'error', message: 'You are already part of a Circle. Leave your current circle first.' });
    }

    let code = generateCircleCode();
    let existing = await Circle.findOne({ code });
    while (existing) {
      code = generateCircleCode();
      existing = await Circle.findOne({ code });
    }

    const circle = await Circle.create({
      name,
      code,
      admin: req.user._id,
      members: [req.user._id]
    });

    currentUser.circle = circle._id;
    await currentUser.save();

    res.status(201).json({
      status: 'success',
      data: { circle }
    });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// Join a Circle via Code
router.post('/join', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ status: 'error', message: 'Circle code is required' });
    }

    const formattedCode = code.trim().toUpperCase();
    const circle = await Circle.findOne({ code: formattedCode });
    if (!circle) {
      return res.status(404).json({ status: 'error', message: 'Invalid Circle Code. Please check and try again.' });
    }

    const currentUser = await User.findById(req.user._id);
    if (currentUser.circle) {
      return res.status(400).json({ status: 'error', message: 'You are already in a circle.' });
    }

    if (!circle.members.includes(req.user._id)) {
      circle.members.push(req.user._id);
      await circle.save();
    }

    currentUser.circle = circle._id;
    await currentUser.save();

    res.json({
      status: 'success',
      message: `Successfully joined ${circle.name}!`,
      data: { circle }
    });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// Get user's circle details and member insights
router.get('/my-circle', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.circle) {
      return res.json({
        status: 'success',
        data: { circle: null }
      });
    }

    const circle = await Circle.findById(user.circle)
      .populate('admin', 'name email')
      .populate('members', 'name email settings');

    if (!circle) {
      user.circle = null;
      await user.save();
      return res.json({ status: 'success', data: { circle: null } });
    }

    // Get combined family income & expenses for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const memberIds = circle.members.map(m => m._id);

    const transactions = await Transaction.find({
      user: { $in: memberIds },
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    let totalIncome = 0;
    let totalExpenses = 0;
    let needsTotal = 0;
    let wantsTotal = 0;
    let savingsTotal = 0;

    const memberBreakdown = {};
    circle.members.forEach(m => {
      memberBreakdown[m._id.toString()] = {
        name: m.name,
        email: m.email,
        income: 0,
        expense: 0
      };
    });

    transactions.forEach(t => {
      const mId = t.user.toString();
      if (t.type === 'income') {
        totalIncome += t.amount;
        if (memberBreakdown[mId]) memberBreakdown[mId].income += t.amount;
      } else {
        totalExpenses += t.amount;
        if (memberBreakdown[mId]) memberBreakdown[mId].expense += t.amount;

        if (t.bucketCategory === 'need') needsTotal += t.amount;
        else if (t.bucketCategory === 'want') wantsTotal += t.amount;
        else if (t.bucketCategory === 'savings') savingsTotal += t.amount;
      }
    });

    res.json({
      status: 'success',
      data: {
        circle,
        metrics: {
          totalIncome,
          totalExpenses,
          needsTotal,
          wantsTotal,
          savingsTotal,
          memberBreakdown: Object.values(memberBreakdown)
        }
      }
    });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// Leave Circle
router.post('/leave', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.circle) {
      return res.status(400).json({ status: 'error', message: 'You are not in any circle.' });
    }

    const circle = await Circle.findById(user.circle);
    if (circle) {
      circle.members = circle.members.filter(m => m.toString() !== req.user._id.toString());
      if (circle.members.length === 0) {
        await Circle.findByIdAndDelete(circle._id);
      } else {
        if (circle.admin.toString() === req.user._id.toString()) {
          circle.admin = circle.members[0]; // Assign new admin
        }
        await circle.save();
      }
    }

    user.circle = null;
    await user.save();

    res.json({ status: 'success', message: 'Successfully left the Family Circle.' });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

export default router;
