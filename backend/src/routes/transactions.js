import express from 'express';
import Transaction from '../models/Transaction.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Apply protection middleware to all routes
router.use(protect);

// Get all transactions for a user
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, category, type } = req.query;
    let query = { user: req.user._id };

    // Add date range filter if provided
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Add category filter if provided
    if (category) {
      query.category = category;
    }

    // Add type filter if provided
    if (type) {
      query.type = type;
    }

    const transactions = await Transaction.find(query)
      .sort({ date: -1 })
      .limit(parseInt(req.query.limit) || 50);

    res.json({
      status: 'success',
      data: {
        transactions
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Create a new transaction
router.post('/', async (req, res) => {
  try {
    const transaction = await Transaction.create({
      ...req.body,
      user: req.user._id
    });

    res.status(201).json({
      status: 'success',
      data: {
        transaction
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get transaction by ID
router.get('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({
        status: 'error',
        message: 'Transaction not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        transaction
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Update transaction
router.put('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id
      },
      req.body,
      { new: true }
    );

    if (!transaction) {
      return res.status(404).json({
        status: 'error',
        message: 'Transaction not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        transaction
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Delete transaction
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({
        status: 'error',
        message: 'Transaction not found'
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

// Get transaction summary
router.get('/summary/overview', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateQuery = {};

    if (startDate && endDate) {
      dateQuery = {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const summary = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          ...dateQuery
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Calculate totals
    const income = summary.find(item => item._id === 'income')?.total || 0;
    const expenses = summary.find(item => item._id === 'expense')?.total || 0;
    const balance = income - expenses;

    res.json({
      status: 'success',
      data: {
        income,
        expenses,
        balance,
        summary
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