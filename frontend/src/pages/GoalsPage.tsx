import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Target, X, Trash2, CheckCircle2, Users, User } from 'lucide-react';
import { goalService, circleService, Goal } from '../services/api';
import { format } from 'date-fns';

interface GoalFormData {
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: string;
  description?: string;
}

const CATEGORIES = [
  'Short Term',
  'Long Term',
  'Travel',
  'Education',
  'Investment',
  'Emergency Fund',
  'Other',
];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'personal' | 'circle'>('personal');
  const [circleName, setCircleName] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFundsModal, setShowFundsModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState<GoalFormData>({
    title: '',
    targetAmount: 0,
    currentAmount: 0,
    deadline: format(new Date(), 'yyyy-MM-dd'),
    category: '',
    description: '',
  });
  const [fundAmount, setFundAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getGoalId = (goal: Goal): string => {
    return (goal._id || goal.id || '') as string;
  };

  const checkCircleStatus = useCallback(async () => {
    try {
      const res = await circleService.getMyCircle();
      if (res.data?.circle) {
        setCircleName(res.data.circle.name);
      } else {
        setCircleName(null);
      }
    } catch {
      setCircleName(null);
    }
  }, []);

  const loadGoals = useCallback(async (viewToLoad: 'personal' | 'circle' = activeView) => {
    try {
      setLoading(true);
      const response = await goalService.getAll({ view: viewToLoad });
      const goalsData = response.data?.goals || [];
      setGoals(goalsData);
      setError(null);
    } catch (err) {
      setError('Failed to load goals. Please try again later.');
      console.error('Error loading goals:', err);
    } finally {
      setLoading(false);
    }
  }, [activeView]);

  useEffect(() => {
    checkCircleStatus();
    loadGoals(activeView);
  }, [checkCircleStatus, loadGoals, activeView]);

  const handleTabChange = (view: 'personal' | 'circle') => {
    setActiveView(view);
    loadGoals(view);
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);

      if (!formData.title || !formData.targetAmount || !formData.category || !formData.deadline) {
        setError('Please fill in all required fields');
        return;
      }

      const newGoal = {
        title: formData.title.trim(),
        targetAmount: Number(formData.targetAmount),
        category: formData.category,
        deadline: formData.deadline,
        description: formData.description?.trim() || '',
        status: 'active' as const,
        reminderFrequency: 'weekly' as const,
      };

      const response = await goalService.create(newGoal);

      if (response.data?.goal) {
        await loadGoals(activeView);
        setShowAddModal(false);
        setFormData({
          title: '',
          targetAmount: 0,
          currentAmount: 0,
          deadline: format(new Date(), 'yyyy-MM-dd'),
          category: '',
          description: '',
        });
      } else {
        setError('Failed to create goal. Please try again.');
      }
    } catch (err) {
      console.error('Error creating goal:', err);
      setError(err instanceof Error ? err.message : 'Failed to create goal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    const goalId = getGoalId(selectedGoal);
    if (!goalId) return;

    try {
      setIsSubmitting(true);
      setError(null);

      if (!formData.title || !formData.targetAmount || !formData.category || !formData.deadline) {
        setError('Please fill in all required fields');
        return;
      }

      const updatedGoal = {
        title: formData.title.trim(),
        targetAmount: Number(formData.targetAmount),
        category: formData.category,
        deadline: formData.deadline,
        description: formData.description?.trim() || '',
        status: selectedGoal.status || ('active' as const),
        reminderFrequency: selectedGoal.reminderFrequency || ('weekly' as const),
      };

      const response = await goalService.update(goalId, updatedGoal);

      if (response.data?.goal) {
        await loadGoals(activeView);
        setShowEditModal(false);
        setSelectedGoal(null);
        setFormData({
          title: '',
          targetAmount: 0,
          currentAmount: 0,
          deadline: format(new Date(), 'yyyy-MM-dd'),
          category: '',
          description: '',
        });
      } else {
        setError('Failed to update goal. Please try again.');
      }
    } catch (err) {
      console.error('Error updating goal:', err);
      setError(err instanceof Error ? err.message : 'Failed to update goal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    const goalId = getGoalId(selectedGoal);

    if (!goalId || !fundAmount || fundAmount <= 0) {
      setError('Please enter a valid fund amount');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await goalService.addContribution(goalId, fundAmount);
      await loadGoals(activeView);
      setShowFundsModal(false);
      setSelectedGoal(null);
      setFundAmount(0);
    } catch (err) {
      setError('Failed to add funds. Please try again.');
      console.error('Error adding funds:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGoal = async (goal: Goal) => {
    const goalId = getGoalId(goal);
    if (!goalId) return;

    if (!window.confirm(`Are you sure you want to delete the goal "${goal.title}"?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await goalService.delete(goalId);
      await loadGoals(activeView);
    } catch (err) {
      setError('Failed to delete goal. Please try again.');
      console.error('Error deleting goal:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Goals</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Set custom financial targets, contribute funds, and share goals with your Family Circle.
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddModal(true);
            setError(null);
          }}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors w-full sm:w-auto justify-center shadow font-medium text-sm cursor-pointer"
          disabled={loading}
        >
          <Plus className="w-5 h-5 mr-1.5" />
          Add New Goal
        </button>
      </div>

      {/* Tabs: Personal vs Family Circle */}
      <div className="flex items-center gap-2 border-b pb-1">
        <button
          onClick={() => handleTabChange('personal')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeView === 'personal'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <User className="w-4 h-4" />
          My Personal Goals
        </button>

        <button
          onClick={() => handleTabChange('circle')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeView === 'circle'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Family Circle Goals {circleName ? `(${circleName})` : ''}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Empty State vs Goals Grid */}
      {loading && !showAddModal && !showEditModal && !showFundsModal ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      ) : goals.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center max-w-md mx-auto flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
            <Target className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            No {activeView === 'circle' ? 'Family Circle' : 'Personal'} Goals Found
          </h3>
          <p className="text-gray-500 text-xs mb-6">
            {activeView === 'circle'
              ? `No goals created in your Family Circle "${circleName}" yet. Create one to share with family members!`
              : 'You have no personal goals set yet. Create your custom goal to start tracking target amounts!'}
          </p>
          <button
            onClick={() => {
              setShowAddModal(true);
              setError(null);
            }}
            className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" /> Add New Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => {
            const isCompleted =
              goal.status === 'completed' || goal.currentAmount >= goal.targetAmount;
            const progressPercent = Math.min(
              100,
              Math.round((goal.currentAmount / goal.targetAmount) * 100)
            );
            const creatorName =
              typeof goal.user === 'object' && goal.user?.name ? goal.user.name : null;

            return (
              <div
                key={getGoalId(goal)}
                className={`bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all border ${
                  isCompleted ? 'border-green-200 bg-green-50/20' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{goal.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{goal.category}</span>
                      {creatorName && activeView === 'circle' && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-medium">
                          By: {creatorName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isCompleted
                          ? 'bg-green-100 text-green-700'
                          : goal.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-indigo-50 text-indigo-600'
                      }`}
                    >
                      {isCompleted ? 'Completed 🎉' : `${progressPercent}%`}
                    </span>
                    <button
                      onClick={() => handleDeleteGoal(goal)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isCompleted && (
                  <div className="mb-4 p-2.5 bg-green-100 text-green-800 rounded-lg text-xs font-medium flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-green-600" /> Goal Target Reached!
                    </span>
                    <button
                      onClick={() => handleDeleteGoal(goal)}
                      className="text-xs text-red-700 underline font-semibold hover:text-red-900 cursor-pointer"
                    >
                      Remove Goal
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 mb-4 bg-gray-50 p-3 rounded-lg">
                  <div>
                    <p className="text-[11px] text-gray-500 font-medium">Target</p>
                    <p className="text-xs font-bold text-gray-900">
                      ₹{goal.targetAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500 font-medium">Saved</p>
                    <p className="text-xs font-bold text-green-600">
                      ₹{goal.currentAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500 font-medium">Deadline</p>
                    <p className="text-xs font-semibold text-gray-700">
                      {goal.deadline ? format(new Date(goal.deadline), 'MMM dd, yyyy') : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 mb-5">
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted
                          ? 'bg-green-500'
                          : goal.status === 'failed'
                          ? 'bg-red-500'
                          : 'bg-indigo-600'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 font-medium">
                    <span>₹{goal.currentAmount.toLocaleString()}</span>
                    <span>₹{goal.targetAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedGoal(goal);
                      setFundAmount(0);
                      setShowFundsModal(true);
                      setError(null);
                    }}
                    className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-xs font-semibold cursor-pointer disabled:opacity-50"
                    disabled={isCompleted}
                  >
                    Add Funds
                  </button>
                  <button
                    onClick={() => {
                      setSelectedGoal(goal);
                      setFormData({
                        title: goal.title,
                        targetAmount: goal.targetAmount,
                        currentAmount: goal.currentAmount,
                        deadline: goal.deadline
                          ? format(new Date(goal.deadline), 'yyyy-MM-dd')
                          : format(new Date(), 'yyyy-MM-dd'),
                        category: goal.category,
                        description: goal.description || '',
                      });
                      setShowEditModal(true);
                      setError(null);
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-100 border border-gray-200 dark:border-slate-600 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-xs font-semibold cursor-pointer"
                  >
                    Edit Goal
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">Add New Goal</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleAddGoal} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Goal Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. Buy New Phone / Car Savings"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Target Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.targetAmount || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, targetAmount: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. 50000"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">Select Category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Target Deadline</label>
                  <input
                    type="date"
                    required
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  rows={2}
                  placeholder="Optional goal notes"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Goal Modal */}
      {showEditModal && selectedGoal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">Edit Goal</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedGoal(null);
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleEditGoal} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Target Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.targetAmount || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, targetAmount: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    required
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Funds Modal */}
      {showFundsModal && selectedGoal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Add Funds to Goal</h2>
                <p className="text-xs text-indigo-600 font-semibold">{selectedGoal.title}</p>
              </div>
              <button
                onClick={() => {
                  setShowFundsModal(false);
                  setSelectedGoal(null);
                  setFundAmount(0);
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleAddFunds} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Amount to Add (₹)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={fundAmount || ''}
                  onChange={(e) => setFundAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. 5000"
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600 flex justify-between">
                <span>Current Progress:</span>
                <span className="font-bold text-gray-900">
                  ₹{selectedGoal.currentAmount.toLocaleString()} / ₹
                  {selectedGoal.targetAmount.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFundsModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow transition-colors disabled:opacity-50"
                  disabled={isSubmitting || !fundAmount}
                >
                  {isSubmitting ? 'Adding...' : 'Add Funds'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}