import axios from 'axios';

const API_URL = import.meta.env.VITE_APP_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  settings: {
    currency: string;
    theme: string;
    notifications: boolean;
    budgetThreshold?: number;
    budgetAlertsEnabled?: boolean;
    goalAlertsEnabled?: boolean;
    billAlertsEnabled?: boolean;
  };
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
  tags?: string[];
  recurring?: {
    isRecurring: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    endDate?: string;
  };
}

export interface Goal {
  id?: string;
  _id?: string;
  user?: { _id?: string; name?: string; email?: string } | string;
  title: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  category: string;
  deadline: string;
  status: 'active' | 'completed' | 'failed';
  contributions: Array<{
    amount: number;
    date: string;
  }>;
  reminderFrequency: 'daily' | 'weekly' | 'monthly';
}

export interface Alert {
  id?: string;
  _id?: string;
  type: 'budget' | 'goal' | 'bill' | 'system';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  status: 'unread' | 'read' | 'archived';
  relatedTo?: {
    model: 'Transaction' | 'Goal' | 'User';
    id: string;
  };
  expiresAt?: string;
  actionRequired: boolean;
  actionUrl?: string;
  createdAt?: string;
}

export interface AnalysisResult {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  healthScore: number;
  summary: string;
  recurringExpenses: Array<{
    description: string;
    amount: number;
    frequency: string;
  }>;
  topCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    income: number;
    expenses: number;
  }>;
  suggestions: string[];
}

export interface Circle {
  _id: string;
  name: string;
  code: string;
  admin: { _id: string; name: string; email: string };
  members: Array<{ _id: string; name: string; email: string }>;
  createdAt: string;
}

export interface CircleMetrics {
  totalIncome: number;
  totalExpenses: number;
  needsTotal: number;
  wantsTotal: number;
  savingsTotal: number;
  memberBreakdown: Array<{
    name: string;
    email: string;
    income: number;
    expense: number;
  }>;
}

export interface Investment {
  _id: string;
  name: string;
  type: 'mutual_fund' | 'stock' | 'fixed_deposit' | 'gold' | 'crypto' | 'ppf' | 'real_estate' | 'other';
  amountInvested: number;
  currentValue: number;
  sipAmount?: number;
  frequency?: 'monthly' | 'one_time';
  startDate?: string;
  quantity?: number;
  symbol?: string;
  lastPrice?: number;
  dayChange?: number;
  dayChangePercent?: number;
  lastUpdated?: string;
  notes?: string;
}

export interface MarketTickerItem {
  symbol: string;
  name: string;
  type: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated?: string;
}

export interface Subscription {
  _id?: string;
  id?: string;
  name: string;
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  category: 'OTT/Entertainment' | 'Software' | 'Gym/Fitness' | 'Utilities' | 'Other';
  nextBillingDate: string;
  autoRenew: boolean;
  status: 'active' | 'cancelled' | 'paused';
  notes?: string;
}

export interface CreditCard {
  _id?: string;
  id?: string;
  cardName: string;
  bankName: string;
  last4: string;
  creditLimit: number;
  currentBalance: number;
  statementDate: number;
  dueDate: number;
  colorGradient?: string;
}

export interface InvestmentSummary {
  totalInvested: number;
  totalCurrentValue: number;
  totalMonthlySip: number;
  overallReturns: number;
  growthPercentage: number | string;
}

export interface Rule503020Summary {
  customRatios: {
    needsRatio: number;
    wantsRatio: number;
    savingsRatio: number;
  };
  income: number;
  breakdown: {
    needs: { total: number; target: number; percentage: number; categories: Record<string, number> };
    wants: { total: number; target: number; percentage: number; categories: Record<string, number> };
    savings: { total: number; target: number; percentage: number; categories: Record<string, number> };
  };
  utilizationScore: number;
  scoreDeductions?: Array<{ bucket: string; penalty: number; reason: string }>;
  healthLabel?: string;
  healthColor?: string;
  categoryMappings: Array<{ category: string; bucket: 'need' | 'want' | 'savings' }>;
  nudges: Array<{
    type: 'warning' | 'danger' | 'success' | 'info';
    title: string;
    message: string;
  }>;
}

export interface ChatMessage {
  _id?: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists (prioritize sessionStorage for tab isolation)
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

interface LoginResponse {
  status: string;
  data: {
    token: string;
    user: User;
  };
}

const handleError = (error: unknown): Error => {
  if (error && typeof error === 'object') {
    const err = error as { response?: { data?: { message?: string } }; message?: string; code?: string };
    if (err.response?.data?.message) {
      return new Error(err.response.data.message);
    }
    if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
      return new Error('Backend server is offline or unreachable. Please verify server is running on port 5001.');
    }
    if (err.message) {
      return new Error(err.message);
    }
  }
  return new Error('An unexpected error occurred. Please check your credentials and try again.');
};

