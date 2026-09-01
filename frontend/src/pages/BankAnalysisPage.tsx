import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Gauge,
  RefreshCw,
  Trash2,
  Clock,
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { toast } from 'sonner';
import { bankStatementService, AnalysisResult, BankStatement } from '../services/api';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const PIE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#f43f5e', '#84cc16', '#0ea5e9', '#a855f7',
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

const healthLabel = (score: number) => {
  if (score >= 80) return { text: 'Excellent', color: 'text-emerald-500', ring: 'stroke-emerald-500' };
  if (score >= 60) return { text: 'Good', color: 'text-blue-500', ring: 'stroke-blue-500' };
  if (score >= 40) return { text: 'Needs Attention', color: 'text-amber-500', ring: 'stroke-amber-500' };
  return { text: 'At Risk', color: 'text-red-500', ring: 'stroke-red-500' };
};

function HealthGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const label = healthLabel(clamped);

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r={radius} strokeWidth="10" className="stroke-gray-100 dark:stroke-slate-700" fill="none" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          strokeWidth="10"
          strokeLinecap="round"
          className={`${label.ring} transition-all duration-700`}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="-mt-[76px] flex flex-col items-center">
        <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{clamped}</span>
        <span className="text-[10px] text-gray-400 dark:text-slate-500">/ 100</span>
      </div>
      <p className={`mt-6 text-sm font-semibold ${label.color}`}>{label.text}</p>
    </div>
  );
}

