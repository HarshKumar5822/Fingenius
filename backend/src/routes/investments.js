import express from 'express';
import Investment from '../models/Investment.js';
import User from '../models/User.js';
import Circle from '../models/Circle.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// Get all investments
router.get('/', async (req, res) => {
  try {
    const { view } = req.query;
    let query = { user: req.user._id };

    if (view === 'circle') {
      const user = await User.findById(req.user._id);
      if (user && user.circle) {
        const circle = await Circle.findById(user.circle);
        const memberIds = circle && circle.members && circle.members.length > 0
          ? circle.members
          : [req.user._id];

        query = {
          $or: [
            { circle: user.circle },
            { user: { $in: memberIds } }
          ]
        };
      } else {
        query = { _id: null };
      }
    }

    const investments = await Investment.find(query).sort({ createdAt: -1 });

    const totalInvested = investments.reduce((acc, curr) => acc + curr.amountInvested, 0);
    const totalCurrentValue = investments.reduce((acc, curr) => acc + curr.currentValue, 0);
    const totalMonthlySip = investments.reduce((acc, curr) => acc + (curr.sipAmount || 0), 0);
    const overallReturns = totalCurrentValue - totalInvested;

    res.json({
      status: 'success',
      data: {
        investments,
        summary: {
          totalInvested,
          totalCurrentValue,
          totalMonthlySip,
          overallReturns,
          growthPercentage: totalInvested > 0 ? ((overallReturns / totalInvested) * 100).toFixed(2) : 0
        }
      }
    });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// Create investment
router.post('/', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const investment = await Investment.create({
      ...req.body,
      user: req.user._id,
      circle: user.circle || null
    });

    res.status(201).json({
      status: 'success',
      data: { investment }
    });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// Update investment
router.put('/:id', async (req, res) => {
  try {
    const investment = await Investment.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true }
    );

    if (!investment) {
      return res.status(404).json({ status: 'error', message: 'Investment record not found' });
    }

    res.json({
      status: 'success',
      data: { investment }
    });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// Delete investment
router.delete('/:id', async (req, res) => {
  try {
    const investment = await Investment.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!investment) {
      return res.status(404).json({ status: 'error', message: 'Investment record not found' });
    }

    res.json({ status: 'success', data: null });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

export default router;
