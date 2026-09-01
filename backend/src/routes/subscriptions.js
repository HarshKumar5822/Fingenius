import express from 'express';
import Subscription from '../models/Subscription.js';
import CreditCard from '../models/CreditCard.js';
import Alert from '../models/Alert.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// Helper to trigger automated 3-day credit card due date alerts
const checkCreditCardDueAlerts = async (userId, cards) => {
  try {
    const today = new Date();
    const currentDay = today.getDate();

    for (const card of cards) {
      if (card.currentBalance <= 0) continue;

      let daysUntilDue = card.dueDate - currentDay;
      if (daysUntilDue < 0) {
        // Due date next month
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        daysUntilDue += daysInMonth;
      }

      if (daysUntilDue <= 3) {
        const title = `🚨 Credit Card Bill Due: ${card.cardName} (**** ${card.last4})`;
        const message = `${card.bankName} ${card.cardName} bill payment of ₹${card.currentBalance.toLocaleString()} is due in ${daysUntilDue === 0 ? 'TODAY' : daysUntilDue + ' day(s)'}. Pay immediately to prevent 3.5%/month finance charge penalties!`;

        const existingAlert = await Alert.findOne({
          user: userId,
          title,
          status: 'unread',
        });

        if (!existingAlert) {
          await Alert.create({
            user: userId,
            type: 'bill',
            title,
            message,
            priority: 'high',
            actionRequired: true,
            actionUrl: '/dashboard/subscriptions',
          });
        }
      }
    }
  } catch (err) {
    console.error('Error running credit card due alert check:', err);
  }
};

// GET all subscriptions & monthly outflow summary
router.get('/', async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ user: req.user._id }).sort({ nextBillingDate: 1 });
    const cards = await CreditCard.find({ user: req.user._id });

    // Trigger automated 3-day credit card payment check
    await checkCreditCardDueAlerts(req.user._id, cards);

    const totalMonthlyOutflow = subscriptions
      .filter((s) => s.status === 'active')
      .reduce((acc, s) => {
        const amt = s.amount || 0;
        return acc + (s.billingCycle === 'yearly' ? amt / 12 : amt);
      }, 0);

    const totalYearlyOutflow = totalMonthlyOutflow * 12;

    res.json({
      status: 'success',
      data: {
        subscriptions,
        totalMonthlyOutflow: Math.round(totalMonthlyOutflow),
        totalYearlyOutflow: Math.round(totalYearlyOutflow),
        activeCount: subscriptions.filter((s) => s.status === 'active').length,
      },
    });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// POST new subscription
router.post('/', async (req, res) => {
  try {
    const { name, billingCycle, amount, category, nextBillingDate, notes } = req.body;
    const subscription = await Subscription.create({
      user: req.user._id,
      name,
      billingCycle: billingCycle || 'monthly',
      amount,
      category: category || 'OTT/Entertainment',
      nextBillingDate: nextBillingDate ? new Date(nextBillingDate) : new Date(),
      notes,
    });

    res.status(201).json({
      status: 'success',
      data: { subscription },
    });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// PATCH toggle status (active, paused, cancelled)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, autoRenew } = req.body;
    const subscription = await Subscription.findOne({ _id: req.params.id, user: req.user._id });
    if (!subscription) {
      return res.status(404).json({ status: 'error', message: 'Subscription not found' });
    }

    if (status) subscription.status = status;
    if (autoRenew !== undefined) subscription.autoRenew = autoRenew;
    await subscription.save();

    res.json({
      status: 'success',
      data: { subscription },
    });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// DELETE subscription
router.delete('/:id', async (req, res) => {
  try {
    await Subscription.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ status: 'success', data: null });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// --- CREDIT CARDS ENDPOINTS ---

// GET all credit cards
router.get('/cards', async (req, res) => {
  try {
    const cards = await CreditCard.find({ user: req.user._id }).sort({ createdAt: -1 });

    const totalLimit = cards.reduce((acc, c) => acc + (c.creditLimit || 0), 0);
    const totalBalance = cards.reduce((acc, c) => acc + (c.currentBalance || 0), 0);
    const availableCredit = totalLimit - totalBalance;

    res.json({
      status: 'success',
      data: {
        cards,
        totalLimit,
        totalBalance,
        availableCredit,
      },
    });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// POST new credit card
router.post('/cards', async (req, res) => {
  try {
    const { cardName, bankName, last4, creditLimit, currentBalance, statementDate, dueDate, colorGradient } = req.body;

    const card = await CreditCard.create({
      user: req.user._id,
      cardName,
      bankName,
      last4,
      creditLimit: Number(creditLimit),
      currentBalance: Number(currentBalance || 0),
      statementDate: Number(statementDate),
      dueDate: Number(dueDate),
      colorGradient: colorGradient || 'from-slate-800 to-indigo-950',
    });

    res.status(201).json({
      status: 'success',
      data: { card },
    });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// DELETE credit card
router.delete('/cards/:id', async (req, res) => {
  try {
    await CreditCard.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ status: 'success', data: null });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

export default router;
