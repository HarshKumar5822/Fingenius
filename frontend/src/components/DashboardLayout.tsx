import { useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
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
import { Footer } from './Footer';

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
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r">
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-4 border-b flex items-center gap-3">
            <img src="/logo.png" alt="FinGenius Logo" className="w-10 h-10 object-contain rounded-lg shadow-sm" />
            <div>
              <h1 className="text-lg font-extrabold text-gray-900 dark:text-white leading-tight">FinGenius</h1>
              {currentUser && (
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">{currentUser.name}</p>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gray-50 dark:bg-slate-950 flex flex-col min-h-screen">
        <div className="flex-1">
          <Outlet />
        </div>
        <Footer variant="dashboard" />
      </div>

      {/* Floating AI Tutor Chatbot */}
      <FloatingAIChat />
    </div>
  );
}