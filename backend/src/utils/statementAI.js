import { callGroq } from './groqClient.js';

const ANALYSIS_SYSTEM_PROMPT = `You are GeniusAI's bank statement analysis engine inside the FinGenius app.

You will be given raw text extracted from a user's uploaded bank statement (PDF or CSV). This text may be messy (columns misaligned, currency symbols, running balances mixed in). Do your best to identify individual transactions (date, description, amount, credit/debit) from it.

Respond with STRICT JSON ONLY — no markdown fences, no commentary before or after — matching exactly this shape:

{
  "totalIncome": number,
  "totalExpenses": number,
  "netSavings": number,
  "healthScore": number,               // 0-100, your assessment of overall financial health shown in this statement
  "summary": string,                   // 2-4 sentence plain-English narrative overview of what this statement shows
  "topCategories": [
    { "category": string, "amount": number, "percentage": number }
  ],                                   // top 5-8 spending categories you infer from the transaction descriptions, percentage of totalExpenses
  "recurringExpenses": [
    { "description": string, "amount": number, "frequency": "Monthly" | "Weekly" | "Yearly" }
  ],                                   // subscriptions/bills/EMIs you can identify as recurring, empty array if none found
  "monthlyTrend": [
    { "month": string, "income": number, "expenses": number }
  ],                                   // if the statement spans multiple months, break income/expenses down by month (format month as "Jan 2026"); if it's a single month, return a single entry
  "suggestions": [string]              // 3-5 short, specific, actionable money-saving or budgeting suggestions grounded in the actual data
}

Rules:
- Use real numbers you can infer from the text. Never fabricate transactions that clearly aren't there.
- If income/expense totals can't be perfectly determined, give your best reasonable estimate rather than zeros.
- percentage values in topCategories should roughly sum to 100.
- Keep the JSON valid and parseable — no trailing commas, no comments.`;

const tryParseJSON = (raw) => {
  if (!raw) return null;
  // Strip markdown code fences if the model added them despite instructions
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Attempt to salvage the outermost JSON object
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
};

const sanitizeAnalysis = (data) => {
  const num = (v, fallback = 0) => (typeof v === 'number' && !Number.isNaN(v) ? v : fallback);
  const totalIncome = num(data.totalIncome);
  const totalExpenses = num(data.totalExpenses);

  return {
    totalIncome,
    totalExpenses,
    netSavings: num(data.netSavings, totalIncome - totalExpenses),
    healthScore: Math.max(0, Math.min(100, Math.round(num(data.healthScore, 50)))),
    summary: typeof data.summary === 'string' ? data.summary : '',
    topCategories: Array.isArray(data.topCategories)
      ? data.topCategories
          .filter((c) => c && c.category)
          .map((c) => ({
            category: String(c.category),
            amount: num(c.amount),
            percentage: num(c.percentage)
          }))
      : [],
    recurringExpenses: Array.isArray(data.recurringExpenses)
      ? data.recurringExpenses
          .filter((r) => r && r.description)
          .map((r) => ({
            description: String(r.description),
            amount: num(r.amount),
            frequency: ['Monthly', 'Weekly', 'Yearly'].includes(r.frequency) ? r.frequency : 'Monthly'
          }))
      : [],
    monthlyTrend: Array.isArray(data.monthlyTrend)
      ? data.monthlyTrend
          .filter((m) => m && m.month)
          .map((m) => ({
            month: String(m.month),
            income: num(m.income),
            expenses: num(m.expenses)
          }))
      : [],
    suggestions: Array.isArray(data.suggestions)
      ? data.suggestions.filter((s) => typeof s === 'string' && s.trim()).slice(0, 6)
      : []
  };
};

/**
 * Sends extracted statement text to Groq and returns a validated analysis object.
 */
export const analyzeStatementText = async (statementText, currency = 'INR') => {
  const messages = [
    { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Currency: ${currency}\n\nHere is the extracted bank statement text:\n\n${statementText}`
    }
  ];

  const raw = await callGroq(messages, { temperature: 0.2, maxTokens: 1800 });
  const parsed = tryParseJSON(raw);

  if (!parsed) {
    const err = new Error('The AI could not produce a structured analysis for this statement. Please try again or upload a clearer file.');
    err.code = 'AI_PARSE_FAILED';
    throw err;
  }

  return sanitizeAnalysis(parsed);
};
