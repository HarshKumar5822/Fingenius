import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Filter, Trash2, Edit2, X, Calendar, Tag, IndianRupee, PieChart as PieChartIcon } from 'lucide-react';
import { transactionService, Transaction } from '../services/api';
import { format } from 'date-fns';
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

const CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Bills & Utilities',
  'Entertainment',
  'Healthcare',
  'Travel',
  'Education',
  'Other'
];

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

const ExpensesPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await transactionService.getAll({ type: 'expense' });
      setTransactions(response.data.transactions);
      setError(null);
    } catch (err) {
      setError('Failed to load expenses. Please try again later.');
      console.error('Error loading expenses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleAddTransaction = async (transactionData: Partial<Transaction>) => {
    try {
      setIsSubmitting(true);
      setError(null);

      await transactionService.create(transactionData as Omit<Transaction, 'id'>);
      await loadTransactions();
      setShowAddModal(false);
    } catch (err) {
      setError('Failed to add expense. Please try again.');
      console.error('Error adding expense:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTransaction = async (transactionData: Partial<Transaction>) => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (!selectedTransaction || !selectedTransaction.id) return;
      await transactionService.update(selectedTransaction.id, transactionData);
      await loadTransactions();
      setShowEditModal(false);
      setSelectedTransaction(null);
    } catch (err) {
      setError('Failed to update expense. Please try again.');
      console.error('Error updating expense:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      setLoading(true);
      setError(null);
      await transactionService.delete(id);
      await loadTransactions();
    } catch (err) {
      setError('Failed to delete expense. Please try again.');
      console.error('Error deleting expense:', err);
    } finally {
      setLoading(false);
    }
  };


  const filteredAndSortedTransactions = transactions
    .filter(transaction => 
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (!selectedCategory || transaction.category === selectedCategory)
    )
    .sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'asc' 
          ? new Date(a.date).getTime() - new Date(b.date).getTime()
          : new Date(b.date).getTime() - new Date(a.date).getTime();
      } else {
        return sortOrder === 'asc' 
          ? a.amount - b.amount 
          : b.amount - a.amount;
      }
    });

  const totalExpenses = filteredAndSortedTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

  const categoryChartData = useMemo(() => {
    const totals: Record<string, number> = {};
    transactions.forEach((t) => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return null;
    return {
      labels: entries.map(([category]) => category),
      datasets: [
        {
          data: entries.map(([, amount]) => amount),
          backgroundColor: PIE_COLORS,
          borderWidth: 0,
        },
      ],
    };
  }, [transactions]);

  if (loading && !showAddModal && !showEditModal) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const TransactionModal = ({ isEdit = false }) => {
    const [form, setForm] = useState({
      description: isEdit ? selectedTransaction?.description || '' : '',
      category: isEdit ? selectedTransaction?.category || '' : '',
      amount: isEdit ? (selectedTransaction?.amount || '').toString() : '',
      date: isEdit ? selectedTransaction?.date || format(new Date(), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    });

    useEffect(() => {
      if (isEdit && selectedTransaction) {
        setForm({
          description: selectedTransaction.description || '',
          category: selectedTransaction.category || '',
          amount: selectedTransaction.amount?.toString() || '',
          date: selectedTransaction.date || format(new Date(), 'yyyy-MM-dd')
        });
      }
    }, [isEdit, selectedTransaction]);

    const handleSubmit = async () => {
      try {
        if (!form.description || !form.category || !form.amount) {
          setError('Please fill in all required fields');
          return;
        }

        const transactionData = {
          type: 'expense' as const,
          description: form.description.trim(),
          category: form.category,
          amount: parseFloat(form.amount),
          date: form.date
        };

        if (isEdit && selectedTransaction?.id) {
          await handleEditTransaction({
            ...selectedTransaction,
            ...transactionData
          });
        } else {
          await handleAddTransaction(transactionData);
        }
      } catch (err) {
        console.error('Error submitting form:', err);
        setError('Failed to save expense. Please try again.');
      }
    };

    const handleClose = () => {
      if (isEdit) {
        setShowEditModal(false);
        setSelectedTransaction(null);
      } else {
        setShowAddModal(false);
      }
      setError(null);
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">{isEdit ? 'Edit Expense' : 'Add New Expense'}</h2>
            <button 
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700"
              disabled={isSubmitting}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <div className="relative mt-1">
                <input
                  type="text"
                  autoComplete="off"
                  spellCheck="false"
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Enter expense description"
                  disabled={isSubmitting}
                />
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <div className="relative mt-1">
                <select
                  value={form.category}
                  onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  disabled={isSubmitting}
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <div className="relative mt-1">
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={form.amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                      setForm(prev => ({ ...prev, amount: value }));
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="0.00"
                  disabled={isSubmitting}
                />
                <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <div className="relative mt-1">
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  disabled={isSubmitting}
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                disabled={isSubmitting || !form.description || !form.category || !form.amount}
              >
                {isSubmitting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                {isEdit ? 'Save Changes' : 'Add Expense'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Expenses</h1>
        <button
          onClick={() => {
            setShowAddModal(true);
            setError(null);
          }}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors w-full sm:w-auto justify-center"
          disabled={loading}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Expense
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {categoryChartData && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-indigo-600" />
            Spending by Category
          </h2>
          <div className="max-w-xs mx-auto">
            <Pie
              data={categoryChartData}
              options={{
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => `${ctx.label}: ${formatIndianCurrency(ctx.parsed as number)}`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-auto pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('-') as ['date' | 'amount', 'asc' | 'desc'];
                setSortBy(newSortBy);
                setSortOrder(newSortOrder);
              }}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="date-desc">Latest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="py-3 px-4 text-left">Description</th>
                <th className="py-3 px-4 text-left">Category</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-left">Date</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredAndSortedTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">{transaction.description}</td>
                  <td className="py-3 px-4">{transaction.category}</td>
                  <td className="py-3 px-4 text-right font-medium text-red-600">
                    {formatIndianCurrency(transaction.amount)}
                  </td>
                  <td className="py-3 px-4">{format(new Date(transaction.date), 'MMM d, yyyy')}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedTransaction(transaction);
                          setShowEditModal(true);
                          setError(null);
                        }}
                        className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                        disabled={loading}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTransaction(transaction.id)}
                        className="p-1 text-red-600 hover:text-red-800 transition-colors"
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t font-medium">
                <td className="py-3 px-4">Total</td>
                <td></td>
                <td className="py-3 px-4 text-right text-red-600">
                  {formatIndianCurrency(totalExpenses)}
                </td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {showAddModal && <TransactionModal />}
      {showEditModal && <TransactionModal isEdit />}
    </div>
  );
};

export default ExpensesPage; 