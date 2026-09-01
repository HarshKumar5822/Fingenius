import {
  Bell,
  AlertTriangle,
  CheckCircle,
  X,
  Plus,
  CheckCheck,
  Calendar,
  ShieldAlert,
  ArrowRight,
  Clock,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { alertService, Alert, authService } from '../services/api';
import { toast } from 'sonner';

interface AlertSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  threshold?: number;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [activeFilter, setActiveFilter] = useState<'all' | 'budget' | 'goal' | 'bill'>('all');

  // Custom Reminder Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [customType, setCustomType] = useState<'bill' | 'budget' | 'goal' | 'system'>('bill');
  const [customPriority, setCustomPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [customDueDate, setCustomDueDate] = useState('');

  // Settings state
  const [alertSettings, setAlertSettings] = useState<AlertSetting[]>([
    {
      id: 'budget',
      title: 'Budget Threshold Alerts',
      description: 'Get notified when spending reaches a specified percentage of your monthly income benchmark',
      enabled: true,
      threshold: 80,
    },
    {
      id: 'goals',
      title: 'Goal Milestones',
      description: 'Receive real-time progress updates when saving goals hit funding milestones or complete',
      enabled: true,
    },
    {
      id: 'bills',
      title: 'Bill & SIP Reminders',
      description: 'Get notified about upcoming bill payments, house rent, and SIP outflows',
      enabled: true,
    },
  ]);

  const [showSettings, setShowSettings] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const getAlertId = (alert: Alert) => alert._id || alert.id || '';

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await alertService.getAll();
      setAlerts(response.data.alerts);
      setError(null);

      // Load user saved settings if available
      const user = authService.getCurrentUser();
      if (user?.settings) {
        setAlertSettings((prev) =>
          prev.map((s) => {
            if (s.id === 'budget') {
              return {
                ...s,
                enabled: user.settings.notifications ?? true,
                threshold: user.settings.budgetThreshold ?? 80,
              };
            }
            return s;
          })
        );
      }
    } catch (err: any) {
      setError('Failed to load alerts. Please try again later.');
      console.error('Error loading alerts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const getIcon = (type: Alert['type']) => {
    switch (type) {
      case 'budget':
        return AlertTriangle;
      case 'goal':
        return CheckCircle;
      case 'bill':
        return Calendar;
      default:
        return Bell;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return format(new Date(), 'MMM d, h:mm a');
    try {
      return format(new Date(dateStr), 'MMM d, h:mm a');
    } catch {
      return dateStr;
    }
  };

  const handleAlertClick = async (alert: Alert) => {
    const alertId = getAlertId(alert);
    if (!alertId || alert.status === 'read') return;

    try {
      await alertService.update(alertId, 'read');
      loadAlerts();
    } catch (err) {
      console.error('Error updating alert status:', err);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (!alertId) return;
    try {
      await alertService.delete(alertId);
      toast.success('Alert deleted');
      loadAlerts();
    } catch (err) {
      console.error('Error deleting alert:', err);
      toast.error('Failed to delete alert');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await alertService.markAllAsRead();
      toast.success('All notifications marked as read');
      loadAlerts();
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleCreateCustomReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle || !customMessage) {
      toast.error('Please fill in title and description');
      return;
    }

    try {
      await alertService.create({
        type: customType,
        title: customTitle,
        message: customMessage,
        priority: customPriority,
        expiresAt: customDueDate ? new Date(customDueDate).toISOString() : undefined,
        actionRequired: customType === 'bill',
        actionUrl: customType === 'bill' ? '/dashboard/expenses' : undefined,
      });

      toast.success('Custom reminder created!');
      setShowAddModal(false);
      setCustomTitle('');
      setCustomMessage('');
      setCustomDueDate('');
      loadAlerts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create reminder');
    }
  };

  const handleToggleAlert = (id: string) => {
    setAlertSettings((prev) =>
      prev.map((setting) =>
        setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
      )
    );
    setHasChanges(true);
  };

  const handleThresholdChange = (id: string, value: number) => {
    setAlertSettings((prev) =>
      prev.map((setting) =>
        setting.id === id ? { ...setting, threshold: value } : setting
      )
    );
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    setSaveStatus('saving');
    try {
      const budgetSetting = alertSettings.find((s) => s.id === 'budget');
      const goalSetting = alertSettings.find((s) => s.id === 'goals');
      const billSetting = alertSettings.find((s) => s.id === 'bills');

      await alertService.updateSettings({
        budgetThreshold: budgetSetting?.threshold || 80,
        budgetAlertsEnabled: budgetSetting?.enabled ?? true,
        goalAlertsEnabled: goalSetting?.enabled ?? true,
        billAlertsEnabled: billSetting?.enabled ?? true,
      });

      setSaveStatus('success');
      setHasChanges(false);
      toast.success('Alert settings saved!');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (error) {
      console.error('Error saving alert settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Filtered Alerts
  const filteredAlerts = alerts.filter((a) => {
    if (activeFilter === 'all') return true;
    return a.type === activeFilter;
  });

  const unreadCount = alerts.filter((a) => a.status === 'unread').length;

  if (loading && !showSettings && alerts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-md">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Bell className="w-8 h-8 text-indigo-600" />
            Alerts & Financial Sentinel
          </h1>
          <p className="text-gray-600 dark:text-slate-400 mt-1 text-sm">
            Real-time overbudget warnings, goal funding milestones, and custom bill payment reminders.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap shrink-0">
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="whitespace-nowrap flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-700 dark:text-slate-200 text-xs font-bold hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 transition cursor-pointer shadow-sm"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600" />
            Mark All Read ({unreadCount})
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="whitespace-nowrap flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-100 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Custom Reminder
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="whitespace-nowrap flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-700 dark:text-slate-200 text-xs font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition cursor-pointer shadow-sm"
          >
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
            {showSettings ? 'Hide Controls' : 'Alert Controls'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Main Grid: Adapts Full Width when settings drawer is closed */}
      <div className={`grid gap-6 ${showSettings ? 'lg:grid-cols-3' : 'grid-cols-1'}`}>
        {/* Alerts Feed Column */}
        <div className={`space-y-4 ${showSettings ? 'lg:col-span-2' : 'w-full'}`}>
          {/* Category Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-200 dark:border-slate-700 pb-3 overflow-x-auto">
            <button
              onClick={() => setActiveFilter('all')}
              className={`whitespace-nowrap px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              All Notifications ({alerts.length})
            </button>
            <button
              onClick={() => setActiveFilter('budget')}
              className={`whitespace-nowrap px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeFilter === 'budget'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              Budget Warnings ⚠️
            </button>
            <button
              onClick={() => setActiveFilter('goal')}
              className={`whitespace-nowrap px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeFilter === 'goal'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              Goal Updates 🎯
            </button>
            <button
              onClick={() => setActiveFilter('bill')}
              className={`whitespace-nowrap px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeFilter === 'bill'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              Bill Reminders 📅
            </button>
          </div>

          {/* Alerts Card Feed */}
          {filteredAlerts.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 border border-gray-100 dark:border-slate-700 text-center space-y-3 shadow-md">
              <Sparkles className="w-10 h-10 text-indigo-500 mx-auto" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Notifications Found</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
                You are all caught up! Smart alerts will automatically generate when your spending or goals hit key thresholds.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => {
                const alertId = getAlertId(alert);
                const Icon = getIcon(alert.type);
                const isUnread = alert.status === 'unread';

                return (
                  <div
                    key={alertId || alert.title}
                    onClick={() => handleAlertClick(alert)}
                    className={`bg-white dark:bg-slate-800/90 rounded-2xl border border-gray-100 dark:border-slate-700/80 p-5 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group cursor-pointer ${
                      isUnread
                        ? 'border-l-4 border-l-indigo-600 dark:border-l-indigo-500 bg-indigo-50/20 dark:bg-slate-800'
                        : 'opacity-90 hover:opacity-100'
                    }`}
                  >
                    {/* Priority Left Gradient Pillar */}
                    <div
                      className={`absolute top-0 bottom-0 left-0 w-1.5 ${
                        alert.priority === 'high'
                          ? 'bg-gradient-to-b from-red-500 to-rose-600'
                          : alert.priority === 'medium'
                          ? 'bg-gradient-to-b from-amber-400 to-orange-500'
                          : 'bg-gradient-to-b from-emerald-400 to-teal-500'
                      }`}
                    />

                    <div className="flex items-start gap-4">
                      {/* Icon Badge */}
                      <div
                        className={`p-3 rounded-xl shrink-0 ${
                          alert.priority === 'high'
                            ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200/50'
                            : alert.priority === 'medium'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/50'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Content Details */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-gray-900 dark:text-white text-base tracking-tight">
                              {alert.title}
                            </h3>
                            {isUnread && (
                              <span className="px-2.5 py-0.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-sm">
                                NEW
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                                alert.priority === 'high'
                                  ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                                  : alert.priority === 'medium'
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                  : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                              }`}
                            >
                              {alert.priority} Urgency
                            </span>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAlert(alertId);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition cursor-pointer"
                            title="Dismiss Notification"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="text-sm text-gray-700 dark:text-slate-200 leading-relaxed font-normal">
                          {alert.message}
                        </p>

                        <div className="flex items-center justify-between pt-2 text-xs border-t border-gray-100 dark:border-slate-700/60 mt-3">
                          <div className="flex items-center gap-1.5 text-gray-400 dark:text-slate-400 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{formatDate(alert.createdAt)}</span>
                          </div>

                          {alert.actionUrl && (
                            <a
                              href={alert.actionUrl}
                              onClick={(e) => e.stopPropagation()}
                              className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white border border-indigo-200/60 dark:border-indigo-800/60 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                            >
                              Take Action <ArrowRight className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Settings Panel Column (Shows when toggled) */}
        {showSettings && (
          <div className="lg:col-span-1 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-md">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-600" />
                Alert Settings
              </h2>
              {hasChanges && (
                <button
                  onClick={handleSaveSettings}
                  disabled={saveStatus === 'saving'}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer shadow"
                >
                  {saveStatus === 'saving' ? 'Saving...' : 'Save Settings'}
                </button>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-gray-100 dark:border-slate-700 p-5 space-y-5">
              {alertSettings.map((setting) => (
                <div key={setting.id} className="space-y-3 pb-4 border-b border-gray-100 dark:border-slate-700/60 last:border-b-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-xs">{setting.title}</h3>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 leading-relaxed">{setting.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={setting.enabled}
                        onChange={() => handleToggleAlert(setting.id)}
                      />
                      <div className="w-10 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {setting.threshold !== undefined && setting.enabled && (
                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1 flex justify-between">
                        <span>Spending Alert Threshold:</span>
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{setting.threshold}% of Income</span>
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={setting.threshold}
                        onChange={(e) => handleThresholdChange(setting.id, parseInt(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                        <span>10%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Custom Reminder Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Create Custom Bill Reminder
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomReminder} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">
                  Reminder Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. House Rent Payment / Credit Card Due / SIP Outflow"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">
                  Alert Message / Notes
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Pay ₹15,000 for monthly apartment rent before due date."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">
                    Alert Type
                  </label>
                  <select
                    value={customType}
                    onChange={(e: any) => setCustomType(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="bill">Bill / Payment Reminder</option>
                    <option value="budget">Budget Warning</option>
                    <option value="goal">Goal Progress</option>
                    <option value="system">System Notice</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">
                    Priority Level
                  </label>
                  <select
                    value={customPriority}
                    onChange={(e: any) => setCustomPriority(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="high">High Priority (Urgent)</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority (Info)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={customDueDate}
                  onChange={(e) => setCustomDueDate(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-slate-400 text-xs font-medium hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow cursor-pointer"
                >
                  Create Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}