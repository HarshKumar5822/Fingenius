import express from 'express';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import Investment from '../models/Investment.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// Default category bucket mapping fallback helper
const getDefaultBucket = (category, type) => {
  if (type === 'income') return 'income';
  const cat = category.toLowerCase();

  if (['rent', 'housing', 'groceries', 'utility', 'utilities', 'bills', 'electricity', 'health', 'medical', 'insurance', 'emi', 'education', 'fees', 'transport', 'fuel', 'water'].some(k => cat.includes(k))) {
    return 'need';
  }
  if (['investment', 'savings', 'sip', 'mutual fund', 'stocks', 'fd', 'gold', 'emergency fund'].some(k => cat.includes(k))) {
    return 'savings';
  }
  return 'want'; // default for dining, shopping, travel, entertainment, etc.
};

// GET 50/30/20 Breakdown & Smart Advisor Insights
router.get('/summary', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const customRatios = user.customRatios || { needsRatio: 50, wantsRatio: 30, savingsRatio: 20 };
    const userMappings = new Map((user.categoryMappings || []).map(m => [m.category.toLowerCase(), m.bucket]));

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Fetch transactions for the current month
    const transactions = await Transaction.find({
      user: req.user._id,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    // Fetch user's active Investment portfolio & SIPs
    const investments = await Investment.find({ user: req.user._id });

    const categoryBreakdown = { need: {}, want: {}, savings: {} };
    let savingsTotal = 0;

    // Process all Investment assets into Savings & Wealth Bucket (20%)
    investments.forEach(inv => {
      const val = (inv.sipAmount && inv.sipAmount > 0)
        ? inv.sipAmount
        : (inv.currentValue || inv.amountInvested || 0);

      if (val > 0) {
        savingsTotal += val;
        const typeLabel = inv.type ? inv.type.replace('_', ' ').toUpperCase() : 'MUTUAL FUND';
        const label = `${inv.name} (${typeLabel})`;
        categoryBreakdown.savings[label] = (categoryBreakdown.savings[label] || 0) + val;
      }
    });

    let totalIncome = 0;
    let needsTotal = 0;
    let wantsTotal = 0;

    transactions.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else {
        const catLower = t.category.toLowerCase();
        let bucket = userMappings.get(catLower) || t.bucketCategory;
        if (!bucket || bucket === 'unclassified') {
          bucket = getDefaultBucket(t.category, t.type);
        }

        if (bucket === 'need') {
          needsTotal += t.amount;
          categoryBreakdown.need[t.category] = (categoryBreakdown.need[t.category] || 0) + t.amount;
        } else if (bucket === 'want') {
          wantsTotal += t.amount;
          categoryBreakdown.want[t.category] = (categoryBreakdown.want[t.category] || 0) + t.amount;
        } else if (bucket === 'savings') {
          savingsTotal += t.amount;
          categoryBreakdown.savings[t.category] = (categoryBreakdown.savings[t.category] || 0) + t.amount;
        }
      }
    });

    // Targets based on income (or fallback default if income is 0)
    const effectiveIncome = totalIncome > 0 ? totalIncome : 1;
    const targetNeeds = (effectiveIncome * customRatios.needsRatio) / 100;
    const targetWants = (effectiveIncome * customRatios.wantsRatio) / 100;
    const targetSavings = (effectiveIncome * customRatios.savingsRatio) / 100;

    const actualNeedsPct = totalIncome > 0 ? Math.round((needsTotal / totalIncome) * 100) : 0;
    const actualWantsPct = totalIncome > 0 ? Math.round((wantsTotal / totalIncome) * 100) : 0;
    const actualSavingsPct = totalIncome > 0 ? Math.round((savingsTotal / totalIncome) * 100) : 0;

    // Calculate Financial Money Utilization Score (0 to 100) & Transparent Deductions
    let score = 100;
    const scoreDeductions = [];

    if (actualNeedsPct > customRatios.needsRatio) {
      const diff = actualNeedsPct - customRatios.needsRatio;
      const penalty = Math.min(25, Math.round(diff * 1.5));
      score -= penalty;
      scoreDeductions.push({
        bucket: 'Needs',
        penalty,
        reason: `Needs expenses (${actualNeedsPct}%) exceeded ${customRatios.needsRatio}% limit`
      });
    }

    if (actualWantsPct > customRatios.wantsRatio) {
      const diff = actualWantsPct - customRatios.wantsRatio;
      const penalty = Math.min(25, Math.round(diff * 1.5));
      score -= penalty;
      scoreDeductions.push({
        bucket: 'Wants',
        penalty,
        reason: `Wants spending (${actualWantsPct}%) exceeded ${customRatios.wantsRatio}% limit`
      });
    }

    if (actualSavingsPct < customRatios.savingsRatio) {
      const diff = customRatios.savingsRatio - actualSavingsPct;
      const penalty = Math.min(30, Math.round(diff * 1.5));
      score -= penalty;
      const shortfall = targetSavings - savingsTotal;
      scoreDeductions.push({
        bucket: 'Savings',
        penalty,
        reason: `Savings & Investments (${actualSavingsPct}%) below ${customRatios.savingsRatio}% target (Shortfall: ₹${shortfall > 0 ? shortfall.toLocaleString() : 0})`
      });
    }

    const utilizationScore = Math.max(10, Math.round(score));

    // Health Label determination
    let healthLabel = 'Fair Budget Balance';
    let healthColor = 'text-blue-400';
    if (utilizationScore >= 85) {
      healthLabel = 'Excellent Financial Health 🌟';
      healthColor = 'text-emerald-400';
    } else if (utilizationScore >= 70) {
      healthLabel = 'Good Budget Balance ✅';
      healthColor = 'text-blue-400';
    } else if (utilizationScore >= 50) {
      healthLabel = 'Needs Attention ⚠️';
      healthColor = 'text-amber-400';
    } else {
      healthLabel = 'High Overbudget Risk 🚨';
      healthColor = 'text-red-400';
    }

    // Generate Actionable Money Advisor Insights (Pure Professional English)
    const nudges = [];

    if (totalIncome === 0) {
      nudges.push({
        type: 'warning',
        title: 'Record Monthly Income',
        message: 'You have not recorded your monthly income for this month yet. Please add your income to enable accurate 50/30/20 budget allocation analysis.'
      });
    }

    if (actualWantsPct > customRatios.wantsRatio && totalIncome > 0) {
      const overspendAmount = wantsTotal - targetWants;
      nudges.push({
        type: 'danger',
        title: 'Wants Overbudget Warning',
        message: `You have spent ${actualWantsPct}% of your monthly income on Lifestyle Wants (Target: ${customRatios.wantsRatio}%). You are overbudget by ₹${overspendAmount.toLocaleString()}. Consider reducing non-essential spending and redirecting capital into savings.`
      });
    }

    if (actualSavingsPct < customRatios.savingsRatio && totalIncome > 0) {
      const shortfall = targetSavings - savingsTotal;
      nudges.push({
        type: 'warning',
        title: 'Increase Wealth Savings Target',
        message: `Your current savings and investments stand at ${actualSavingsPct}% of your monthly income (Target: ${customRatios.savingsRatio}%). Consider allocating an additional ₹${shortfall > 0 ? shortfall.toLocaleString() : 0} into SIPs or an emergency fund to achieve optimal financial health.`
      });
    }

    if (actualSavingsPct >= customRatios.savingsRatio && totalIncome > 0) {
      nudges.push({
        type: 'success',
        title: 'Optimal Money Utilization',
        message: `Outstanding performance! You have allocated ${actualSavingsPct}% of your income into savings and wealth investments, successfully meeting your ${customRatios.savingsRatio}% wealth-building target.`
      });
    }

    if (actualNeedsPct > customRatios.needsRatio && totalIncome > 0) {
      nudges.push({
        type: 'info',
        title: 'High Essential Needs Alert',
        message: `Essential living expenses have reached ${actualNeedsPct}% of your income. Review fixed utility bills, insurance premiums, and recurring EMIs to optimize mandatory expenses.`
      });
    }

    res.json({
      status: 'success',
      data: {
        customRatios,
        income: totalIncome,
        breakdown: {
          needs: { total: needsTotal, target: targetNeeds, percentage: actualNeedsPct, categories: categoryBreakdown.need },
          wants: { total: wantsTotal, target: targetWants, percentage: actualWantsPct, categories: categoryBreakdown.want },
          savings: { total: savingsTotal, target: targetSavings, percentage: actualSavingsPct, categories: categoryBreakdown.savings }
        },
        utilizationScore,
        scoreDeductions,
        healthLabel,
        healthColor,
        categoryMappings: user.categoryMappings || [],
        nudges
      }
    });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// Update category mapping (Assign category to need, want, or savings)
router.patch('/category-mappings', async (req, res) => {
  try {
    const { category, bucket } = req.body;
    if (!category || !['need', 'want', 'savings'].includes(bucket)) {
      return res.status(400).json({ status: 'error', message: 'Valid category and bucket (need, want, savings) are required.' });
    }

    const user = await User.findById(req.user._id);
    const existingIndex = user.categoryMappings.findIndex(m => m.category.toLowerCase() === category.toLowerCase());

    if (existingIndex > -1) {
      user.categoryMappings[existingIndex].bucket = bucket;
    } else {
      user.categoryMappings.push({ category, bucket });
    }

    await user.save();

    res.json({
      status: 'success',
      message: `Category '${category}' mapped to ${bucket.toUpperCase()}`,
      data: { categoryMappings: user.categoryMappings }
    });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// Update target custom ratios
router.patch('/ratios', async (req, res) => {
  try {
    const { needsRatio, wantsRatio, savingsRatio } = req.body;
    if (needsRatio + wantsRatio + savingsRatio !== 100) {
      return res.status(400).json({ status: 'error', message: 'Total of ratios must equal 100%' });
    }

    const user = await User.findById(req.user._id);
    user.customRatios = { needsRatio, wantsRatio, savingsRatio };
    await user.save();

    res.json({
      status: 'success',
      message: 'Budget ratios updated successfully!',
      data: { customRatios: user.customRatios }
    });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

export default router;
