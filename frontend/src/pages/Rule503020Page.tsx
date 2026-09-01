import React, { useEffect, useState } from 'react';
import {
  PieChart,
  CheckCircle2,
  AlertTriangle,
  Info,
  SlidersHorizontal,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Tag,
  ShieldCheck,
  TrendingUp,
  Plus,
  HelpCircle,
  ChevronUp,
  Zap,
  BookOpen,
} from 'lucide-react';
import {
  rule503020Service,
  Rule503020Summary,
  transactionService,
  investmentService,
} from '../services/api';
import { toast } from 'sonner';

export default function Rule503020Page() {
  const [summary, setSummary] = useState<Rule503020Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRatiosModal, setShowRatiosModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddBucket, setQuickAddBucket] = useState<'need' | 'want' | 'savings'>('need');

  // Interactive What-If Income Simulator State
  const [simulatedIncome, setSimulatedIncome] = useState<number>(50000);
  const [showGuide, setShowGuide] = useState(false);

  // Quick Add Form States
  const [quickTitle, setQuickTitle] = useState('');
  const [quickAmount, setQuickAmount] = useState<number | ''>('');
  const [quickCategory, setQuickCategory] = useState('');

  // Custom ratio form states
  const [needsRatio, setNeedsRatio] = useState(50);
  const [wantsRatio, setWantsRatio] = useState(30);
  const [savingsRatio, setSavingsRatio] = useState(20);

  // Custom mapping form states
  const [customCat, setCustomCat] = useState('');
  const [customBucket, setCustomBucket] = useState<'need' | 'want' | 'savings'>('want');

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await rule503020Service.getSummary();
      setSummary(res.data);
      if (res.data.income > 0) {
        setSimulatedIncome(res.data.income);
      }
      setNeedsRatio(res.data.customRatios.needsRatio);
      setWantsRatio(res.data.customRatios.wantsRatio);
      setSavingsRatio(res.data.customRatios.savingsRatio);
    } catch (error: any) {
      toast.error('Failed to load budget summary: ' + (error.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleUpdateRatios = async (e: React.FormEvent) => {
    e.preventDefault();
    if (needsRatio + wantsRatio + savingsRatio !== 100) {
      toast.error('Sum of ratios must equal 100%');
      return;
    }
    try {
      await rule503020Service.updateRatios(needsRatio, wantsRatio, savingsRatio);
      toast.success('Budget ratios updated!');
      setShowRatiosModal(false);
      fetchSummary();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update ratios');
    }
  };

  const handleAddCategoryMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCat.trim()) {
      toast.error('Category name is required');
      return;
    }
    try {
      await rule503020Service.updateCategoryMapping(customCat.trim(), customBucket);
      toast.success(`Category '${customCat}' assigned to ${customBucket.toUpperCase()}`);
      setCustomCat('');
      setShowCategoryModal(false);
      fetchSummary();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update mapping');
    }
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle || !quickAmount) {
      toast.error('Please enter title and amount');
      return;
    }

    try {
      if (quickAddBucket === 'savings') {
        // Log as an Investment Asset / SIP
        await investmentService.create({
          name: quickTitle,
          type: 'mutual_fund',
          amountInvested: Number(quickAmount),
          currentValue: Number(quickAmount),
          sipAmount: Number(quickAmount),
          frequency: 'monthly',
        });
        toast.success('Investment / SIP recorded into 20% Wealth Bucket!');
      } else {
        // Log as an Expense
        const categoryName = quickCategory || (quickAddBucket === 'need' ? 'Groceries' : 'Dining Out');
        await transactionService.create({
          type: 'expense',
          amount: Number(quickAmount),
          category: categoryName,
          description: quickTitle,
          date: new Date().toISOString().split('T')[0],
        });
        // Ensure category mapping is updated if customized
        await rule503020Service.updateCategoryMapping(categoryName, quickAddBucket);
        toast.success(`Expense added to ${quickAddBucket.toUpperCase()} bucket!`);
      }

      setShowQuickAddModal(false);
      setQuickTitle('');
      setQuickAmount('');
      setQuickCategory('');
      fetchSummary();
    } catch (error: any) {
      toast.error(error.message || 'Failed to record entry');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const breakdown = summary?.breakdown;
  const score = summary?.utilizationScore || 50;

  // Simulator Calculations
  const simNeedsTarget = (simulatedIncome * needsRatio) / 100;
  const simWantsTarget = (simulatedIncome * wantsRatio) / 100;
  const simSavingsTarget = (simulatedIncome * savingsRatio) / 100;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <PieChart className="w-8 h-8 text-indigo-600" />
            50/30/20 Rule & Money Advisor
          </h1>
          <p className="text-gray-600 dark:text-slate-400 mt-1">
            Master money utilization: 50% Essential Needs, 30% Lifestyle Desires, 20% Wealth & SIPs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-700 dark:text-slate-200 font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition shadow-sm cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            {showGuide ? 'Hide Guide' : 'How It Works'}
          </button>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-700 dark:text-slate-200 font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition shadow-sm cursor-pointer"
          >
            <Tag className="w-4 h-4 text-indigo-600" />
            Customize Categories
          </button>
          <button
            onClick={() => setShowRatiosModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition shadow-md shadow-indigo-100 cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Adjust Ratios
          </button>
        </div>
      </div>

      {/* Educational Guide Accordion (Expandable) */}
      {showGuide && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-indigo-100 dark:border-slate-700 shadow-md space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
              Understanding the 50/30/20 Budgeting Rule
            </h3>
            <button
              onClick={() => setShowGuide(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-blue-50/60 dark:bg-slate-900/60 rounded-xl border border-blue-100 dark:border-slate-700 space-y-2">
              <span className="font-extrabold text-blue-700 dark:text-blue-400 text-sm block">
                50% Needs (Essential)
              </span>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                Non-negotiable living expenses required to survive and maintain basic security.
              </p>
              <ul className="list-disc list-inside text-gray-500 dark:text-slate-400 space-y-1 pt-1">
                <li>Rent & Mortgage</li>
                <li>Groceries & Food Supplies</li>
                <li>Electricity, Water, Gas Bills</li>
                <li>Health Insurance & EMIs</li>
              </ul>
            </div>

            <div className="p-4 bg-amber-50/60 dark:bg-slate-900/60 rounded-xl border border-amber-100 dark:border-slate-700 space-y-2">
              <span className="font-extrabold text-amber-700 dark:text-amber-400 text-sm block">
                30% Wants (Lifestyle)
              </span>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                Discretionary choices that improve life quality but are optional.
              </p>
              <ul className="list-disc list-inside text-gray-500 dark:text-slate-400 space-y-1 pt-1">
                <li>Dining Out & Swiggy/Zomato</li>
                <li>Shopping & Gadgets</li>
                <li>Movies, Gaming & OTT Subscriptions</li>
                <li>Travel & Vacations</li>
              </ul>
            </div>

            <div className="p-4 bg-emerald-50/60 dark:bg-slate-900/60 rounded-xl border border-emerald-100 dark:border-slate-700 space-y-2">
              <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm block">
                20% Savings & Wealth
              </span>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                Investments that build long-term financial freedom and security.
              </p>
              <ul className="list-disc list-inside text-gray-500 dark:text-slate-400 space-y-1 pt-1">
                <li>Monthly SIPs & Mutual Funds</li>
                <li>Stock Market Investments</li>
                <li>Emergency Reserve Fund</li>
                <li>Fixed Deposits & PPF</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Money Utilization Score Card */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden space-y-4">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/30 rounded-full text-indigo-200 text-xs font-semibold backdrop-blur-md border border-indigo-400/20">
                <Sparkles className="w-3.5 h-3.5" /> Financial Health Radar
              </div>
              {summary?.healthLabel && (
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-bold backdrop-blur-md">
                  {summary.healthLabel}
                </span>
              )}
            </div>

            <h2 className="text-2xl font-bold">Money Utilization Score</h2>
            <p className="text-indigo-200 text-sm leading-relaxed">
              Measures your budget balance out of 100 based on your Needs ({needsRatio}%), Lifestyle ({wantsRatio}%), and Wealth Investments ({savingsRatio}%).
            </p>
          </div>

          <div className="flex items-center gap-6 bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md w-full md:w-auto justify-between">
            <div className="relative flex items-center justify-center w-24 h-24 rounded-full border-4 border-indigo-400/30 bg-indigo-950/40">
              <div className="text-center">
                <span className="text-3xl font-extrabold text-white">{score}</span>
                <span className="text-xs block text-indigo-300">/ 100</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-indigo-200 font-medium">Recorded Monthly Income</div>
              <div className="text-2xl font-extrabold text-white mt-0.5">
                {formatCurrency(summary?.income || 0)}
              </div>
              <div className="text-xs text-indigo-300 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Real-time tracking
              </div>
            </div>
          </div>
        </div>

        {/* Score Breakdown Transparency Box */}
        <div className="bg-white/10 rounded-xl p-3.5 border border-white/10 text-xs relative z-10 space-y-1.5">
          <div className="font-bold text-indigo-200 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-indigo-300" /> Score Breakdown & Analysis ({score}/100):
          </div>
          {summary?.scoreDeductions && summary.scoreDeductions.length > 0 ? (
            <div className="space-y-1 pl-5 text-indigo-100">
              {summary.scoreDeductions.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-amber-300 font-bold">-{d.penalty} pts ({d.bucket}):</span>
                  <span>{d.reason}</span>
                </div>
              ))}
              <p className="text-[11px] text-emerald-300 font-semibold pt-1">
                💡 Tip to hit 100/100: Add investments/SIPs to fulfill your 20% savings target!
              </p>
            </div>
          ) : (
            <div className="text-emerald-300 font-semibold pl-5">
              🎉 Perfect 100/100 Score! All budget targets for Needs, Wants, and Wealth Investments are fully satisfied.
            </div>
          )}
        </div>
      </div>

      {/* Interactive What-If Budget Simulator Slider */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Interactive What-If Budget Simulator
            </h2>
          </div>
          <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
            Test how different income levels recalculate your spending limits
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="space-y-3 lg:col-span-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 flex justify-between">
              <span>Simulated Monthly Income:</span>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
                {formatCurrency(simulatedIncome)}
              </span>
            </label>
            <input
              type="range"
              min="10000"
              max="500000"
              step="5000"
              value={simulatedIncome}
              onChange={(e) => setSimulatedIncome(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-gray-400">
              <span>₹10,000</span>
              <span>₹2,50,000</span>
              <span>₹5,00,000</span>
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-blue-50/60 dark:bg-slate-900/60 rounded-xl border border-blue-100 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase block">
                Needs Target ({needsRatio}%)
              </span>
              <span className="text-lg font-extrabold text-gray-900 dark:text-white mt-1 block">
                {formatCurrency(simNeedsTarget)}
              </span>
            </div>

            <div className="p-3 bg-amber-50/60 dark:bg-slate-900/60 rounded-xl border border-amber-100 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase block">
                Wants Target ({wantsRatio}%)
              </span>
              <span className="text-lg font-extrabold text-gray-900 dark:text-white mt-1 block">
                {formatCurrency(simWantsTarget)}
              </span>
            </div>

            <div className="p-3 bg-emerald-50/60 dark:bg-slate-900/60 rounded-xl border border-emerald-100 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase block">
                Savings Target ({savingsRatio}%)
              </span>
              <span className="text-lg font-extrabold text-gray-900 dark:text-white mt-1 block">
                {formatCurrency(simSavingsTarget)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Core Bucket Cards with Quick Add Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Needs Bucket Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-md space-y-4 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Needs (Essential)</h3>
                  <span className="text-xs text-gray-500 dark:text-slate-400">Target: {needsRatio}% of Income</span>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full">
                {breakdown?.needs.percentage}%
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-gray-600 dark:text-slate-300">Spent: {formatCurrency(breakdown?.needs.total || 0)}</span>
                <span className="text-gray-400 dark:text-slate-400">Target: {formatCurrency(breakdown?.needs.target || 0)}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    (breakdown?.needs.percentage || 0) > needsRatio
                      ? 'bg-amber-500'
                      : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(100, (breakdown?.needs.percentage || 0))}%` }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-slate-700">
              <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Category Breakdown:</div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {Object.keys(breakdown?.needs.categories || {}).length === 0 ? (
                  <div className="text-xs text-gray-400 italic">No need expenses logged yet.</div>
                ) : (
                  Object.entries(breakdown?.needs.categories || {}).map(([cat, val]) => (
                    <div key={cat} className="flex justify-between text-xs text-gray-700 dark:text-slate-300">
                      <span>{cat}</span>
                      <span className="font-semibold">{formatCurrency(val)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setQuickAddBucket('need');
              setQuickCategory('Groceries');
              setShowQuickAddModal(true);
            }}
            className="w-full mt-4 flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl text-xs font-bold transition cursor-pointer border border-blue-200/60 dark:border-blue-800/50"
          >
            <Plus className="w-4 h-4" /> Add Need Expense
          </button>
        </div>

        {/* Wants Bucket Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-md space-y-4 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Wants (Lifestyle)</h3>
                  <span className="text-xs text-gray-500 dark:text-slate-400">Target: {wantsRatio}% of Income</span>
                </div>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  (breakdown?.wants.percentage || 0) > wantsRatio
                    ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                }`}
              >
                {breakdown?.wants.percentage}%
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-gray-600 dark:text-slate-300">Spent: {formatCurrency(breakdown?.wants.total || 0)}</span>
                <span className="text-gray-400 dark:text-slate-400">Target: {formatCurrency(breakdown?.wants.target || 0)}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    (breakdown?.wants.percentage || 0) > wantsRatio
                      ? 'bg-red-500'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, (breakdown?.wants.percentage || 0))}%` }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-slate-700">
              <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Category Breakdown:</div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {Object.keys(breakdown?.wants.categories || {}).length === 0 ? (
                  <div className="text-xs text-gray-400 italic">No lifestyle expenses logged.</div>
                ) : (
                  Object.entries(breakdown?.wants.categories || {}).map(([cat, val]) => (
                    <div key={cat} className="flex justify-between text-xs text-gray-700 dark:text-slate-300">
                      <span>{cat}</span>
                      <span className="font-semibold">{formatCurrency(val)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setQuickAddBucket('want');
              setQuickCategory('Dining Out');
              setShowQuickAddModal(true);
            }}
            className="w-full mt-4 flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-xl text-xs font-bold transition cursor-pointer border border-amber-200/60 dark:border-amber-800/50"
          >
            <Plus className="w-4 h-4" /> Add Want Expense
          </button>
        </div>

        {/* Savings Bucket Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-md space-y-4 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Savings & SIPs</h3>
                  <span className="text-xs text-gray-500 dark:text-slate-400">Target: {savingsRatio}% of Income</span>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full">
                {breakdown?.savings.percentage}%
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-gray-600 dark:text-slate-300">Saved: {formatCurrency(breakdown?.savings.total || 0)}</span>
                <span className="text-gray-400 dark:text-slate-400">Target: {formatCurrency(breakdown?.savings.target || 0)}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (breakdown?.savings.percentage || 0))}%` }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-slate-700">
              <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Category & SIP Breakdown:</div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {Object.keys(breakdown?.savings.categories || {}).length === 0 ? (
                  <div className="text-xs text-gray-400 italic">No investments or savings recorded yet.</div>
                ) : (
                  Object.entries(breakdown?.savings.categories || {}).map(([cat, val]) => (
                    <div key={cat} className="flex justify-between text-xs text-gray-700 dark:text-slate-300">
                      <span>{cat}</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(val)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setQuickAddBucket('savings');
              setQuickCategory('Mutual Fund');
              setShowQuickAddModal(true);
            }}
            className="w-full mt-4 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl text-xs font-bold transition cursor-pointer border border-emerald-200/60 dark:border-emerald-800/50"
          >
            <Plus className="w-4 h-4" /> Add SIP / Investment
          </button>
        </div>
      </div>

      {/* Actionable Money Advisor Nudges & Guidance */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Smart Money Advisor & Utilization Nudges
          </h2>
          <button
            onClick={fetchSummary}
            className="text-gray-400 hover:text-indigo-600 transition cursor-pointer"
            title="Refresh Analysis"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary?.nudges && summary.nudges.length > 0 ? (
            summary.nudges.map((nudge, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                  nudge.type === 'danger'
                    ? 'bg-red-50/50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50 text-red-900 dark:text-red-300'
                    : nudge.type === 'warning'
                    ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-300'
                    : nudge.type === 'success'
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-300'
                    : 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50 text-blue-900 dark:text-blue-300'
                }`}
              >
                {nudge.type === 'danger' && <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
                {nudge.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
                {nudge.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
                {nudge.type === 'info' && <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}

                <div>
                  <h4 className="font-bold text-sm">{nudge.title}</h4>
                  <p className="text-xs text-gray-600 dark:text-slate-300 mt-1 leading-relaxed">{nudge.message}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-6 text-gray-500 dark:text-slate-400 text-sm">
              Your budget allocation is currently well-balanced. Keep up the disciplined spending!
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Modal */}
      {showQuickAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-gray-100 dark:border-slate-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              Add Entry to {quickAddBucket.toUpperCase()} Bucket
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Log an entry directly to update your 50/30/20 budget adherence score.
            </p>

            <form onSubmit={handleQuickAddSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">
                  Title / Description
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    quickAddBucket === 'savings'
                      ? 'e.g. Nifty 50 SIP'
                      : quickAddBucket === 'need'
                      ? 'e.g. Electricity Bill'
                      : 'e.g. Weekend Movie'
                  }
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 2000"
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {quickAddBucket !== 'savings' && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rent, Groceries, Dining Out"
                    value={quickCategory}
                    onChange={(e) => setQuickCategory(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-slate-400 text-xs font-medium hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow cursor-pointer"
                >
                  Record Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ratios Adjustment Modal */}
      {showRatiosModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5 border border-gray-100 dark:border-slate-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Custom Budget Ratios</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">Default is 50% Needs, 30% Wants, 20% Savings. Must total 100%.</p>

            <form onSubmit={handleUpdateRatios} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Needs Ratio (%)</label>
                <input
                  type="number"
                  value={needsRatio}
                  onChange={(e) => setNeedsRatio(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Wants Ratio (%)</label>
                <input
                  type="number"
                  value={wantsRatio}
                  onChange={(e) => setWantsRatio(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Savings Ratio (%)</label>
                <input
                  type="number"
                  value={savingsRatio}
                  onChange={(e) => setSavingsRatio(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  min="0"
                  max="100"
                />
              </div>

              <div className="text-right text-xs font-bold text-indigo-600 dark:text-indigo-400">
                Total: {needsRatio + wantsRatio + savingsRatio}%
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRatiosModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-slate-400 text-xs font-medium hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow cursor-pointer"
                >
                  Save Ratios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Mapping Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5 border border-gray-100 dark:border-slate-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Map Expense Category</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">Fix whether a category belongs to Needs, Wants, or Savings.</p>

            <form onSubmit={handleAddCategoryMapping} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. Subscriptions, Gym, Rent, SIP"
                  value={customCat}
                  onChange={(e) => setCustomCat(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Assign to Bucket</label>
                <select
                  value={customBucket}
                  onChange={(e: any) => setCustomBucket(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                >
                  <option value="need">Need (50% Essential)</option>
                  <option value="want">Want (30% Lifestyle)</option>
                  <option value="savings">Savings / Investment (20%)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-slate-400 text-xs font-medium hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow cursor-pointer"
                >
                  Save Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
