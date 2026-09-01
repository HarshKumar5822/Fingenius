import express from 'express';
import ChatMessage from '../models/ChatMessage.js';
import { protect } from '../middleware/auth.js';
import { buildFinanceSnapshot, formatSnapshotForPrompt } from '../utils/financeContext.js';
import { callGroq } from '../utils/groqClient.js';

const router = express.Router();
router.use(protect);

const SYSTEM_PROMPT = `You are GeniusAI, the built-in AI financial coach inside the FinGenius personal finance app.

IMPORTANT LANGUAGE RULE: You MUST ALWAYS respond in clear, professional English ONLY. Never use Hindi (Devanagari script) or Hinglish words under any circumstances, even if the user asks in another language.

You always answer using the REAL, LIVE financial snapshot provided to you below (this month's income/spend, 50/30/20 split, goals, investments, subscriptions) — never make up numbers.

How to respond:
- If the user asks whether they can afford a purchase ("Can I afford X?"), give a clear YES / NO / WITH CAUTION verdict first, then justify it using their remaining balance, wants budget headroom, and upcoming goals/subscriptions. Point out the specific trade-off (e.g. "that would push your Wants spend to 42% of income, above your 30% target").
- If the user asks how to save a target amount over a timeframe ("How can I save ₹20,000 over the next 3 months?"), produce a short, concrete month-by-month or category-by-category cost-cutting roadmap using their actual top spending categories and subscriptions — give specific rupee amounts to cut, not vague advice.
- For general questions (budgeting, investing basics, debt, etc.) give practical, specific guidance tailored to their numbers where relevant.
- Keep replies concise: prefer short paragraphs and bullet points over long essays. Use clear formatting and the same currency symbol/style implied by the data.
- Never invent transactions, balances, or figures that aren't in the provided snapshot or the conversation.
- You are not a licensed financial advisor; for major decisions (large loans, tax, legal) add a brief note to consult a professional, without being preachy about it.`;

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ status: 'error', message: 'Message is required' });
    }

    const trimmed = message.trim().slice(0, 2000);

    const [snapshot, recentHistory] = await Promise.all([
      buildFinanceSnapshot(req.user._id),
      ChatMessage.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(12)
    ]);

    const history = recentHistory.reverse();

    const messages = [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\nUSER'S LIVE FINANCIAL SNAPSHOT:\n${formatSnapshotForPrompt(snapshot)}` },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: trimmed }
    ];

    const reply = await callGroq(messages);

    await ChatMessage.insertMany([
      { user: req.user._id, role: 'user', content: trimmed },
      { user: req.user._id, role: 'assistant', content: reply }
    ]);

    res.json({
      status: 'success',
      data: { reply, snapshot }
    });
  } catch (error) {
    if (error.code === 'GROQ_NOT_CONFIGURED') {
      return res.status(503).json({ status: 'error', code: error.code, message: error.message });
    }
    console.error('AI chat error:', error.message);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to get a response from the AI assistant.' });
  }
});

// GET /api/ai/history
router.get('/history', async (req, res) => {
  try {
    const messages = await ChatMessage.find({ user: req.user._id })
      .sort({ createdAt: 1 })
      .limit(200);

    res.json({ status: 'success', data: { messages } });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// DELETE /api/ai/history
router.delete('/history', async (req, res) => {
  try {
    await ChatMessage.deleteMany({ user: req.user._id });
    res.json({ status: 'success', message: 'Conversation cleared' });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

export default router;