// Auth Services
export const authService = {
  async login(email: string, password: string): Promise<User> {
    try {
      const response = await api.post<LoginResponse>('/auth/login', {
        email,
        password,
      });
      const { token, user } = response.data.data;
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error) {
      throw handleError(error);
    }
  },

  async register(name: string, email: string, password: string): Promise<User> {
    try {
      const response = await api.post<LoginResponse>('/auth/register', {
        name,
        email,
        password,
      });
      const { token, user } = response.data.data;
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error) {
      throw handleError(error);
    }
  },

  logout(): void {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser(): User | null {
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!(sessionStorage.getItem('token') || localStorage.getItem('token'));
  },

  async getProfile(): Promise<User> {
    try {
      const response = await api.get<{ data: { user: User } }>('/auth/me');
      const user = response.data.data.user;
      sessionStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error) {
      throw handleError(error);
    }
  },

  async updateProfile(profileData: { name?: string; email?: string; phone?: string; settings?: Partial<User['settings']> }): Promise<User> {
    try {
      const response = await api.put<{ data: { user: User } }>('/auth/profile', profileData);
      const user = response.data.data.user;
      sessionStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error) {
      throw handleError(error);
    }
  },

  async resetPassword(email: string, newPassword: string): Promise<{ message: string }> {
    try {
      const response = await api.post<{ message: string }>('/auth/reset-password-request', {
        email,
        newPassword,
      });
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },
};

// Transaction Services
export const transactionService = {
  getAll: async (filters?: { startDate?: string; endDate?: string; category?: string; type?: 'income' | 'expense' }) => {
    const response = await api.get<{ data: { transactions: Transaction[] } }>('/transactions', { params: filters });
    return response.data;
  },

  create: async (transaction: Omit<Transaction, 'id'>) => {
    const response = await api.post<{ data: { transaction: Transaction } }>('/transactions', transaction);
    return response.data;
  },

  update: async (id: string, transaction: Partial<Omit<Transaction, 'id'>>) => {
    const response = await api.put<{ data: { transaction: Transaction } }>(`/transactions/${id}`, transaction);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<{ data: null }>(`/transactions/${id}`);
    return response.data;
  },

  getSummary: async (dateRange?: { startDate: string; endDate: string }) => {
    const response = await api.get<{
      data: {
        income: number;
        expenses: number;
        balance: number;
        summary: Array<{ _id: string; total: number; count: number }>;
      }
    }>('/transactions/summary/overview', { params: dateRange });
    return response.data;
  },
};

// Goal Services
export const goalService = {
  getAll: async (filters?: { status?: 'active' | 'completed' | 'failed'; view?: 'personal' | 'circle' }) => {
    try {
      const response = await api.get<{ data: { goals: Goal[] } }>('/goals', { params: filters });
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  create: async (goal: Omit<Goal, 'id' | 'currentAmount' | 'contributions'>) => {
    try {
      const response = await api.post<{ data: { goal: Goal } }>('/goals', goal);
      return response.data;
    } catch (error) {
      console.error('Error creating goal:', error);
      throw handleError(error);
    }
  },

  update: async (id: string, goal: Partial<Omit<Goal, 'id' | 'contributions'>>) => {
    try {
      const response = await api.put<{ data: { goal: Goal } }>(`/goals/${id}`, goal);
      return response.data;
    } catch (error) {
      console.error('Error updating goal:', error);
      throw handleError(error);
    }
  },

  delete: async (id: string) => {
    try {
      const response = await api.delete<{ data: null }>(`/goals/${id}`);
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  addContribution: async (id: string, amount: number) => {
    try {
      const response = await api.post<{ data: { goal: Goal } }>(`/goals/${id}/contributions`, { amount });
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  getProgress: async (id: string) => {
    try {
      const response = await api.get<{
        data: {
          progress: {
            percentageComplete: number;
            remainingAmount: number;
            daysRemaining: number;
            contributions: number;
            totalContributed: number;
            isOnTrack: boolean;
          }
        }
      }>(`/goals/${id}/progress`);
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },
};

// Alert Services
export const alertService = {
  getAll: async (filters?: { status?: 'unread' | 'read' | 'archived'; priority?: 'low' | 'medium' | 'high'; type?: 'budget' | 'goal' | 'bill' | 'system' }) => {
    const response = await api.get<{ data: { alerts: Alert[] } }>('/alerts', { params: filters });
    return response.data;
  },

  create: async (alert: Omit<Alert, 'id' | 'status'>) => {
    const response = await api.post<{ data: { alert: Alert } }>('/alerts', alert);
    return response.data;
  },

  update: async (id: string, status: 'read' | 'archived') => {
    const response = await api.patch<{ data: { alert: Alert } }>(`/alerts/${id}/status`, { status });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<{ data: null }>(`/alerts/${id}`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.patch<{ data: null }>('/alerts/status/read-all');
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get<{ data: { count: number } }>('/alerts/count/unread');
    return response.data;
  },

  updateSettings: async (settings: { budgetThreshold?: number; budgetAlertsEnabled?: boolean; goalAlertsEnabled?: boolean; billAlertsEnabled?: boolean }) => {
    const response = await api.put<{ data: { settings: any } }>('/alerts/settings', settings);
    return response.data;
  },
};

// Bank Statement Services
export interface BankStatement {
  _id: string;
  fileName: string;
  uploadDate: string;
  status: 'processing' | 'completed' | 'failed';
  analysis?: AnalysisResult;
  errorMessage?: string;
}

export const bankStatementService = {
  upload: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post<{ data: { bankStatement: BankStatement } }>(
        '/bank-statements',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  getAll: async () => {
    try {
      const response = await api.get<{ data: { bankStatements: BankStatement[] } }>('/bank-statements');
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  getById: async (id: string) => {
    try {
      const response = await api.get<{ data: { bankStatement: BankStatement } }>(`/bank-statements/${id}`);
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  delete: async (id: string) => {
    try {
      const response = await api.delete<{ message: string }>(`/bank-statements/${id}`);
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },
};

// Circle Services
export const circleService = {
  create: async (name: string) => {
    const response = await api.post<{ data: { circle: Circle } }>('/circles/create', { name });
    return response.data;
  },

  join: async (code: string) => {
    const response = await api.post<{ message: string; data: { circle: Circle } }>('/circles/join', { code });
    return response.data;
  },

  getMyCircle: async () => {
    const response = await api.get<{ data: { circle: Circle | null; metrics?: CircleMetrics } }>('/circles/my-circle');
    return response.data;
  },

  leave: async () => {
    const response = await api.post<{ message: string }>('/circles/leave');
    return response.data;
  },
};

// Investment Services
export const investmentService = {
  getAll: async (view?: 'personal' | 'circle') => {
    const response = await api.get<{ data: { investments: Investment[]; summary: InvestmentSummary } }>('/investments', {
      params: { view }
    });
    return response.data;
  },

  create: async (investment: Omit<Investment, '_id'>) => {
    const response = await api.post<{ data: { investment: Investment } }>('/investments', investment);
    return response.data;
  },

  update: async (id: string, investment: Partial<Omit<Investment, '_id'>>) => {
    const response = await api.put<{ data: { investment: Investment } }>(`/investments/${id}`, investment);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<{ data: null }>(`/investments/${id}`);
    return response.data;
  },
  getLiveTicker: async () => {
    const response = await api.get<{ data: MarketTickerItem[] }>('/investments/live-ticker');
    return response.data;
  },

  syncLivePrices: async () => {
    const response = await api.post<{ message: string; data: { investments: Investment[]; summary: InvestmentSummary } }>('/investments/sync-prices');
    return response.data;
  },
};

// Rule 50/30/20 Services
export const rule503020Service = {
  getSummary: async () => {
    const response = await api.get<{ data: Rule503020Summary }>('/rule503020/summary');
    return response.data;
  },

  updateCategoryMapping: async (category: string, bucket: 'need' | 'want' | 'savings') => {
    const response = await api.patch<{ message: string; data: { categoryMappings: Array<{ category: string; bucket: string }> } }>(
      '/rule503020/category-mappings',
      { category, bucket }
    );
    return response.data;
  },

  updateRatios: async (needsRatio: number, wantsRatio: number, savingsRatio: number) => {
    const response = await api.patch<{ message: string; data: { customRatios: { needsRatio: number; wantsRatio: number; savingsRatio: number } } }>(
      '/rule503020/ratios',
      { needsRatio, wantsRatio, savingsRatio }
    );
    return response.data;
  },
};

// Subscription & Credit Card Services
export const subscriptionService = {
  getAll: async () => {
    const response = await api.get<{
      data: {
        subscriptions: Subscription[];
        totalMonthlyOutflow: number;
        totalYearlyOutflow: number;
        activeCount: number;
      };
    }>('/subscriptions');
    return response.data;
  },

  create: async (sub: Omit<Subscription, '_id' | 'id'>) => {
    const response = await api.post<{ data: { subscription: Subscription } }>('/subscriptions', sub);
    return response.data;
  },

  updateStatus: async (id: string, status?: 'active' | 'cancelled' | 'paused', autoRenew?: boolean) => {
    const response = await api.patch<{ data: { subscription: Subscription } }>(`/subscriptions/${id}/status`, { status, autoRenew });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<{ data: null }>(`/subscriptions/${id}`);
    return response.data;
  },

  // Credit Cards
  getCards: async () => {
    const response = await api.get<{
      data: {
        cards: CreditCard[];
        totalLimit: number;
        totalBalance: number;
        availableCredit: number;
      };
    }>('/subscriptions/cards');
    return response.data;
  },

  createCard: async (card: Omit<CreditCard, '_id' | 'id'>) => {
    const response = await api.post<{ data: { card: CreditCard } }>('/subscriptions/cards', card);
    return response.data;
  },

  deleteCard: async (id: string) => {
    const response = await api.delete<{ data: null }>(`/subscriptions/cards/${id}`);
    return response.data;
  },
};

// GeniusAI Assistant Services
export const aiService = {
  sendMessage: async (message: string) => {
    try {
      const response = await api.post<{ data: { reply: string } }>('/ai/chat', { message });
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  getHistory: async () => {
    try {
      const response = await api.get<{ data: { messages: ChatMessage[] } }>('/ai/history');
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  clearHistory: async () => {
    try {
      const response = await api.delete<{ message: string }>('/ai/history');
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },
};

export default api; 