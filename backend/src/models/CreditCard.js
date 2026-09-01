import mongoose from 'mongoose';

const creditCardSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    cardName: {
      type: String,
      required: true,
      trim: true,
    },
    bankName: {
      type: String,
      required: true,
      trim: true,
    },
    last4: {
      type: String,
      required: true,
      length: 4,
    },
    creditLimit: {
      type: Number,
      required: true,
      min: 0,
    },
    currentBalance: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    statementDate: {
      type: Number,
      required: true,
      min: 1,
      max: 31,
    },
    dueDate: {
      type: Number,
      required: true,
      min: 1,
      max: 31,
    },
    colorGradient: {
      type: String,
      default: 'from-slate-800 to-indigo-950',
    },
  },
  {
    timestamps: true,
  }
);

const CreditCard = mongoose.model('CreditCard', creditCardSchema);
export default CreditCard;
