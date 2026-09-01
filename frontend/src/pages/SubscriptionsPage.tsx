import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard as CardIcon,
  Tv,
  Plus,
  Trash2,
  Zap,
  Lock,
  X,
} from 'lucide-react';
import { subscriptionService, Subscription, CreditCard } from '../services/api';
import { toast } from 'sonner';

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Stat summaries
  const [monthlyOutflow, setMonthlyOutflow] = useState(0);
  const [yearlyOutflow, setYearlyOutflow] = useState(0);
  const [totalLimit, setTotalLimit] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);

  // Modal states
  const [showSubModal, setShowSubModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);

  // New Subscription Form
  const [subName, setSubName] = useState('');
  const [subAmount, setSubAmount] = useState('');
  const [subCycle, setSubCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [subCategory, setSubCategory] = useState<'OTT/Entertainment' | 'Software' | 'Gym/Fitness' | 'Utilities' | 'Other'>('OTT/Entertainment');
  const [subNextDate, setSubNextDate] = useState('');
  const [subNotes, setSubNotes] = useState('');

  // New Credit Card Form
  const [cardName, setCardName] = useState('');
  const [bankName, setBankName] = useState('');
  const [last4, setLast4] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [statementDate, setStatementDate] = useState('15');
  const [dueDate, setDueDate] = useState('5');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [subRes, cardRes] = await Promise.all([
        subscriptionService.getAll(),
        subscriptionService.getCards(),
      ]);

      setSubscriptions(subRes.data.subscriptions);
      setMonthlyOutflow(subRes.data.totalMonthlyOutflow);
      setYearlyOutflow(subRes.data.totalYearlyOutflow);

      setCards(cardRes.data.cards);
      setTotalLimit(cardRes.data.totalLimit);
      setTotalBalance(cardRes.data.totalBalance);
    } catch (err) {
      console.error('Error loading subscription data:', err);
      toast.error('Failed to load subscriptions & credit card data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName || !subAmount) {
      toast.error('Please fill in subscription name and amount');
      return;
    }

    try {
      await subscriptionService.create({
        name: subName,
        amount: Number(subAmount),
        billingCycle: subCycle,
        category: subCategory,
        nextBillingDate: subNextDate ? new Date(subNextDate).toISOString() : new Date().toISOString(),
        autoRenew: true,
        status: 'active',
        notes: subNotes,
      });

      toast.success('Subscription added successfully!');
      setShowSubModal(false);
      setSubName('');
      setSubAmount('');
      setSubNotes('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add subscription');
    }
  };

  const handleCreateCreditCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName || !bankName || !last4 || !creditLimit) {
      toast.error('Please complete card details');
      return;
    }

    try {
      await subscriptionService.createCard({
        cardName,
        bankName,
        last4,
        creditLimit: Number(creditLimit),
        currentBalance: Number(currentBalance || 0),
        statementDate: Number(statementDate),
        dueDate: Number(dueDate),
        colorGradient: 'from-slate-900 via-indigo-950 to-slate-900',
      });

      toast.success('Credit card added successfully!');
      setShowCardModal(false);
      setCardName('');
      setBankName('');
      setLast4('');
      setCreditLimit('');
      setCurrentBalance('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add credit card');
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      await subscriptionService.updateStatus(id, newStatus);
      toast.success(`Subscription marked as ${newStatus}`);
      loadData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    try {
      await subscriptionService.delete(id);
      toast.success('Subscription removed');
      loadData();
    } catch (err) {
      toast.error('Failed to delete subscription');
    }
  };

  const handleDeleteCard = async (id: string) => {
    try {
      await subscriptionService.deleteCard(id);
      toast.success('Credit card deleted');
      loadData();
    } catch (err) {
      toast.error('Failed to delete card');
    }
  };

  const getDaysUntilDue = (dueDay: number) => {
    const today = new Date();
    const currentDay = today.getDate();
    let days = dueDay - currentDay;
    if (days < 0) {
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      days += daysInMonth;
    }
    return days;
  };

  const filteredSubs = subscriptions.filter((s) => {
    if (activeFilter === 'all') return true;
    return s.category === activeFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-md">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <CardIcon className="w-8 h-8 text-indigo-600" />
            Subscriptions & Credit Card Manager
          </h1>
          <p className="text-gray-600 dark:text-slate-400 mt-1 text-sm">
            Audit recurring OTT/Gym/Software outflow and track Credit Card billing cycles with 3-day payment warning alerts.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap shrink-0">
          <button
            onClick={() => setShowCardModal(true)}
            className="whitespace-nowrap flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-700 dark:text-slate-200 text-xs font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4 text-indigo-600" />
            Add Credit Card
          </button>

          <button
            onClick={() => setShowSubModal(true)}
            className="whitespace-nowrap flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-100 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Subscription
          </button>
        </div>
      </div>

      {/* SECTION 1: CREDIT CARD CYCLE MANAGER */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-600" />
            Credit Card Billing Cycle Tracker
          </h2>
          <div className="text-xs text-gray-500 dark:text-slate-400 font-medium">
            Total Outstanding: <span className="font-bold text-red-500">₹{totalBalance.toLocaleString()}</span> / Limit: <span className="font-bold text-gray-900 dark:text-white">₹{totalLimit.toLocaleString()}</span>
          </div>
        </div>

        {cards.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-gray-100 dark:border-slate-700 text-center space-y-2">
            <CardIcon className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto" />
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">No Credit Cards Registered</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
              Add your credit cards to track statement dates, payment due dates, and prevent 3.5%/month finance charge penalties!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => {
              const daysLeft = getDaysUntilDue(card.dueDate);
              const isDueSoon = daysLeft <= 3 && card.currentBalance > 0;
              const usedPct = card.creditLimit > 0 ? Math.round((card.currentBalance / card.creditLimit) * 100) : 0;

              return (
                <div
                  key={card._id || card.cardName}
                  className={`bg-gradient-to-br ${card.colorGradient || 'from-slate-900 via-indigo-950 to-slate-900'} text-white rounded-2xl p-6 shadow-xl relative overflow-hidden border border-white/10 flex flex-col justify-between min-h-[220px]`}
                >
                  <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />

                  {/* Card Header */}
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-300 block">
                          {card.bankName}
                        </span>
                        <h3 className="text-lg font-extrabold tracking-tight mt-0.5">{card.cardName}</h3>
                      </div>

                      <div className="flex items-center gap-2">
                        {isDueSoon ? (
                          <span className="px-2.5 py-1 bg-red-500/90 text-white text-[10px] font-black uppercase rounded-full shadow-lg animate-pulse">
                            DUE IN {daysLeft === 0 ? 'TODAY' : `${daysLeft} DAYS`}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-white/10 text-indigo-200 text-[10px] font-bold rounded-full">
                            Due {card.dueDate}th
                          </span>
                        )}

                        <button
                          onClick={() => handleDeleteCard(card._id || '')}
                          className="text-white/40 hover:text-red-400 p-1 transition"
                          title="Delete Card"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-indigo-200 font-mono tracking-wider">
                      <span>•••• •••• •••• {card.last4}</span>
                      <span className="text-[10px] opacity-75">Statement: {card.statementDate}th</span>
                    </div>
                  </div>

                  {/* Credit Utilization Bar */}
                  <div className="space-y-1.5 pt-4 border-t border-white/10">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-indigo-200">Current Outstanding:</span>
                      <span className="font-extrabold text-white">₹{card.currentBalance.toLocaleString()}</span>
                    </div>

                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          usedPct > 80 ? 'bg-red-500' : usedPct > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, usedPct)}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-indigo-300">
                      <span>Limit: ₹{card.creditLimit.toLocaleString()}</span>
                      <span>{usedPct}% Utilized</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: RECURRING SUBSCRIPTIONS AUDIT */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Tv className="w-5 h-5 text-indigo-600" />
              Subscription Outflow Audit
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Total Outflow: <span className="font-bold text-indigo-600 dark:text-indigo-400">₹{monthlyOutflow.toLocaleString()}/mo</span> (₹{yearlyOutflow.toLocaleString()}/yr)
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {['all', 'OTT/Entertainment', 'Software', 'Gym/Fitness', 'Utilities', 'Other'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                  activeFilter === cat
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                {cat === 'all' ? 'All Subscriptions' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Subscriptions Grid */}
        {filteredSubs.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-gray-100 dark:border-slate-700 text-center space-y-2">
            <Zap className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto" />
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">No Subscriptions Found</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
              Click "+ Add Subscription" to start auditing monthly streaming, software, and membership costs.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubs.map((sub) => {
              const isActive = sub.status === 'active';

              return (
                <div
                  key={sub._id || sub.name}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition space-y-3 relative group"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                        <Tv className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-base">{sub.name}</h3>
                        <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-400">
                          {sub.category}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteSubscription(sub._id || '')}
                      className="text-gray-400 hover:text-red-500 p-1 transition"
                      title="Remove Subscription"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-baseline justify-between pt-2 border-t border-gray-100 dark:border-slate-700/60">
                    <div>
                      <span className="text-xl font-extrabold text-gray-900 dark:text-white">
                        ₹{sub.amount.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">
                        /{sub.billingCycle === 'yearly' ? 'yr' : 'mo'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleStatusToggle(sub._id || '', sub.status)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                        isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300'
                      }`}
                    >
                      {isActive ? 'Active' : 'Paused'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Add Credit Card */}
      {showCardModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CardIcon className="w-5 h-5 text-indigo-600" />
                Add Credit Card Account
              </h3>
              <button onClick={() => setShowCardModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCreditCard} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Card Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Regalia Gold / Amazon Pay ICICI"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Bank Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC / ICICI / SBI"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Last 4 Digits</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="4321"
                    value={last4}
                    onChange={(e) => setLast4(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Total Limit (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="150000"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Current Due (₹)</label>
                  <input
                    type="number"
                    placeholder="12500"
                    value={currentBalance}
                    onChange={(e) => setCurrentBalance(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Statement Date (Day)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={statementDate}
                    onChange={(e) => setStatementDate(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Payment Due Date (Day)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCardModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-slate-400 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 cursor-pointer shadow"
                >
                  Save Credit Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Subscription */}
      {showSubModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Tv className="w-5 h-5 text-indigo-600" />
                Add Recurring Subscription
              </h3>
              <button onClick={() => setShowSubModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubscription} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Subscription Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Netflix / Spotify / ChatGPT Plus / Cult.fit"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="649"
                    value={subAmount}
                    onChange={(e) => setSubAmount(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Billing Cycle</label>
                  <select
                    value={subCycle}
                    onChange={(e: any) => setSubCycle(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Category</label>
                <select
                  value={subCategory}
                  onChange={(e: any) => setSubCategory(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="OTT/Entertainment">OTT / Entertainment</option>
                  <option value="Software">Software & Cloud</option>
                  <option value="Gym/Fitness">Gym & Fitness</option>
                  <option value="Utilities">Utilities & Broadband</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Next Billing Date</label>
                <input
                  type="date"
                  value={subNextDate}
                  onChange={(e) => setSubNextDate(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-slate-400 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 cursor-pointer shadow"
                >
                  Save Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
