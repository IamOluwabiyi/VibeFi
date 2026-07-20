/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  ArrowDownLeft, 
  ArrowUpRight, 
  TrendingUp, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  HelpCircle,
  QrCode,
  Smartphone,
  Copy
} from 'lucide-react';
import { Transaction, UserProfile } from '../types';
import TransactionHistory from './TransactionHistory';

interface HomeTabProps {
  triggerToast: (message: string, type: 'success' | 'warning' | 'danger' | 'info') => void;
  savingsBalance: number;
  setSavingsBalance: (bal: number) => void;
}

export default function HomeTab({ triggerToast, savingsBalance, setSavingsBalance }: HomeTabProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Deposit state
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  const fetchHomeData = async () => {
    try {
      const pRes = await fetch('/api/user/profile');
      if (pRes.ok) {
        const pData = await pRes.json();
        setProfile(pData.userProfile);
        setSavingsBalance(pData.userProfile.savingsBalance);
      }
      
      const tRes = await fetch('/api/user/transactions');
      if (tRes.ok) {
        const tData = await tRes.json();
        setTransactions(tData);
      }
    } catch (err) {
      console.error('Failed to load home data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, []);

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      triggerToast('Please enter a valid deposit amount.', 'warning');
      return;
    }

    setDepositing(true);
    try {
      const response = await fetch('/api/user/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, bankName: 'Wema Bank Sandbox' })
      });

      if (response.ok) {
        const json = await response.json();
        triggerToast(`Successfully credited ₦${amount.toLocaleString()} to savings!`, 'success');
        setDepositAmount('');
        setShowPayModal(false);
        fetchHomeData();
      } else {
        const err = await response.json();
        triggerToast(err.error || 'Deposit failed.', 'danger');
      }
    } catch (err) {
      console.error('Error funding savings', err);
      triggerToast('Communication failure with Monnify sandbox.', 'danger');
    } finally {
      setDepositing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerToast('Account number copied to clipboard!', 'success');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Upper stats card (No gradients) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Savings Balance */}
        <div id="savings-balance-card" className="lg:col-span-2 bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dynamic Savings Balance</span>
              <span className="inline-flex items-center gap-1 bg-slate-800 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-700">
                <ShieldCheck className="h-3 w-3" /> Monnify Insured
              </span>
            </div>
            <div className="mt-4">
              <h1 className="text-4xl md:text-5xl font-bold font-mono tracking-tight text-white">
                ₦{savingsBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </h1>
              <p className="text-xs text-slate-400 mt-2">Personal savings ledger synced in real-time with your Monnify reserved account.</p>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              id="wallet-deposit-trigger-btn"
              onClick={() => setShowPayModal(true)}
              className="flex-1 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowDownLeft className="h-4.5 w-4.5 text-emerald-600" />
              <span>Fund Savings Wallet</span>
            </button>
          </div>
        </div>

        {/* Reserved Virtual Account Details */}
        <div id="reserved-account-card" className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-4">Your Monnify Reserved Account</span>
            
            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Primary Partner Bank</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">Wema Bank (Sandbox)</span>
              </div>
              
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Account Number</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-base">9920184712</span>
                  <button 
                    onClick={() => copyToClipboard('9920184712')}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Account Name</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">VBF - Daniel Oyediran</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 flex items-center justify-between text-[10px] font-semibold text-slate-400">
            <span>Status: <span className="text-emerald-500 font-bold uppercase">Active</span></span>
            <span>Real-time Settling</span>
          </div>
        </div>

      </div>

      {/* Quick stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
            <ArrowDownLeft className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Inflows (This Month)</span>
            <span className="font-bold text-lg text-slate-900 dark:text-white font-mono">₦{transactions.filter(t => t.type === 'deposit' || t.type === 'payout').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
            <ArrowUpRight className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Outflows (Saved to Circles)</span>
            <span className="font-bold text-lg text-slate-900 dark:text-white font-mono">₦{Math.abs(transactions.filter(t => t.type === 'contribution').reduce((sum, t) => sum + t.amount, 0)).toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Financial Health (Vibe Score)</span>
            <span className="font-bold text-lg text-slate-900 dark:text-white font-mono">820 / 1000</span>
          </div>
        </div>
      </div>

      {/* Transaction list */}
      <TransactionHistory 
        initialTransactions={transactions} 
        onRefresh={fetchHomeData} 
        triggerToast={triggerToast} 
      />

      {/* Pay Modal/Dialog for simulating payment via Webhook */}
      {showPayModal && (
        <div id="webhook-payment-modal" className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Fund Savings Wallet (Simulator)</h3>
              <button 
                onClick={() => setShowPayModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-sm font-semibold p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Funding in production uses real-time Wema Bank reserved accounts through Monnify. Since we are in the Sandbox environment, you can specify an amount to simulate an incoming bank transfer webhook instantly.
            </p>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Enter Deposit Amount (₦)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono">₦</span>
                  <input
                    id="deposit-amount-input"
                    type="number"
                    required
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="50,000"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-8 pr-4 text-xs font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Monnify Callback Payload Data</span>
                <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                  <span>Callback Type:</span>
                  <span className="font-mono">ACCOUNT_TRANSACTION</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                  <span>Signature:</span>
                  <span className="font-mono text-slate-400">sandbox-simulated-key</span>
                </div>
              </div>

              <button
                id="deposit-simulate-btn"
                type="submit"
                disabled={depositing}
                className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {depositing ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                ) : (
                  <>
                    <CheckCircle2 className="h-4.5 w-4.5" />
                    <span>Trigger Monnify Sandbox Webhook</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
