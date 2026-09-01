import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Copy,
  Check,
  Shield,
  LogOut,
  TrendingUp,
  DollarSign,
  PieChart,
  PlusCircle,
} from 'lucide-react';
import { circleService, Circle, CircleMetrics } from '../services/api';
import { toast } from 'sonner';

export default function FamilyCirclePage() {
  const [circle, setCircle] = useState<Circle | null>(null);
  const [metrics, setMetrics] = useState<CircleMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [circleName, setCircleName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchCircle = async () => {
    try {
      setLoading(true);
      const res = await circleService.getMyCircle();
      setCircle(res.data.circle);
      if (res.data.metrics) {
        setMetrics(res.data.metrics);
      }
    } catch (error: any) {
      toast.error('Failed to load Family Circle: ' + (error.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCircle();
  }, []);

  const handleCreateCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!circleName.trim()) {
      toast.error('Please enter a family circle name.');
      return;
    }
    try {
      const res = await circleService.create(circleName.trim());
      toast.success(`Circle '${res.data.circle.name}' created successfully!`);
      setCircleName('');
      fetchCircle();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create circle');
    }
  };

  const handleJoinCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error('Please enter a circle invite code.');
      return;
    }
    try {
      const res = await circleService.join(joinCode.trim());
      toast.success(res.message);
      setJoinCode('');
      fetchCircle();
    } catch (error: any) {
      toast.error(error.message || 'Invalid circle code');
    }
  };

  const handleLeaveCircle = async () => {
    if (!window.confirm('Are you sure you want to leave your Family Circle?')) return;
    try {
      const res = await circleService.leave();
      toast.success(res.message);
      setCircle(null);
      setMetrics(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to leave circle');
    }
  };

  const copyCode = () => {
    if (!circle) return;
    navigator.clipboard.writeText(circle.code);
    setCopied(true);
    toast.success('Invite code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-600" />
            Family Circle Hub
          </h1>
          <p className="text-gray-600 mt-1">
            Connect your family, aggregate monthly household income, and manage combined 50/30/20 budgets together.
          </p>
        </div>
      </div>

      {!circle ? (
        /* Create or Join Circle Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          {/* Create Circle Card */}
          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-lg space-y-6">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit">
              <PlusCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create a Family Circle</h2>
              <p className="text-gray-500 text-sm mt-1">
                Start a new financial group for your family (Spouse, Parents, Children). You will get a unique invite code to share.
              </p>
            </div>

            <form onSubmit={handleCreateCircle} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">Family Circle Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sharma Family Circle"
                  value={circleName}
                  onChange={(e) => setCircleName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-100"
              >
                Create Circle
              </button>
            </form>
          </div>

          {/* Join Circle Card */}
          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-lg space-y-6">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit">
              <UserPlus className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Join Existing Circle</h2>
              <p className="text-gray-500 text-sm mt-1">
                Enter the 6-character Invite Code shared by your family admin to connect your accounts.
              </p>
            </div>

            <form onSubmit={handleJoinCircle} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">Circle Invite Code</label>
                <input
                  type="text"
                  placeholder="e.g. FAM-X892"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl uppercase tracking-widest font-mono text-lg text-center focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition shadow-md shadow-emerald-100"
              >
                Join Family Circle
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Active Family Circle View */
        <div className="space-y-8">
          {/* Active Circle Banner */}
          <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-indigo-200 text-xs font-semibold backdrop-blur-md mb-2">
                <Shield className="w-3.5 h-3.5 text-amber-400" /> Active Family Hub
              </div>
              <h2 className="text-3xl font-extrabold">{circle.name}</h2>
              <p className="text-indigo-200 text-sm mt-1">
                Connected Members: {circle.members.length}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-white/10 px-4 py-2.5 rounded-xl border border-white/20 flex items-center gap-3 backdrop-blur-md">
                <div>
                  <div className="text-[10px] text-indigo-200 uppercase tracking-wider font-semibold">Invite Code</div>
                  <div className="font-mono text-lg font-bold text-white tracking-widest">{circle.code}</div>
                </div>
                <button
                  onClick={copyCode}
                  className="p-2 hover:bg-white/20 rounded-lg transition text-indigo-100"
                  title="Copy Invite Code"
                >
                  {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>

              <button
                onClick={handleLeaveCircle}
                className="p-3 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-xl border border-red-400/30 transition text-sm font-semibold flex items-center gap-2"
                title="Leave Circle"
              >
                <LogOut className="w-4 h-4" />
                Leave
              </button>
            </div>
          </div>

          {/* Household Financial Highlights */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Combined Family Income</div>
                    <div className="text-2xl font-extrabold text-gray-900 mt-1">
                      {formatCurrency(metrics.totalIncome)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <PieChart className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Family Essential Needs</div>
                    <div className="text-2xl font-extrabold text-blue-600 mt-1">
                      {formatCurrency(metrics.needsTotal)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Family Lifestyle Wants</div>
                    <div className="text-2xl font-extrabold text-amber-600 mt-1">
                      {formatCurrency(metrics.wantsTotal)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Family Wealth & Savings</div>
                    <div className="text-2xl font-extrabold text-purple-600 mt-1">
                      {formatCurrency(metrics.savingsTotal)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Member Contribution Leaderboard */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-md space-y-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Family Member Contributions (Current Month)
            </h3>

            <div className="divide-y divide-gray-100">
              {metrics?.memberBreakdown && metrics.memberBreakdown.map((member, index) => (
                <div key={index} className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 flex items-center gap-2">
                        {member.name}
                        {circle.admin && circle.admin._id === member.email && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{member.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 text-right">
                    <div>
                      <div className="text-xs text-gray-400">Income Added</div>
                      <div className="text-sm font-bold text-emerald-600">{formatCurrency(member.income)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Expenses Logged</div>
                      <div className="text-sm font-bold text-gray-800">{formatCurrency(member.expense)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
