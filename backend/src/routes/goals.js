import express from 'express';
import Goal from '../models/Goal.js';
import User from '../models/User.js';
import Circle from '../models/Circle.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Apply protection middleware to all routes
router.use(protect);

// Get all goals for a user or circle
router.get('/', async (req, res) => {
  try {
    const { status, view } = req.query;
    let query = { user: req.user._id };

    if (view === 'circle') {
      const currentUser = await User.findById(req.user._id);
      if (currentUser && currentUser.circle) {
        const circle = await Circle.findById(currentUser.circle);
        const memberIds = circle && circle.members && circle.members.length > 0
          ? circle.members
          : [req.user._id];

        query = {
          $or: [
            { circle: currentUser.circle },
            { user: { $in: memberIds } }
          ]
        };
      } else {
        // Not in a circle
        query = { _id: null };
      }
    }

    if (status) {
      query.status = status;
    }

    const goals = await Goal.find(query)
      .populate('user', 'name email')
      .sort({ deadline: 1 });

    res.json({
      status: 'success',
      data: {
        goals
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Create a new goal
router.post('/', async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);

    const goal = await Goal.create({
      ...req.body,
      user: req.user._id,
      circle: (currentUser && currentUser.circle) ? currentUser.circle : null
    });

    const populatedGoal = await Goal.findById(goal._id).populate('user', 'name email');

    res.status(201).json({
      status: 'success',
      data: {
        goal: populatedGoal
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get goal by ID
router.get('/:id', async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    let memberIds = [req.user._id];
    if (currentUser && currentUser.circle) {
      const circle = await Circle.findById(currentUser.circle);
      if (circle && circle.members) {
        memberIds = circle.members;
      }
    }

    const goal = await Goal.findOne({
      _id: req.params.id,
      $or: [
        { user: { $in: memberIds } },
        { circle: currentUser?.circle || null }
      ]
    }).populate('user', 'name email');

    if (!goal) {
      return res.status(404).json({
        status: 'error',
        message: 'Goal not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        goal
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Update goal
router.put('/:id', async (req, res) => {
  try {
    const goal = await Goal.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id
      },
      req.body,
      { new: true }
    ).populate('user', 'name email');

    if (!goal) {
      return res.status(404).json({
        status: 'error',
        message: 'Goal not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        goal
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Delete goal
router.delete('/:id', async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    let memberIds = [req.user._id];
    if (currentUser && currentUser.circle) {
      const circle = await Circle.findById(currentUser.circle);
      if (circle && circle.members) {
        memberIds = circle.members;
      }
    }

    const goal = await Goal.findOneAndDelete({
      _id: req.params.id,
      $or: [
        { user: req.user._id },
        { user: { $in: memberIds } }
      ]
    });

    if (!goal) {
      return res.status(404).json({
        status: 'error',
        message: 'Goal not found'
      });
    }

    res.json({
      status: 'success',
      data: null
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Add contribution to goal
router.post('/:id/contributions', async (req, res) => {
  try {
    const { amount } = req.body;
    const currentUser = await User.findById(req.user._id);
    let memberIds = [req.user._id];
    if (currentUser && currentUser.circle) {
      const circle = await Circle.findById(currentUser.circle);
      if (circle && circle.members) {
        memberIds = circle.members;
      }
    }

    const goal = await Goal.findOne({
      _id: req.params.id,
      $or: [
        { user: { $in: memberIds } },
        { circle: currentUser?.circle || null }
      ]
    });

    if (!goal) {
      return res.status(404).json({
        status: 'error',
        message: 'Goal not found'
      });
    }

    // Add contribution
    goal.contributions.push({
      amount,
      date: new Date()
    });

    // Update current amount
    goal.currentAmount += amount;

    // Check if goal is completed
    if (goal.currentAmount >= goal.targetAmount) {
      goal.status = 'completed';
    }

    await goal.save();

    const updatedGoal = await Goal.findById(goal._id).populate('user', 'name email');

    res.json({
      status: 'success',
      data: {
        goal: updatedGoal
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get goal progress summary
router.get('/:id/progress', async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!goal) {
      return res.status(404).json({
        status: 'error',
        message: 'Goal not found'
      });
    }

    const progress = {
      percentageComplete: (goal.currentAmount / goal.targetAmount) * 100,
      remainingAmount: goal.targetAmount - goal.currentAmount,
      daysRemaining: Math.ceil((goal.deadline - new Date()) / (1000 * 60 * 60 * 24)),
      contributions: goal.contributions.length,
      totalContributed: goal.currentAmount,
      isOnTrack: goal.currentAmount >= (goal.targetAmount * (1 - (goal.daysRemaining / goal.totalDays)))
    };

    res.json({
      status: 'success',
      data: {
        progress
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

export default router;