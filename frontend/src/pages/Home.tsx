import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  BarChart,
  Wallet,
  Target,
  PiggyBank,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';

import { Footer } from '../components/Footer';

export default function Home() {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      title: 'Expense Tracking',
      description: 'Track all your expenses in real-time with detailed categorization and insights.',
      icon: LineChart,
      color: 'bg-blue-500',
      stats: ['500K+ Transactions', '50+ Categories', 'Real-time Updates'],
    },
    {
      title: 'Smart Savings',
      description: 'Set and achieve your savings goals with intelligent recommendations.',
      icon: PiggyBank,
      color: 'bg-green-500',
      stats: ['$2M+ Saved', '90% Goal Success', 'Smart Alerts'],
    },
    {
      title: 'Financial Goals',
      description: 'Create and track your financial goals with visual progress tracking.',
      icon: Target,
      color: 'bg-purple-500',
      stats: ['Custom Goals', 'Progress Tracking', 'Goal Insights'],
    },
    {
      title: 'Budget Analytics',
      description: 'Get detailed insights into your spending patterns and budget allocation.',
      icon: BarChart,
      color: 'bg-orange-500',
      stats: ['Monthly Reports', 'Trend Analysis', 'Custom Budgets'],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Your Personal{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
                Finance Genius
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              AI-powered financial management that helps you track expenses, save smarter, and reach your
              financial goals.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                to="/signup"
                className="px-8 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Get Started Free
              </Link>
              <Link
                to="/login"
                className="px-8 py-3 bg-white text-gray-700 rounded-lg font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>

        {/* Floating Icons Animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 left-1/4 w-12 h-12 text-blue-500 animate-float">
            <Wallet className="w-full h-full" />
          </div>
          <div className="absolute top-1/3 right-1/4 w-10 h-10 text-green-500 animate-float-delayed">
            <PiggyBank className="w-full h-full" />
          </div>
          <div className="absolute bottom-1/4 left-1/3 w-8 h-8 text-purple-500 animate-float">
            <Target className="w-full h-full" />
          </div>
          <div className="absolute top-1/2 right-1/3 w-10 h-10 text-orange-500 animate-float-delayed">
            <TrendingUp className="w-full h-full" />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Powerful Features</h2>
          <p className="text-gray-600">
            FinGenius combines AI intelligence with user-friendly design to make financial management
            effortless.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Feature Cards */}
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`p-6 rounded-xl transition-all cursor-pointer ${
                  activeFeature === index
                    ? 'bg-white shadow-lg scale-105'
                    : 'bg-gray-50 hover:bg-white hover:shadow'
                }`}
                onClick={() => setActiveFeature(index)}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${feature.color} text-white`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                    <p className="text-gray-600 text-sm">{feature.description}</p>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      activeFeature === index ? 'rotate-90' : ''
                    }`}
                  />
                </div>
                {activeFeature === index && (
                  <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                    {feature.stats.map((stat) => (
                      <div key={stat} className="text-center">
                        <p className="text-sm font-medium text-gray-900">{stat}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Feature Preview */}
          <div className="bg-white rounded-2xl shadow-xl p-8 relative min-h-[400px] hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-blue-50 rounded-2xl" />
            <div className="relative">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {features[activeFeature].title}
              </h3>
              <p className="text-gray-600 mb-8">{features[activeFeature].description}</p>
              <div className="grid grid-cols-2 gap-4">
                {features[activeFeature].stats.map((stat) => (
                  <div
                    key={stat}
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-100"
                  >
                    <p className="text-sm font-medium text-gray-900">{stat}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-primary to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Take Control of Your Finances?</h2>
          <p className="text-lg text-white/80 mb-8">
            Join thousands of users who are already saving money and spending smarter with FinGenius.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center px-8 py-3 bg-white text-primary rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Get Started <ChevronRight className="ml-2 w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <Footer variant="landing" />
    </div>
  );
} 