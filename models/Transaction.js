const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionId: { // paypal transactionid
      type: String,
      required: true,
      unique: true, 
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users', 
    },
    amount: {
      type: Number,
      required: true,
    },
    method: {
      type: String,
      enum: ['PayPal', 'Credit Card', 'Bank Transfer'],
    },
    currency: {
      type: String,
      default: 'USD', 
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    items: [
      {
        name: { type: String, required: true }, // crystal, coins, packages
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }, 
      },
    ],
  },
  {
    timestamps: true, 
  }
);

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
