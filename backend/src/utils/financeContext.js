import Transaction from '../models/Transaction.js';
import Goal from '../models/Goal.js';
import Investment from '../models/Investment.js';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';

const getDefaultBucket = (category, type) => {
  if (type === 'income') return 'income';
  const cat = category.toLowerCase();
  if (['rent', 'housing', 'groceries', 'utility', 'utilities', 'bills', 'electricity', 'health', 'medical', 'insurance', 'emi', 'education', 'fees', 'transport', 'fuel', 'water'].some(k => cat.includes(k))) {
    return 'need';
  }
  if (['investment', 'savings', 'sip', 'mutual fund', 'stocks', 'fd', 'gold', 'emergency fund'].some(k => cat.includes(k))) {
    return 'savings';
  }
  return 'want';
};

/**
 * Builds a compact, numbers-first snapshot of a user's live financial state
 * (this month's income/spend, 50/30/20 split, goals, investments, subscriptions)
 * so the AI assistant can reason over real data instead of guessing.
 */
export const buildFinanceSnapshot = async (userId) => {
  const user = await User.findById(userId);
  const customRatios = user?.customRatios || { needsRatio: 50, wantsRatio: 30, savingsRatio: 20 };
  const userMappings = new Map((user?.categoryMappings || []).map(m => [m.category.toLowerCase(), m.bucket]));
  const currency = user?.settings?.currency || 'INR';

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const startOfLast3Months = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const [monthTxns, last3MonthsTxns, goals, investments, subscriptions] = await Promise.all([
    Transaction.find({ user: userId, date: { $gte: startOfMonth, $lte: endOfMonth } }),
    Transaction.find({ user: userId, date: { $gte: startOfLast3Months, $lte: endOfMonth } }),
    Goal.find({ user: userId, status: 'active' }).sort({ deadline: 1 }).limit(10),
    Investment.find({ user: userId }),
    Subscription.find({ user: userId, status: 'active' })
  ]);

  let totalIncome = 0;
  let needsTotal = 0;
  let wantsTotal = 0;
  let savingsTotal = 0;
  const wantsCategories = {};

  monthTxns.forEach(t => {
    if (t.type === 'income') {
      totalIncome += t.amount;
      return;
    }
    const catLower = t.category.toLowerCase();
    let bucket = userMappings.get(catLower) || t.bucketCategory;
    if (!bucket || bucket === 'unclassified') bucket = getDefaultBucket(t.category, t.type);

    if (bucket === 'need') needsTotal += t.amount;
    else if (bucket === 'savings') savingsTotal += t.amount;
    else {
      wantsTotal += t.amount;
      wantsCategories[t.category] = (wantsCategories[t.category] || 0) + t.amount;
    }
  });

  investments.forEach(inv => {
    if (inv.sipAmount > 0) savingsTotal += inv.sipAmount;
  });

  // Average monthly income/expense over the last 3 months, for savings-roadmap style questions
  let last3MonthsIncome = 0;
  let last3MonthsExpense = 0;
  last3MonthsTxns.forEach(t => {
    if (t.type === 'income') last3MonthsIncome += t.amount;
    else last3MonthsExpense += t.amount;
  });
  const avgMonthlyIncome = Math.round(last3MonthsIncome / 3);
  const avgMonthlyExpense = Math.round(last3MonthsExpense / 3);
  const avgMonthlySavings = avgMonthlyIncome - avgMonthlyExpense;

  const balanceAvailable = totalIncome - needsTotal - wantsTotal - savingsTotal;

  const topWants = Object.entries(wantsCategories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, amount]) => `${category}: ${amount}`);

  const monthlySubscriptionOutflow = subscriptions.reduce((sum, s) => {
    return sum + (s.billingCycle === 'yearly' ? s.amount / 12 : s.amount);
  }, 0);

  const totalInvestmentValue = investments.reduce((sum, i) => sum + (i.currentValue || 0), 0);
  const totalMonthlySip = investments.reduce((sum, i) => sum + (i.sipAmount || 0), 0);

  return {
    currency,
    customRatios,
    thisMonth: {
      income: totalIncome,
      needsSpent: needsTotal,
      wantsSpent: wantsTotal,
      savingsContributed: savingsTotal,
      remainingBalance: balanceAvailable,
      needsPct: totalIncome > 0 ? Math.round((needsTotal / totalIncome) * 100) : 0,
      wantsPct: totalIncome > 0 ? Math.round((wantsTotal / totalIncome) * 100) : 0,
      savingsPct: totalIncome > 0 ? Math.round((savingsTotal / totalIncome) * 100) : 0,
      topWantsCategories: topWants
    },
    trailing3MonthAverage: {
      avgMonthlyIncome,
      avgMonthlyExpense,
      avgMonthlySavings
    },
    goals: goals.map(g => ({
      title: g.title,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      deadline: g.deadline?.toISOString().slice(0, 10),
      category: g.category
    })),
    investments: {
      totalCurrentValue: totalInvestmentValue,
      totalMonthlySip
    },
    activeSubscriptions: subscriptions.map(s => ({ name: s.name, amount: s.amount, billingCycle: s.billingCycle })),
    monthlySubscriptionOutflow: Math.round(monthlySubscriptionOutflow)
  };
};

