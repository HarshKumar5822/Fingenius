import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import { DashboardLayout } from './components/DashboardLayout';
import PrivateRoute from './components/PrivateRoute';
import ExpensesPage from './pages/ExpensesPage';
import OverviewPage from './pages/OverviewPage';
import GoalsPage from './pages/GoalsPage';
import AlertsPage from './pages/AlertsPage';
import SettingsPage from './pages/SettingsPage';
import BankAnalysisPage from './pages/BankAnalysisPage';
import Rule503020Page from './pages/Rule503020Page';
import FamilyCirclePage from './pages/FamilyCirclePage';
import InvestmentsPage from './pages/InvestmentsPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import AIAssistantPage from './pages/AIAssistantPage';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        
        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="ai-assistant" element={<AIAssistantPage />} />
          <Route path="rule-503020" element={<Rule503020Page />} />
          <Route path="family-circle" element={<FamilyCirclePage />} />
          <Route path="investments" element={<InvestmentsPage />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="bank-analysis" element={<BankAnalysisPage />} />
        </Route>
      </Routes>
    </Router>
  );
} 