/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Unlock, 
  Plus, 
  Calendar, 
  ShieldCheck, 
  TrendingUp, 
  Smartphone, 
  ArrowRight,
  Copy,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { LockedVault } from '../types';

interface LockedTabProps {
  triggerToast: (message: string, type: 'success' | 'warning' | 'danger' | 'info') => void;
  savingsBalance: number;
  setSavingsBalance: (bal: number) => void;
}

export default function LockedTab({ triggerToast, savingsBalance, setSavingsBalance }: LockedTabProps) {
  const [vaults, setVaults] = useState<LockedVault[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVault, setActiveVault] = useState<LockedVault | null>(null);

  // New Vault Form State
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  // Simulation Form State
  const [fundAmount, setFundAmount] = useState('');
  const [simulatingFund, setSimulatingFund] = useState(false);
  const [releasing, setReleasing] = useState(false);

  // Savings Suggestion State
  const [suggestion, setSuggestion] = useState<{
    text: string;
    amount: number;
    frequency: 'daily' | 'weekly' | 'monthly';
  } | null>(null);

  const fetchTransactionsForSuggestion = async () => {
    try {
      const response = await fetch('/api/user/transactions');
      if (response.ok) {
        const txs = await response.json();
        const contributionTxs = txs.filter((t: any) => t.type === 'contribution' && t.status === 'completed');
        if (contributionTxs.length > 0) {
          const amounts = contributionTxs.map((t: any) => Math.abs(t.amount));
          const avgContribution = amounts.reduce((sum: number, val: number) => sum + val, 0) / amounts.length;
          const weeklyAmount = Math.round(avgContribution / 4);
          setSuggestion({
            text: `Based on your recent Ajo contributions, ₦${weeklyAmount.toLocaleString()}/week fits your pattern.`,
            amount: avgContribution,
            frequency: 'weekly'
          });
        }
      }
    } catch (err) {
      console.error('Failed to calculate savings suggestions', err);
    }
  };

  const fetchVaults = async () => {
    try {
      const response = await fetch('/api/collaborative/vaults');
      if (response.ok) {
        const data = await response.json();
        setVaults(data);
        if (data.length > 0) {
          const match = data.find((v: LockedVault) => v.id === activeVault?.id);
          setActiveVault(match || data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load vaults', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVaults();
    fetchTransactionsForSuggestion();
    const interval = setInterval(() => {
      fetchVaults();
      fetchTransactionsForSuggestion();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeVault?.id]);

  const handleApplySuggestion = () => {
    if (suggestion) {
      setTargetAmount(String(suggestion.amount));
      setFrequency(suggestion.frequency);
      triggerToast(`Applied suggested target amount of ₦${suggestion.amount.toLocaleString()} with ${suggestion.frequency} track!`, 'success');
    }
  };

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName || !targetAmount || !unlockDate) {
      triggerToast('All fields are required to establish a locked commitment vault.', 'warning');
      return;
    }

    const target = parseFloat(targetAmount);
    if (isNaN(target) || target <= 0) {
      triggerToast('Please provide a valid savings target.', 'warning');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (unlockDate < todayStr) {
      triggerToast('Unlock date must be in the future.', 'warning');
      return;
    }

    try {
      const response = await fetch('/api/collaborative/vaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalName,
          targetAmount: target,
          unlockDate,
          contributionFrequency: frequency
        })
      });

      if (response.ok) {
        const json = await response.json();
        triggerToast(`Locked commitment vault for "${goalName}" has been activated.`, 'success');
        setGoalName('');
        setTargetAmount('');
        setUnlockDate('');
        fetchVaults();
      } else {
        const err = await response.json();
        triggerToast(err.error || 'Failed to create locked savings vault.', 'danger');
      }
    } catch (err) {
      console.error('Error creating vault', err);
      triggerToast('Could not register vault with Monnify sandbox.', 'danger');
    }
  };

  const handleSimulateVaultFund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVault || !fundAmount) {
      triggerToast('Please enter an amount to fund this commitment.', 'warning');
      return;
    }

    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) {
      triggerToast('Please provide a valid deposit amount.', 'warning');
      return;
    }

    setSimulatingFund(true);
    try {
      const response = await fetch('/api/collaborative/pay-virtual-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          virtualAccountNo: activeVault.virtualAccount,
          amount,
          payerEmail: 'saver@vibefi.co',
          payerName: 'Primary Saver Account'
        })
      });

      if (response.ok) {
        triggerToast(`Credit of ₦${amount.toLocaleString()} received and locked securely!`, 'success');
        setFundAmount('');
        fetchVaults();
      } else {
        const err = await response.json();
        triggerToast(err.error || 'Funding failed.', 'danger');
      }
    } catch (err) {
      console.error('Error funding vault', err);
      triggerToast('Sandbox communication failed.', 'danger');
    } finally {
      setSimulatingFund(false);
    }
  };

  const handleReleaseVault = async () => {
    if (!activeVault) return;

    setReleasing(true);
    try {
      const response = await fetch(`/api/collaborative/vaults/${activeVault.id}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const json = await response.json();
        triggerToast(`Savings Disbursed! ₦${activeVault.raisedAmount.toLocaleString()} credited back to your primary savings.`, 'success');
        // Update global wallet balance dynamically
        setSavingsBalance(savingsBalance + activeVault.raisedAmount);
        fetchVaults();
      } else {
        const err = await response.json();
        // Displays precise server lock protection error beautifully
        triggerToast(err.error || 'Withdrawal rejected.', 'danger');
      }
    } catch (err) {
      console.error('Error disbursing savings', err);
      triggerToast('Could not complete withdrawal transaction.', 'danger');
    } finally {
      setReleasing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerToast('Vault reserved account copied!', 'success');
  };

  const isLocked = (vault: LockedVault) => {
    const todayStr = new Date().toISOString().split('T')[0];
    return todayStr < vault.unlockDate && vault.status !== 'released';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      
      {/* Vault list & Create form */}
      <div className="space-y-6">
        
        {/* Active commitments */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Locked Target Vaults</h3>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold px-2 py-0.5 rounded-full">
              {vaults.length} Total
            </span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto">
            {vaults.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No commitment vaults found. Lock up some savings below!</p>
            ) : (
              vaults.map((v) => {
                const isActive = activeVault?.id === v.id;
                const lockedState = isLocked(v);
                const progress = (v.raisedAmount / v.targetAmount) * 100;
                return (
                  <button
                    key={v.id}
                    id={`vault-selector-${v.id}`}
                    onClick={() => setActiveVault(v)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer block ${
                      isActive 
                        ? 'border-[#2563EB] bg-slate-50 dark:bg-slate-950/40' 
                        : 'border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-950/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate pr-2">{v.goalName}</span>
                      <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        v.status === 'released'
                          ? 'bg-emerald-50 text-emerald-600'
                          : lockedState 
                          ? 'bg-amber-50 text-amber-600' 
                          : 'bg-blue-50 text-blue-600'
                      }`}>
                        {v.status === 'released' ? (
                          <span>Released</span>
                        ) : lockedState ? (
                          <>
                            <Lock className="h-2.5 w-2.5" />
                            <span>Locked</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="h-2.5 w-2.5" />
                            <span>Matured</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mt-1.5 uppercase font-mono">
                      <span>₦{v.raisedAmount.toLocaleString()} / ₦{v.targetAmount.toLocaleString()}</span>
                      <span className="text-[9px]">{Math.round(progress)}%</span>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          v.status === 'released' ? 'bg-emerald-500' : 'bg-[#2563EB]'
                        }`} 
                        style={{ width: `${Math.min(100, progress)}%` }}
                      ></div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Savings Suggestion Card */}
        {suggestion && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                <Sparkles className="h-4.5 w-4.5 text-[#2563EB]" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">Savings Target Suggestion</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  {suggestion.text}
                </p>
              </div>
            </div>
            <button
              id="apply-suggestion-btn"
              type="button"
              onClick={handleApplySuggestion}
              className="w-full bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200 text-xs font-bold py-2 rounded-xl transition-all border border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span>Apply Suggestion</span>
            </button>
          </div>
        )}

        {/* Lock New Savings form */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4.5 w-4.5 text-[#2563EB]" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Activate Target Lock Vault</h3>
          </div>

          <form onSubmit={handleCreateVault} className="space-y-3.5">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1 uppercase">Savings Goal/Title</label>
              <input
                id="vault-goal-input"
                type="text"
                required
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="e.g., December Rent & Utilities"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1 uppercase">Savings Target (₦)</label>
              <input
                id="vault-target-input"
                type="number"
                required
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="1,500,000"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1 uppercase">Unlock Date</label>
                <input
                  id="vault-date-input"
                  type="date"
                  required
                  value={unlockDate}
                  onChange={(e) => setUnlockDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1 uppercase">Frequency Track</label>
                <select
                  id="vault-frequency-select"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="daily">Daily Track</option>
                  <option value="weekly">Weekly Track</option>
                  <option value="monthly">Monthly Track</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/60 text-[10.5px] text-slate-400 font-medium">
              ⚠️ <span className="font-bold text-slate-600 dark:text-slate-300">Commitment savings rule active:</span> money locked cannot be released or withdrawn until the mature date. No early exits allowed.
            </div>

            <button
              id="vault-create-submit-btn"
              type="submit"
              className="w-full bg-[#0F172A] dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock className="h-4 w-4 text-emerald-500" />
              <span>Deploy Commitment Vault</span>
            </button>
          </form>
        </div>

      </div>

      {/* Active vault details */}
      <div className="lg:col-span-2 space-y-6">
        {activeVault ? (
          <>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{activeVault.goalName}</h2>
                  <p className="text-xs text-slate-400 mt-1">Goal Reference ID: <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{activeVault.id}</span></p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shrink-0 flex items-center gap-4">
                  <div className="text-xs">
                    <span className="text-[9px] text-slate-400 block font-semibold uppercase">Vault Reserved Account (Monnify)</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono font-bold text-slate-800 dark:text-white text-sm">{activeVault.virtualAccount}</span>
                      <button 
                        onClick={() => copyToClipboard(activeVault.virtualAccount)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">{activeVault.bankName}</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Currently Locked</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white font-mono block mt-1">₦{activeVault.raisedAmount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Goal Target</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white font-mono block mt-1">₦{activeVault.targetAmount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Unlock Maturity Date</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white block mt-1.5 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>{new Date(activeVault.unlockDate).toLocaleDateString()}</span>
                  </span>
                </div>
              </div>

              {/* Progress and Countdown info */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-2 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Savings Strategy Tracker</span>
                <div className="grid grid-cols-3 gap-4 text-center py-1">
                  <div className="border-r border-slate-200/50 dark:border-slate-800">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Daily Goal</p>
                    <p className="font-bold font-mono mt-0.5 text-slate-800 dark:text-slate-200">₦{activeVault.dailyContribution?.toLocaleString() || '---'}</p>
                  </div>
                  <div className="border-r border-slate-200/50 dark:border-slate-800">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Weekly Goal</p>
                    <p className="font-bold font-mono mt-0.5 text-slate-800 dark:text-slate-200">₦{activeVault.weeklyContribution?.toLocaleString() || '---'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Monthly Goal</p>
                    <p className="font-bold font-mono mt-0.5 text-slate-800 dark:text-slate-200">₦{activeVault.monthlyContribution?.toLocaleString() || '---'}</p>
                  </div>
                </div>
              </div>

              {/* Withdraw Section */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-400 block">Withdraw Locked Funds</span>
                  <p className="text-[11px] text-slate-400">Withdraw matured savings directly back to your savings balance via Monnify Disbursement.</p>
                </div>

                <button
                  id="vault-withdraw-btn"
                  onClick={handleReleaseVault}
                  disabled={releasing || activeVault.status === 'released'}
                  className={`px-6 py-3 rounded-xl font-bold text-xs cursor-pointer shrink-0 transition-all ${
                    activeVault.status === 'released'
                      ? 'bg-slate-100 text-slate-400 border border-slate-200/40 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {releasing ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block"></span>
                  ) : activeVault.status === 'released' ? (
                    'Funds Disbursed'
                  ) : (
                    'Unlock & Disburse Funds'
                  )}
                </button>
              </div>

            </div>

            {/* Inbound Simulator */}
            {activeVault.status !== 'released' && (
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4.5 w-4.5 text-[#2563EB]" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Sandbox Bank Transfer Simulator</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Simulate credit transfers from external bank accounts straight to your Monnify reserved account <span className="font-mono font-semibold">{activeVault.virtualAccount}</span> to lock up additional target savings.
                </p>

                <form onSubmit={handleSimulateVaultFund} className="flex flex-col md:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                    <label className="text-[9px] font-bold text-slate-400 block mb-1 uppercase">Simulated Transfer Amount (₦)</label>
                    <input
                      id="sim-vault-fund-input"
                      type="number"
                      required
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      placeholder="100,000"
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-bold font-mono text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <button
                    id="sim-vault-fund-btn"
                    type="submit"
                    disabled={simulatingFund}
                    className="w-full md:w-auto bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold py-2.5 px-6 rounded-xl cursor-pointer flex items-center justify-center gap-2 shrink-0"
                  >
                    {simulatingFund ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    ) : (
                      <>
                        <span>Deposit via Monnify</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 shadow-sm">
            <Lock className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-semibold">Select a Target lock vault on the left to view countdowns, fund the commitment, and request disbursement payouts.</p>
          </div>
        )}
      </div>

    </div>
  );
}
