import { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  PlusCircle,
  Wallet,
  Trash2,
  Calculator,
  ArrowUpRight,
  PieChart,
  RefreshCw,
} from 'lucide-react';
import { investmentService, Investment, InvestmentSummary } from '../services/api';
import LiveMarketTicker from '../components/LiveMarketTicker';
import { toast } from 'sonner';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const PIE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#f43f5e', '#84cc16', '#0ea5e9', '#a855f7',
];

const TYPE_LABELS: Record<string, string> = {
  mutual_fund: 'Mutual Fund',
  stock: 'Stocks',
  fixed_deposit: 'Fixed Deposit',
  gold: 'Gold',
  crypto: 'Crypto',
  ppf: 'PPF',
  real_estate: 'Real Estate',
  other: 'Other',
};

const POPULAR_SYMBOLS = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
  { symbol: 'TCS.NS', name: 'TCS' },
  { symbol: 'INFY.NS', name: 'Infosys' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
  { symbol: 'TATAMOTORS.NS', name: 'Tata Motors' },
  { symbol: 'SBIN.NS', name: 'State Bank of India' },
  { symbol: 'BTC-USD', name: 'Bitcoin' },
  { symbol: 'ETH-USD', name: 'Ethereum' },
  { symbol: 'GOLD', name: 'Gold 24K' },
  { symbol: 'NIFTY50', name: 'Nifty 50 Index' },
];

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [summary, setSummary] = useState<InvestmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingLive, setSyncingLive] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<Investment['type']>('stock');
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [amountInvested, setAmountInvested] = useState<number | ''>('');
  const [currentValue, setCurrentValue] = useState<number | ''>('');
  const [sipAmount, setSipAmount] = useState<number | ''>('');
  const [frequency, setFrequency] = useState<'monthly' | 'one_time'>('monthly');

  // SIP Calculator states
  const [sipCalcMonthly, setSipCalcMonthly] = useState(10000);
  const [sipCalcRate, setSipCalcRate] = useState(12);
  const [sipCalcYears, setSipCalcYears] = useState(10);

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      const res = await investmentService.getAll();
      setInvestments(res.data.investments);
      setSummary(res.data.summary);
    } catch (error: any) {
      toast.error('Failed to load investments: ' + (error.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleSyncLivePrices = async () => {
    try {
      setSyncingLive(true);
      const res = await investmentService.syncLivePrices();
      setInvestments(res.data.investments);
      setSummary(res.data.summary);
      toast.success(res.message || 'Synced portfolio with live market prices!');
    } catch (error: any) {
      toast.error('Price sync failed: ' + (error.message || ''));
    } finally {
      setSyncingLive(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  const allocationChartData = useMemo(() => {
    const totals: Record<string, number> = {};
    investments.forEach((inv) => {
      const label = TYPE_LABELS[inv.type] || inv.type;
      totals[label] = (totals[label] || 0) + (inv.currentValue || 0);
    });
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return null;
    return {
      labels: entries.map(([label]) => label),
      datasets: [
        {
          data: entries.map(([, value]) => value),
          backgroundColor: PIE_COLORS,
          borderWidth: 0,
        },
      ],
    };
  }, [investments]);

  const handleCreateInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || amountInvested === '') {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await investmentService.create({
        name,
        type,
        symbol: symbol ? symbol.toUpperCase() : '',
        quantity: quantity ? Number(quantity) : 1,
        amountInvested: Number(amountInvested),
        currentValue: currentValue !== '' ? Number(currentValue) : Number(amountInvested),
        sipAmount: sipAmount ? Number(sipAmount) : 0,
        frequency,
      });

      toast.success('Investment asset added successfully!');
      setShowAddModal(false);
      setName('');
      setSymbol('');
      setQuantity(1);
      setAmountInvested('');
      setCurrentValue('');
      setSipAmount('');
      fetchInvestments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add investment');
    }
  };

  const handleDeleteInvestment = async (id: string) => {
    if (!window.confirm('Delete this investment record?')) return;
    try {
      await investmentService.delete(id);
      toast.success('Investment deleted.');
      fetchInvestments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete investment');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // SIP Compound Interest Calculation Helper
  const calculateSIP = () => {
    const P = sipCalcMonthly;
    const i = sipCalcRate / 12 / 100;
    const n = sipCalcYears * 12;
    const totalInvested = P * n;
    const futureValue = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    const wealthGained = futureValue - totalInvested;
    return {
      totalInvested: Math.round(totalInvested),
      futureValue: Math.round(futureValue),
      wealthGained: Math.round(wealthGained),
    };
  };

  const sipResult = calculateSIP();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-1 sm:p-2 space-y-3">
      {/* Live Market Banner Ticker */}
      <LiveMarketTicker />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
            Asset & Wealth Portfolio Manager
          </h1>
          <p className="text-[11px] text-gray-600 dark:text-slate-400">
            Track your Mutual Funds, Stocks, Cryptos, FDs, and Gold with real-time live market updates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncLivePrices}
            disabled={syncingLive}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingLive ? 'animate-spin' : ''}`} />
            {syncingLive ? 'Syncing...' : 'Sync Live Prices'}
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Add Asset / SIP
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Total Portfolio Value</div>
          <div className="text-xl font-black text-gray-900 dark:text-white mt-0.5">
            {formatCurrency(summary?.totalCurrentValue || 0)}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5 mt-0.5">
            <ArrowUpRight className="w-3 h-3" /> Returns: {formatCurrency(summary?.overallReturns || 0)} ({summary?.growthPercentage}%)
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Total Principal Invested</div>
          <div className="text-xl font-black text-gray-800 dark:text-slate-200 mt-0.5">
            {formatCurrency(summary?.totalInvested || 0)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-md">
          <div className="text-xs text-gray-500 dark:text-slate-400 font-medium">Monthly SIP Outflow</div>
          <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
            {formatCurrency(summary?.totalMonthlySip || 0)}
          </div>
          <div className="text-xs text-indigo-400 mt-1">Feeds into 20% Budget Rule</div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-md">
          <div className="text-xs text-gray-500 dark:text-slate-400 font-medium">Active Asset Count</div>
          <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
            {investments.length} Assets
          </div>
        </div>
      </div>

      {/* Portfolio Allocation Chart */}
      {allocationChartData && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-md">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-indigo-600" />
            Portfolio Allocation Breakdown
          </h2>
          <div className="max-w-xs mx-auto">
            <Pie
              data={allocationChartData}
              options={{
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.parsed as number)}`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* Assets Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-600" />
            Your Investment Holdings
          </h2>
          <span className="text-xs text-slate-400">Click "Sync Live Prices" to refresh market valuations</span>
        </div>

        {investments.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-slate-400">
            No investments added yet. Click "Add Asset / SIP" to start tracking your wealth growth!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {investments.map((inv) => {
              const returns = inv.currentValue - inv.amountInvested;
              const gainPct =
                inv.amountInvested > 0
                  ? ((returns / inv.amountInvested) * 100).toFixed(1)
                  : '0';

              const hasDayChange = inv.dayChangePercent !== undefined && inv.dayChangePercent !== 0;
              const isDayPositive = (inv.dayChangePercent || 0) >= 0;

              return (
                <div
                  key={inv._id}
                  className="bg-white dark:bg-slate-800/90 rounded-2xl border border-gray-100 dark:border-slate-700/80 shadow-lg hover:shadow-2xl hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all duration-300 transform hover:-translate-y-1 p-5 relative overflow-hidden group flex flex-col justify-between"
                >
                  {/* Top Accent Gradient Bar */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${
                      returns >= 0
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                        : 'bg-gradient-to-r from-red-400 to-rose-500'
                    }`}
                  />

                  <div>
                    {/* Header: Badge & Actions */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-indigo-800/50 flex items-center gap-1">
                          <PieChart className="w-3.5 h-3.5" />
                          {inv.type.replace('_', ' ')}
                        </span>
                        {inv.symbol && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-900 text-slate-300 rounded border border-slate-700">
                            {inv.symbol}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteInvestment(inv._id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Asset"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Asset Name */}
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg tracking-tight mb-3">
                      {inv.name}
                    </h3>

                    {/* Current Value Panel */}
                    <div className="bg-gray-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-gray-100 dark:border-slate-700/50 mb-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                          Current Value
                        </p>
                        {inv.quantity && inv.quantity > 1 ? (
                          <span className="text-[10px] text-slate-400 font-mono">Qty: {inv.quantity}</span>
                        ) : null}
                      </div>

                      <div className="flex items-baseline justify-between mt-0.5">
                        <p className="text-2xl font-black text-gray-900 dark:text-white">
                          {formatCurrency(inv.currentValue)}
                        </p>

                        {hasDayChange && (
                          <span className={`text-xs font-bold flex items-center gap-0.5 ${isDayPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isDayPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {isDayPositive ? '+' : ''}{inv.dayChangePercent}% Today
                          </span>
                        )}
                      </div>

                      <div className="mt-2 pt-2 border-t border-gray-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-gray-500 dark:text-slate-400">Principal Invested:</span>
                        <span className="font-semibold text-gray-800 dark:text-slate-200">
                          {formatCurrency(inv.amountInvested)}
                        </span>
                      </div>
                    </div>

                    {/* Gain / Loss Performance */}
                    <div className="flex items-center justify-between text-xs py-1">
                      <span className="text-gray-500 dark:text-slate-400 font-medium">
                        Overall Gain / Loss:
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                          returns >= 0
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50'
                            : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200/50'
                        }`}
                      >
                        <TrendingUp className={`w-3.5 h-3.5 ${returns < 0 ? 'rotate-180' : ''}`} />
                        {returns >= 0 ? '+' : ''}
                        {formatCurrency(returns)} ({gainPct}%)
                      </span>
                    </div>
                  </div>

                  {/* Monthly SIP Outflow Banner */}
                  {inv.sipAmount ? (
                    <div className="mt-4 pt-2.5 border-t border-gray-100 dark:border-slate-700/60 flex items-center justify-between text-xs bg-indigo-50/50 dark:bg-indigo-950/30 -mx-5 -mb-5 p-3 px-5 rounded-b-2xl">
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                        ⚡ Monthly SIP Outflow:
                      </span>
                      <span className="font-extrabold text-indigo-700 dark:text-indigo-300">
                        {formatCurrency(inv.sipAmount)}/mo
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SIP & Wealth Compound Calculator */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-md space-y-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Calculator className="w-5 h-5 text-indigo-600" />
          SIP Wealth Compound Calculator
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">
                Monthly Investment: {formatCurrency(sipCalcMonthly)}
              </label>
              <input
                type="range"
                min="1000"
                max="100000"
                step="1000"
                value={sipCalcMonthly}
                onChange={(e) => setSipCalcMonthly(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">
                Expected Annual Return (%): {sipCalcRate}%
              </label>
              <input
                type="range"
                min="1"
                max="30"
                step="0.5"
                value={sipCalcRate}
                onChange={(e) => setSipCalcRate(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">
                Investment Duration: {sipCalcYears} Years
              </label>
              <input
                type="range"
                min="1"
                max="40"
                step="1"
                value={sipCalcYears}
                onChange={(e) => setSipCalcYears(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="lg:col-span-2 bg-indigo-50/50 dark:bg-slate-900/60 p-6 rounded-xl border border-indigo-100 dark:border-slate-700 flex flex-col justify-between space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Total Invested Amount</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(sipResult.totalInvested)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Estimated Wealth Gained</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  +{formatCurrency(sipResult.wealthGained)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Total Future Portfolio Value</p>
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                  {formatCurrency(sipResult.futureValue)}
                </p>
              </div>
            </div>

            <div className="text-xs text-gray-500 dark:text-slate-400 border-t border-indigo-100 dark:border-slate-800 pt-3">
              💡 Compounding wealth increases exponentially over time. Consistent monthly SIPs build significant long-term capital!
            </div>
          </div>
        </div>
      </div>

      {/* Add Investment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Asset / SIP Investment</h2>

            <form onSubmit={handleCreateInvestment} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Asset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Reliance Industries / Nifty 50 / Bitcoin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Asset Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="stock">Stock</option>
                    <option value="mutual_fund">Mutual Fund</option>
                    <option value="crypto">Crypto</option>
                    <option value="gold">Gold</option>
                    <option value="fixed_deposit">Fixed Deposit</option>
                    <option value="ppf">PPF</option>
                    <option value="real_estate">Real Estate</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Ticker Symbol (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. RELIANCE.NS, BTC-USD"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
                  />
                </div>
              </div>

              {/* Quick symbol presets */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Popular Tickers Quick Select:</span>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_SYMBOLS.map((s) => (
                    <button
                      key={s.symbol}
                      type="button"
                      onClick={() => {
                        setSymbol(s.symbol);
                        setName(s.name);
                        if (s.symbol.includes('BTC') || s.symbol.includes('ETH')) setType('crypto');
                        else if (s.symbol === 'GOLD') setType('gold');
                        else setType('stock');
                      }}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-900 hover:bg-indigo-50 text-[10px] font-mono text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      {s.name} ({s.symbol})
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Quantity / Units</label>
                  <input
                    type="number"
                    min="0.0001"
                    step="any"
                    placeholder="e.g. 5"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="one_time">Lumpsum (One Time)</option>
                    <option value="monthly">Monthly SIP</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Amount Invested (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 10000"
                    value={amountInvested}
                    onChange={(e) => setAmountInvested(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Current Value (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Auto or e.g. 12500"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Monthly SIP Amount (Optional)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 2000"
                  value={sipAmount}
                  onChange={(e) => setSipAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow cursor-pointer"
                >
                  Add Asset Investment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
