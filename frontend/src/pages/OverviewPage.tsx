import { useState, useEffect, useRef, useCallback } from 'react';
import {
  CreditCard,
  PiggyBank,
  Target,
  TrendingUp,
  X,
  Check,
  ChevronDown,
  Plus,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  FileDown,
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  transactionService,
  goalService,
  investmentService,
  rule503020Service,
  authService,
  Transaction as ApiTransaction,
  Goal as ApiGoal,
  Investment as ApiInvestment,
} from '../services/api';
import { generateFinancialPDFReport } from '../utils/pdfGenerator';
import LiveMarketTicker from '../components/LiveMarketTicker';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale);

// Format number to Indian currency
const formatIndianCurrency = (amount: number): string => {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
};

const CATEGORIES = [
  'Food & Dining',
  'Salary',
  'Transportation',
  'Shopping',
  'Bills & Utilities',
  'Entertainment',
  'Healthcare',
  'Investments',
  'Savings',
  'Other',
];

export default function OverviewPage() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('This Month');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real backend data states
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [goals, setGoals] = useState<ApiGoal[]>([]);
  const [investments, setInvestments] = useState<ApiInvestment[]>([]);

  // Quick Add Transaction Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTx, setNewTx] = useState({
    type: 'expense' as 'expense' | 'income',
    amount: '',
    description: '',
    category: 'Food & Dining',
    date: new Date().toISOString().split('T')[0],
  });

  const timeRangeOptions = ['Today', 'This Month', 'Last Year'];

  // Fetch all real data from backend
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [txRes, goalsRes, invRes] = await Promise.allSettled([
        transactionService.getAll(),
        goalService.getAll(),
        investmentService.getAll(),
      ]);

      if (txRes.status === 'fulfilled') {
        setTransactions(txRes.value.data.transactions || []);
      } else {
        console.error('Error fetching transactions:', txRes.reason);
      }

      if (goalsRes.status === 'fulfilled') {
        setGoals(goalsRes.value.data?.goals || []);
      } else {
        console.error('Error fetching goals:', goalsRes.reason);
      }

      if (invRes.status === 'fulfilled') {
        setInvestments(invRes.value.data?.investments || []);
      } else {
        console.error('Error fetching investments:', invRes.reason);
      }
    } catch (err) {
      console.error('Dashboard data load error:', err);
      setError('Failed to load real-time dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter transactions based on selectedTimeRange
  const isDateInTimeRange = (dateStr: string, range: string) => {
    if (!dateStr) return false;
    const txDate = new Date(dateStr);
    const now = new Date();

    if (range === 'Today') {
      return (
        txDate.getDate() === now.getDate() &&
        txDate.getMonth() === now.getMonth() &&
        txDate.getFullYear() === now.getFullYear()
      );
    } else if (range === 'This Month') {
      return (
        txDate.getMonth() === now.getMonth() &&
        txDate.getFullYear() === now.getFullYear()
      );
    } else if (range === 'Last Year') {
      return txDate.getFullYear() === now.getFullYear() - 1;
    }
    return true;
  };

  const filteredTransactions = transactions.filter((t) =>
    isDateInTimeRange(t.date, selectedTimeRange)
  );

  // Calculated Real-Time Metrics
  const totalIncomeAllTime = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalExpenseAllTime = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalBalance = totalIncomeAllTime - totalExpenseAllTime;

  const periodExpenses = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalInvestmentsValue = investments.reduce(
    (sum, inv) => sum + Number(inv.currentValue || inv.amountInvested || 0),
    0
  );

  const savingsTxAmount = transactions
    .filter((t) => t.type === 'expense' && t.category?.toLowerCase().includes('savings'))
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalSavings = totalInvestmentsValue + savingsTxAmount;

  const validGoals = goals.filter((g) => g.targetAmount > 0);
  const averageGoalProgress =
    validGoals.length > 0
      ? validGoals.reduce(
          (sum, g) => sum + Math.min(100, ((g.currentAmount || 0) / g.targetAmount) * 100),
          0
        ) / validGoals.length
      : 0;

  const stats = [
    {
      title: 'Total Balance',
      value: formatIndianCurrency(totalBalance),
      change: totalBalance >= 0 ? 'Live Balance' : 'In Deficit',
      icon: TrendingUp,
      trend: totalBalance >= 0 ? ('positive' as const) : ('negative' as const),
    },
    {
      title: `${selectedTimeRange} Expenses`,
      value: formatIndianCurrency(periodExpenses),
      change: `${filteredTransactions.filter((t) => t.type === 'expense').length} transaction(s)`,
      icon: CreditCard,
      trend: 'negative' as const,
    },
    {
      title: 'Total Savings & Investments',
      value: formatIndianCurrency(totalSavings),
      change: `${investments.length} Active Portfolio(s)`,
      icon: PiggyBank,
      trend: 'positive' as const,
    },
    {
      title: 'Goals Progress',
      value: `${averageGoalProgress.toFixed(0)}%`,
      change: `${validGoals.length} Active Goal(s)`,
      icon: Target,
      trend: 'positive' as const,
    },
  ];

  // Financial Distribution chart data
  const financialDistribution = {
    Savings: totalSavings,
    Investments: totalInvestmentsValue,
    Expenses: periodExpenses,
  };

  const totalDistributionSum = totalSavings + totalInvestmentsValue + periodExpenses;

  const chartColors = {
    Savings: 'rgba(16, 185, 129, 0.8)',
    Investments: 'rgba(99, 102, 241, 0.8)',
    Expenses: 'rgba(239, 68, 68, 0.8)',
  };

  const pieChartData = {
    labels: Object.keys(financialDistribution),
    datasets: [
      {
        data: Object.values(financialDistribution),
        backgroundColor: Object.keys(financialDistribution).map(
          (cat) => chartColors[cat as keyof typeof chartColors]
        ),
        borderColor: Object.keys(financialDistribution).map((cat) =>
          chartColors[cat as keyof typeof chartColors]?.replace('0.8', '1')
        ),
        borderWidth: 1,
      },
    ],
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          font: { size: 12 },
          padding: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${formatIndianCurrency(value)} (${percentage}%)`;
          },
        },
      },
    },
  };

  // Quick Add Transaction Handler
  const handleQuickAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.amount || Number(newTx.amount) <= 0 || !newTx.description) {
      alert('Please enter a valid description and amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      await transactionService.create({
        type: newTx.type,
        amount: Number(newTx.amount),
        description: newTx.description,
        category: newTx.category,
        date: newTx.date,
      });

      setNewTx({
        type: 'expense',
        amount: '',
        description: '',
        category: 'Food & Dining',
        date: new Date().toISOString().split('T')[0],
      });
      setShowAddModal(false);
      await loadDashboardData();
    } catch (err) {
      console.error('Error adding transaction:', err);
      alert('Failed to add transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.info('Generating PDF Financial Statement...');
      const user = authService.getCurrentUser();

      let needsSpent = 0, needsTarget = 0, wantsSpent = 0, wantsTarget = 0, savingsSpent = 0, savingsTarget = 0, moneyScore = 70, healthLabel = 'Good Budget Balance ✅';
      try {
        const rRes = await rule503020Service.getSummary();
        const rData = rRes.data;
        needsSpent = rData.breakdown.needs.total;
        needsTarget = rData.breakdown.needs.target;
        wantsSpent = rData.breakdown.wants.total;
        wantsTarget = rData.breakdown.wants.target;
        savingsSpent = rData.breakdown.savings.total;
        savingsTarget = rData.breakdown.savings.target;
        moneyScore = rData.utilizationScore;
        if (rData.healthLabel) healthLabel = rData.healthLabel;
      } catch (e) {
        console.error('Error fetching 50/30/20 summary for PDF:', e);
      }

      generateFinancialPDFReport({
        userName: user?.name || 'Valued User',
        userEmail: user?.email || 'user@fingenius.com',
        monthYear: format(new Date(), 'MMMM yyyy'),
        income: totalIncomeAllTime,
        expenses: totalExpenseAllTime,
        balance: totalBalance,
        savingsRate: totalIncomeAllTime > 0 ? Math.round((totalSavings / totalIncomeAllTime) * 100) : 0,
        moneyScore,
        healthLabel,
        needsSpent,
        needsTarget,
        wantsSpent,
        wantsTarget,
        savingsSpent,
        savingsTarget,
        investments: investments.map((inv) => ({
          name: inv.name,
          type: inv.type,
          currentValue: inv.currentValue || inv.amountInvested || 0,
        })),
        goals: goals.map((g) => ({
          title: g.title,
          currentAmount: g.currentAmount || 0,
          targetAmount: g.targetAmount,
        })),
        topExpenses: transactions
          .filter((t) => t.type === 'expense')
          .slice(0, 5)
          .map((t) => ({
            description: t.description,
            category: t.category,
            amount: t.amount,
            date: t.date,
          })),
      });

      toast.success('PDF Statement downloaded successfully!');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Failed to generate PDF statement');
    }
  };

  return (
    <div className="space-y-3 p-1 sm:p-2">
      {/* Live Market Ticker Banner */}
      <LiveMarketTicker />

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">Dashboard Overview</h1>
          <p className="text-[11px] text-gray-500 dark:text-slate-400">
            Real-time financial summary calculated from your transactions & investments
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Export PDF Statement"
          >
            <FileDown className="w-3.5 h-3.5 text-indigo-600" /> Export PDF Statement
          </button>

          <button
            onClick={() => loadDashboardData()}
            disabled={isLoading}
            className="p-1.5 text-gray-500 hover:text-indigo-600 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg shadow hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Quick Add
          </button>

          {/* Time Range Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 rounded-lg shadow hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border border-gray-100 dark:border-slate-700 cursor-pointer"
            >
              {selectedTimeRange}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-100 dark:border-slate-700 py-1 z-50 animate-in fade-in duration-150">
                {timeRangeOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setSelectedTimeRange(option);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      selectedTimeRange === option
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {option}
                    {selectedTimeRange === option && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-3.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <stat.icon className="w-4 h-4 text-gray-500 dark:text-slate-400" />
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  stat.trend === 'positive'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/50'
                }`}
              >
                {stat.change}
              </span>
            </div>
            <h3 className="mt-2 text-xs font-semibold text-gray-500 dark:text-slate-400">{stat.title}</h3>
            <p className="mt-0.5 text-xl font-black text-gray-900 dark:text-white">
              {isLoading ? (
                <span className="inline-block w-24 h-6 bg-gray-200 animate-pulse rounded"></span>
              ) : (
                stat.value
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow-lg flex flex-col">
          <div className="p-6 border-b flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
              <p className="text-xs text-gray-400 mt-0.5">Showing transactions for {selectedTimeRange}</p>
            </div>
            <span className="text-xs text-indigo-600 font-medium">
              {filteredTransactions.length} item(s)
            </span>
          </div>

          <div className="divide-y max-h-[400px] overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-8 text-center text-gray-400 animate-pulse">
                Loading live transactions...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-gray-700 font-medium text-sm">
                    No transactions recorded for {selectedTimeRange.toLowerCase()}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs">
                    Start by recording your income and expenses to track your real-time finances.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg shadow hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add First Transaction
                </button>
              </div>
            ) : (
              filteredTransactions.slice(0, 10).map((transaction) => {
                const isIncome = transaction.type === 'income';
                return (
                  <div
                    key={transaction.id || (transaction as any)._id}
                    className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          isIncome ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {isIncome ? (
                          <ArrowUpRight className="w-5 h-5" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-gray-500">{transaction.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold text-sm ${
                          isIncome ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {isIncome ? '+' : '-'}{formatIndianCurrency(Math.abs(transaction.amount))}
                      </p>
                      <p className="text-xs text-gray-400">
                        {transaction.date ? transaction.date.split('T')[0] : 'N/A'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Financial Distribution Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Financial Distribution</h2>
            <p className="text-xs text-gray-400 mb-4">Breakdown of Savings, Investments & Expenses</p>

            {isLoading ? (
              <div className="h-[280px] flex items-center justify-center text-gray-400 animate-pulse">
                Calculating distribution...
              </div>
            ) : totalDistributionSum === 0 ? (
              <div className="h-[280px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-gray-100 rounded-xl">
                <PiggyBank className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-sm font-semibold text-gray-700">No Financial Distribution Yet</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs">
                  Add transactions, savings, or investments to see your financial ratio chart here.
                </p>
              </div>
            ) : (
              <div className="h-[280px] relative">
                <Pie data={pieChartData} options={pieChartOptions} />
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4">
            {Object.entries(financialDistribution).map(([category, amount]) => (
              <div key={category} className="text-center">
                <p className="text-xs font-medium text-gray-500">{category}</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatIndianCurrency(amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Add New Transaction</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddTransaction} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setNewTx({ ...newTx, type: 'expense' })}
                  className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                    newTx.type === 'expense'
                      ? 'bg-white text-red-600 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Expense (-)
                </button>
                <button
                  type="button"
                  onClick={() => setNewTx({ ...newTx, type: 'income' })}
                  className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                    newTx.type === 'income'
                      ? 'bg-white text-green-600 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Income (+)
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grocery Store / Salary Deposit"
                  value={newTx.description}
                  onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newTx.amount}
                    onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newTx.category}
                    onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newTx.date}
                  onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Add Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}