export default function BankAnalysisPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [activeFileName, setActiveFileName] = useState<string>('');
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [loadingStatements, setLoadingStatements] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStatements = useCallback(async () => {
    try {
      setLoadingStatements(true);
      const response = await bankStatementService.getAll();
      setStatements(response.data.bankStatements);

      const latestCompleted = response.data.bankStatements.find((s) => s.status === 'completed' && s.analysis);
      if (latestCompleted?.analysis) {
        setAnalysis(latestCompleted.analysis);
        setActiveFileName(latestCompleted.fileName);
      }
    } catch (err) {
      console.error('Error loading statements:', err);
    } finally {
      setLoadingStatements(false);
    }
  }, []);

  useEffect(() => {
    loadStatements();
  }, [loadStatements]);

  const validateAndSetFile = (selectedFile: File | undefined | null) => {
    if (!selectedFile) return;
    const isPDF = selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');
    const isCSV = selectedFile.type === 'text/csv' || selectedFile.name.toLowerCase().endsWith('.csv');
    if (isPDF || isCSV) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File is too large. Maximum size is 10MB.');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please upload a PDF or CSV file');
      setFile(null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    validateAndSetFile(event.target.files?.[0]);
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    validateAndSetFile(event.dataTransfer.files?.[0]);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const response = await bankStatementService.upload(file);
      if (response.data.bankStatement.status === 'failed') {
        throw new Error(response.data.bankStatement.errorMessage || 'Analysis failed');
      }
      setAnalysis(response.data.bankStatement.analysis || null);
      setActiveFileName(response.data.bankStatement.fileName);
      toast.success('Statement analyzed successfully!');
      await loadStatements();
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      const msg = err?.message || 'Failed to analyze statement. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewStatement = (statement: BankStatement) => {
    if (statement.status !== 'completed' || !statement.analysis) {
      toast.error(statement.errorMessage || 'This statement has no analysis available.');
      return;
    }
    setAnalysis(statement.analysis);
    setActiveFileName(statement.fileName);
  };

  const handleDeleteStatement = async (id: string) => {
    try {
      await bankStatementService.delete(id);
      toast.success('Statement removed');
      await loadStatements();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete statement');
    }
  };

  const pieData = analysis && analysis.topCategories.length > 0
    ? {
        labels: analysis.topCategories.map((c) => c.category),
        datasets: [
          {
            data: analysis.topCategories.map((c) => c.amount),
            backgroundColor: PIE_COLORS,
            borderWidth: 0,
          },
        ],
      }
    : null;

  const barData = analysis && analysis.monthlyTrend.length > 0
    ? {
        labels: analysis.monthlyTrend.map((m) => m.month),
        datasets: [
          {
            label: 'Income',
            data: analysis.monthlyTrend.map((m) => m.income),
            backgroundColor: '#10b981',
            borderRadius: 6,
          },
          {
            label: 'Expenses',
            data: analysis.monthlyTrend.map((m) => m.expenses),
            backgroundColor: '#f43f5e',
            borderRadius: 6,
          },
        ],
      }
    : null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <FileText className="w-7 h-7 text-indigo-600" />
          Bank Statement Analysis
        </h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">
          Upload a statement and let GeniusAI read, categorize, and report on it for you.
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-md space-y-4">
        <div className="flex items-center justify-center w-full">
          <label
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center w-full h-56 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50 dark:bg-slate-700'
                : 'border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-10 h-10 mb-3 text-indigo-500" />
              <p className="mb-1 text-sm text-gray-600 dark:text-slate-300">
                <span className="font-semibold text-gray-900 dark:text-white">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500">PDF or CSV (MAX. 10MB)</p>
              {file && (
                <div className="flex items-center mt-4 text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                  <FileText className="w-4 h-4 mr-2" />
                  {file.name}
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.csv"
              onChange={handleFileChange}
            />
          </label>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 px-4 py-3 rounded-xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="w-full bg-indigo-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isUploading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              GeniusAI is reading your statement...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Analyze with GeniusAI
            </>
          )}
        </button>
      </div>

      {/* Previous Statements */}
      {!loadingStatements && statements.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-md">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Previous Statements
          </h2>
          <div className="space-y-2">
            {statements.map((statement) => (
              <div
                key={statement._id}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors ${
                  activeFileName === statement.fileName
                    ? 'border-indigo-300 bg-indigo-50 dark:bg-slate-700 dark:border-indigo-500'
                    : 'border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 dark:text-white truncate">{statement.fileName}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
                      {new Date(statement.uploadDate).toLocaleDateString()}
                      {statement.status === 'failed' && (
                        <span className="text-red-500 font-medium">· Failed</span>
                      )}
                      {statement.status === 'processing' && (
                        <span className="text-amber-500 font-medium">· Processing</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => handleViewStatement(statement)}
                    className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 text-sm font-medium"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDeleteStatement(statement._id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          {activeFileName && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
              <span>Showing analysis for</span>
              <span className="font-semibold text-gray-800 dark:text-white">{activeFileName}</span>
              <button
                onClick={loadStatements}
                className="ml-auto flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 text-xs font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>
          )}

          {/* AI Summary */}
          {analysis.summary && (
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
              <div className="relative z-10 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-purple-200" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">GeniusAI Report</h3>
                  <p className="text-indigo-100 text-sm leading-relaxed">{analysis.summary}</p>
                </div>
              </div>
            </div>
          )}

          {/* Summary Cards + Health Gauge */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-md">
              <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-sm font-medium mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Total Income
              </div>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(analysis.totalIncome)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-md">
              <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-sm font-medium mb-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                Total Expenses
              </div>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(analysis.totalExpenses)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-md">
              <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-sm font-medium mb-2">
                <PiggyBank className="w-4 h-4 text-indigo-500" />
                Net Savings
              </div>
              <p className="text-2xl font-bold text-indigo-600">{formatCurrency(analysis.netSavings)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-md flex items-center justify-center">
              <HealthGauge score={analysis.healthScore} />
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {pieData && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-indigo-600" />
                  Spending by Category
                </h3>
                <div className="max-w-xs mx-auto">
                  <Pie
                    data={pieData}
                    options={{
                      plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
                        tooltip: {
                          callbacks: {
                            label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.parsed as number)}`,
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            )}

            {barData && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  Income vs Expenses
                </h3>
                <Bar
                  data={barData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y as number)}`,
                        },
                      },
                    },
                    scales: {
                      y: { ticks: { callback: (v) => formatCurrency(Number(v)) } },
                    },
                  }}
                />
              </div>
            )}
          </div>

          {/* Recurring Expenses */}
          {analysis.recurringExpenses.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recurring Expenses Detected</h3>
              <div className="space-y-3">
                {analysis.recurringExpenses.map((expense, index) => (
                  <div key={index} className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">{expense.description}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">{expense.frequency}</p>
                    </div>
                    <p className="font-semibold text-gray-800 dark:text-white">{formatCurrency(expense.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Categories (progress bars) */}
          {analysis.topCategories.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Spending Categories</h3>
              <div className="space-y-4">
                {analysis.topCategories.map((category, index) => (
                  <div key={index} className="space-y-1.5">
                    <div className="flex justify-between items-center text-sm">
                      <p className="font-medium text-gray-700 dark:text-slate-200">{category.category}</p>
                      <p className="font-medium text-gray-700 dark:text-slate-200">
                        {formatCurrency(category.amount)} · {Math.round(category.percentage)}%
                      </p>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="rounded-full h-2 transition-all"
                        style={{
                          width: `${Math.min(100, category.percentage)}%`,
                          backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {analysis.suggestions.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                GeniusAI Suggestions
              </h3>
              <div className="space-y-3">
                {analysis.suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700 dark:text-slate-200 text-sm">{suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