export const formatSnapshotForPrompt = (snapshot) => {
  const s = snapshot;
  const lines = [];
  lines.push(`Currency: ${s.currency}`);
  lines.push(`Target budget ratios — Needs ${s.customRatios.needsRatio}% / Wants ${s.customRatios.wantsRatio}% / Savings ${s.customRatios.savingsRatio}%`);
  lines.push('');
  lines.push('THIS MONTH (so far):');
  lines.push(`- Income: ${s.thisMonth.income}`);
  lines.push(`- Needs spent: ${s.thisMonth.needsSpent} (${s.thisMonth.needsPct}% of income)`);
  lines.push(`- Wants spent: ${s.thisMonth.wantsSpent} (${s.thisMonth.wantsPct}% of income)`);
  lines.push(`- Savings/investments contributed: ${s.thisMonth.savingsContributed} (${s.thisMonth.savingsPct}% of income)`);
  lines.push(`- Remaining/unallocated balance: ${s.thisMonth.remainingBalance}`);
  if (s.thisMonth.topWantsCategories.length) {
    lines.push(`- Top "wants" categories: ${s.thisMonth.topWantsCategories.join(', ')}`);
  }
  lines.push('');
  lines.push('TRAILING 3-MONTH AVERAGE:');
  lines.push(`- Avg monthly income: ${s.trailing3MonthAverage.avgMonthlyIncome}`);
  lines.push(`- Avg monthly expense: ${s.trailing3MonthAverage.avgMonthlyExpense}`);
  lines.push(`- Avg monthly net savings: ${s.trailing3MonthAverage.avgMonthlySavings}`);
  lines.push('');
  if (s.goals.length) {
    lines.push('ACTIVE GOALS:');
    s.goals.forEach(g => {
      lines.push(`- ${g.title} (${g.category}): ${g.currentAmount}/${g.targetAmount} saved, deadline ${g.deadline}`);
    });
    lines.push('');
  }
  lines.push('INVESTMENTS:');
  lines.push(`- Total current value: ${s.investments.totalCurrentValue}`);
  lines.push(`- Total monthly SIP commitments: ${s.investments.totalMonthlySip}`);
  lines.push('');
  if (s.activeSubscriptions.length) {
    lines.push(`ACTIVE SUBSCRIPTIONS (monthly outflow ≈ ${s.monthlySubscriptionOutflow}):`);
    s.activeSubscriptions.forEach(sub => {
      lines.push(`- ${sub.name}: ${sub.amount} (${sub.billingCycle})`);
    });
  }
  return lines.join('\n');
};
