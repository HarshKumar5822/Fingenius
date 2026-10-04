import { useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  DollarSign,
  Target,
  Bell,
  Settings,
  LogOut,
  FileText,
  PieChart,
  Users,
  TrendingUp,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { authService } from '../services/api';
import { FloatingAIChat } from './FloatingAIChat';

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { path: '/dashboard/ai-assistant', icon: Sparkles, label: 'GeniusAI Assistant' },
  { path: '/dashboard/rule-503020', icon: PieChart, label: '50/30/20 Rule' },
  { path: '/dashboard/family-circle', icon: Users, label: 'Family Circle' },
  { path: '/dashboard/investments', icon: TrendingUp, label: 'Investments' },
  { path: '/dashboard/subscriptions', icon: CreditCard, label: 'Subscriptions & Cards' },
  { path: '/dashboard/expenses', icon: DollarSign, label: 'Expenses' },
  { path: '/dashboard/goals', icon: Target, label: 'Goals' },
  { path: '/dashboard/bank-analysis', icon: FileText, label: 'Bank Analysis' },
  { path: '/dashboard/alerts', icon: Bell, label: 'Alerts' },
  { path: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const user = authService.getCurrentUser();
    const isDark = savedTheme === 'dark' || user?.settings?.theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const handleLogout = () => {
    authService.logout();
    document.documentElement.classList.remove('dark');
    navigate('/login');
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-gray-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      {/* Sidebar */}
      <aside className="w-60 h-screen flex-none bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col justify-between z-20 shadow-sm">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo */}
          <div className="p-3.5 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2.5">
            <img src="/logo.png" alt="FinGenius Logo" className="w-8 h-8 object-contain rounded-lg shadow-sm" />
            <div className="overflow-hidden">
              <h1 className="text-base font-black text-gray-900 dark:text-white leading-tight tracking-tight">FinGenius</h1>
              {currentUser && (
                <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium truncate">{currentUser.name}</p>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-2.5 space-y-1 no-scrollbar">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 font-bold'
                      : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/80 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className="p-3 border-t border-gray-100 dark:border-slate-800">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2.5 w-full px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area: Desktop Viewport Fit */}
      <main className="flex-1 h-screen overflow-y-auto lg:overflow-y-auto bg-gray-50 dark:bg-slate-950 relative flex flex-col">
        <div className="flex-1 p-3 md:p-5 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Floating AI Assistant Chatbot */}
      <FloatingAIChat />
    </div>
  );
}