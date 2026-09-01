import express from 'express';
import Alert from '../models/Alert.js';
import Transaction from '../models/Transaction.js';
import Goal from '../models/Goal.js';
import Investment from '../models/Investment.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Apply protection middleware to all routes
router.use(protect);

// Helper to auto-generate smart financial alerts for a user
async function generateSmartAlerts(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const threshold = user.settings?.budgetThreshold || 80;

    // 1. Calculate Monthly Expenses vs Income
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const monthTransactions = await Transaction.find({
      user: userId,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const effectiveIncome = income > 0 ? income : 50000;
    const spentPercent = Math.round((expenses / effectiveIncome) * 100);

    // If spent > threshold, create/ensure Budget Alert
    if (expenses > 0 && spentPercent >= threshold) {
      const existingAlert = await Alert.findOne({
        user: userId,
        type: 'budget',
        title: { $regex: /Budget Threshold Warning/i }
      });

      if (!existingAlert) {
        await Alert.create({
          user: userId,
          type: 'budget',
          title: `⚠️ Budget Threshold Warning (${spentPercent}%)`,
          message: `Your monthly expenses (₹${expenses.toLocaleString()}) have reached ${spentPercent}% of your monthly income benchmark (₹${effectiveIncome.toLocaleString()}).`,
          priority: 'high',
          actionRequired: true,
          actionUrl: '/dashboard/expenses'
        });
      }
    } else if (expenses > 0 && spentPercent >= 50) {
      const existingAlert = await Alert.findOne({
        user: userId,
        type: 'budget',
        title: { $regex: /Monthly Expense Notice/i }
      });

      if (!existingAlert) {
        await Alert.create({
          user: userId,
          type: 'budget',
          title: `📊 Monthly Expense Notice (${spentPercent}%)`,
          message: `You have spent ₹${expenses.toLocaleString()} (${spentPercent}%) of your benchmark income this month.`,
          priority: 'medium',
          actionRequired: false
        });
      }
    }

    // 2. Scan Financial Goals
    const activeGoals = await Goal.find({ user: userId });
    for (const goal of activeGoals) {
      const pct = Math.round((goal.currentAmount / goal.targetAmount) * 100);
      if (pct >= 100 && goal.status === 'completed') {
        const existingAlert = await Alert.findOne({
          user: userId,
          type: 'goal',
          title: { $regex: new RegExp(`Goal Achieved: ${goal.title}`, 'i') }
        });

        if (!existingAlert) {
          await Alert.create({
            user: userId,
            type: 'goal',
            title: `🎉 Goal Achieved: ${goal.title}!`,
            message: `Congratulations! You reached 100% of your target ₹${goal.targetAmount.toLocaleString()} for ${goal.title}.`,
            priority: 'high',
            actionRequired: false,
            actionUrl: '/dashboard/goals'
          });
        }
      } else if (pct >= 20) {
        const existingAlert = await Alert.findOne({
          user: userId,
          type: 'goal',
          title: { $regex: new RegExp(`Goal Milestone: ${goal.title}`, 'i') }
        });

        if (!existingAlert) {
          await Alert.create({
            user: userId,
            type: 'goal',
            title: `🎯 Goal Milestone: ${goal.title}`,
            message: `Your goal "${goal.title}" is currently ${pct}% funded (₹${goal.currentAmount.toLocaleString()} / ₹${goal.targetAmount.toLocaleString()}).`,
            priority: 'medium',
            actionRequired: false,
            actionUrl: '/dashboard/goals'
          });
        }
      }
    }

    // 3. Scan Investments
    const investments = await Investment.find({ user: userId });
    if (investments.length > 0) {
      const existingAlert = await Alert.findOne({
        user: userId,
        type: 'system',
        title: { $regex: /Wealth Accumulation Active/i }
      });

      if (!existingAlert) {
        const totalVal = investments.reduce((sum, i) => sum + i.currentValue, 0);
        await Alert.create({
          user: userId,
          type: 'system',
          title: '📈 Wealth Accumulation Active',
          message: `Your investment portfolio is tracking ${investments.length} asset(s) with total valuation of ₹${totalVal.toLocaleString()}.`,
          priority: 'low',
          actionRequired: false,
          actionUrl: '/dashboard/investments'
        });
      }
    }
  } catch (err) {
    console.error('Error generating smart alerts:', err);
  }
}

// Get all alerts for a user
router.get('/', async (req, res) => {
  try {
    await generateSmartAlerts(req.user._id);

    const { status, priority, type } = req.query;
    let query = { user: req.user._id };

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (type) {
      query.type = type;
    }

    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 50);

    res.json({
      status: 'success',
      data: {
        alerts
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Create a new alert
router.post('/', async (req, res) => {
  try {
    const alert = await Alert.create({
      ...req.body,
      user: req.user._id
    });

    res.status(201).json({
      status: 'success',
      data: {
        alert
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get alert by ID
router.get('/:id', async (req, res) => {
  try {
    const alert = await Alert.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!alert) {
      return res.status(404).json({
        status: 'error',
        message: 'Alert not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        alert
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Update alert status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const alert = await Alert.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id
      },
      { status },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        status: 'error',
        message: 'Alert not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        alert
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Delete alert
router.delete('/:id', async (req, res) => {
  try {
    const alert = await Alert.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!alert) {
      return res.status(404).json({
        status: 'error',
        message: 'Alert not found'
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

// Mark all alerts as read
router.patch('/status/read-all', async (req, res) => {
  try {
    await Alert.updateMany(
      {
        user: req.user._id,
        status: 'unread'
      },
      {
        status: 'read'
      }
    );

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

// Update Alert Settings Endpoint
router.put('/settings', async (req, res) => {
  try {
    const { budgetThreshold, budgetAlertsEnabled, goalAlertsEnabled, billAlertsEnabled } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    user.settings = {
      ...user.settings,
      budgetThreshold: budgetThreshold !== undefined ? budgetThreshold : 80,
      budgetAlertsEnabled: budgetAlertsEnabled !== undefined ? budgetAlertsEnabled : true,
      goalAlertsEnabled: goalAlertsEnabled !== undefined ? goalAlertsEnabled : true,
      billAlertsEnabled: billAlertsEnabled !== undefined ? billAlertsEnabled : true,
    };

    await user.save();

    res.json({
      status: 'success',
      data: {
        settings: user.settings
      }
    });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// Get unread alerts count
router.get('/count/unread', async (req, res) => {
  try {
    const count = await Alert.countDocuments({
      user: req.user._id,
      status: 'unread'
    });

    res.json({
      status: 'success',
      data: {
        count
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