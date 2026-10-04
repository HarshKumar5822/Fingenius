import express from 'express';
import Investment from '../models/Investment.js';
import User from '../models/User.js';
import Circle from '../models/Circle.js';
import { protect } from '../middleware/auth.js';
import { getLiveMarketTicker, fetchPriceForSymbol } from '../utils/marketDataService.js';

const router = express.Router();
router.use(protect);

// Get live market overview ticker (Indices, Cryptos, Stocks, Gold)
router.get('/live-ticker', async (req, res) => {
  try {
    const tickerData = await getLiveMarketTicker();
    res.json({
      status: 'success',
      data: tickerData
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Sync all user investments with live market prices
router.post('/sync-prices', async (req, res) => {
  try {
    const investments = await Investment.find({ user: req.user._id });
    let updatedCount = 0;

    for (const inv of investments) {
      const symbolToFetch = inv.symbol || inv.name;
      const priceData = await fetchPriceForSymbol(symbolToFetch, inv.type);

      if (priceData && priceData.price) {
        const qty = inv.quantity || 1;
        inv.lastPrice = priceData.price;
        inv.dayChange = priceData.dayChange || 0;
        inv.dayChangePercent = priceData.dayChangePercent || 0;
        inv.lastUpdated = new Date();

        // Update currentValue based on live price & quantity if symbol is available
        if (inv.symbol || inv.type === 'stock' || inv.type === 'crypto') {
          inv.currentValue = Number((priceData.price * qty).toFixed(2));
        }
        await inv.save();
        updatedCount++;
      }
    }

    // Return updated list & summary
    const updatedInvestments = await Investment.find({ user: req.user._id }).sort({ createdAt: -1 });
    const totalInvested = updatedInvestments.reduce((acc, curr) => acc + curr.amountInvested, 0);
    const totalCurrentValue = updatedInvestments.reduce((acc, curr) => acc + curr.currentValue, 0);
    const totalMonthlySip = updatedInvestments.reduce((acc, curr) => acc + (curr.sipAmount || 0), 0);
    const overallReturns = totalCurrentValue - totalInvested;

    res.json({
      status: 'success',
      message: `Successfully synced live prices for ${updatedCount} investments!`,
      data: {
        investments: updatedInvestments,
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
    res.status(500).json({ status: 'error', message: error.message });
  }
});

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
    const body = { ...req.body };

    // If symbol provided, try fetching initial price details
    if (body.symbol) {
      const priceData = await fetchPriceForSymbol(body.symbol, body.type);
      if (priceData && priceData.price) {
        body.lastPrice = priceData.price;
        body.dayChange = priceData.dayChange || 0;
        body.dayChangePercent = priceData.dayChangePercent || 0;
        body.lastUpdated = new Date();
        if (!body.currentValue || body.currentValue === 0) {
          body.currentValue = Number((priceData.price * (body.quantity || 1)).toFixed(2));
        }
      }
    }

    const investment = await Investment.create({
      ...body,
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
