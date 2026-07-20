/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  UserPlus, 
  Trash2, 
  QrCode, 
  ShieldCheck, 
  DollarSign, 
  TrendingUp, 
  ArrowRight,
  User,
  Copy,
  Smartphone,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { AjoCircle, AjoMember } from '../types';

interface AjoTabProps {
  triggerToast: (message: string, type: 'success' | 'warning' | 'danger' | 'info') => void;
  savingsBalance: number;
  setSavingsBalance: (bal: number) => void;
}

export default function AjoTab({ triggerToast, savingsBalance, setSavingsBalance }: AjoTabProps) {
  const [circles, setCircles] = useState<AjoCircle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCircle, setActiveCircle] = useState<AjoCircle | null>(null);

  // New Pool Form State
  const [circleTitle, setCircleTitle] = useState('');
  const [circleTarget, setCircleTarget] = useState('');
  const [circleFrequency, setCircleFrequency] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [newMembers, setNewMembers] = useState<Omit<AjoMember, 'deposited' | 'hasPaid'>[]>([
    { name: 'Alex Rivera', email: 'alex@vibefi.co', contributionAmount: 100000 },
    { name: 'Tolu Cole', email: 'tolu@vibefi.co', contributionAmount: 100000 }
  ]);
  const [memberInputName, setMemberInputName] = useState('');
  const [memberInputEmail, setMemberInputEmail] = useState('');
  const [memberInputAmt, setMemberInputAmt] = useState('');

  // Simulation form states
  const [simulatingPayment, setSimulatingPayment] = useState(false);
  const [selectedSimMember, setSelectedSimMember] = useState<AjoMember | null>(null);
  const [simAmount, setSimAmount] = useState('');

  const fetchAjoCircles = async () => {
    try {
      const response = await fetch('/api/collaborative/pools');
      if (response.ok) {
        const data = await response.json();
        setCircles(data);
        if (data.length > 0) {
          // Keep active circle reference fresh
          const match = data.find((c: AjoCircle) => c.id === activeCircle?.id);
          setActiveCircle(match || data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load Ajo circles', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAjoCircles();
    
    // Interval update to fetch pool state in case payments occur
    const interval = setInterval(fetchAjoCircles, 5000);
    return () => clearInterval(interval);
  }, [activeCircle?.id]);

  const handleAddMemberToList = () => {
    if (!memberInputName || !memberInputEmail || !memberInputAmt) {
      triggerToast('Please provide name, email and contribution amount for the member.', 'warning');
      return;
    }
    const amt = parseFloat(memberInputAmt);
    if (isNaN(amt) || amt <= 0) {
      triggerToast('Please provide a valid contribution amount.', 'warning');
      return;
    }

    setNewMembers(prev => [
      ...prev,
      { name: memberInputName, email: memberInputEmail, contributionAmount: amt }
    ]);
    setMemberInputName('');
    setMemberInputEmail('');
    setMemberInputAmt('');
    triggerToast('Member added to circle list.', 'success');
  };

  const handleRemoveMemberFromList = (email: string) => {
    setNewMembers(prev => prev.filter(m => m.email !== email));
  };

  const handleCreateCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!circleTitle || !circleTarget) {
      triggerToast('Circle title and total target are required.', 'warning');
      return;
    }

    const totalTarget = parseFloat(circleTarget);
    if (isNaN(totalTarget) || totalTarget <= 0) {
      triggerToast('Please enter a valid target amount.', 'warning');
      return;
    }

    if (newMembers.length < 1) {
      triggerToast('An Ajo Circle must have at least 1 member.', 'warning');
      return;
    }

    try {
      const response = await fetch('/api/collaborative/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: circleTitle,
          type: 'ajo',
          totalTarget,
          members: newMembers,
          cycleFrequency: circleFrequency
        })
      });

      if (response.ok) {
        const json = await response.json();
        triggerToast(`Ajo Circle "${circleTitle}" successfully launched!`, 'success');
        setCircleTitle('');
        setCircleTarget('');
        setNewMembers([
          { name: 'Alex Rivera', email: 'alex@vibefi.co', contributionAmount: 100000 },
          { name: 'Tolu Cole', email: 'tolu@vibefi.co', contributionAmount: 100000 }
        ]);
        fetchAjoCircles();
      } else {
        const err = await response.json();
        triggerToast(err.error || 'Failed to create Ajo circle.', 'danger');
      }
    } catch (err) {
      console.error('Error creating Ajo circle', err);
      triggerToast('Could not register Ajo Circle with Monnify sandbox.', 'danger');
    }
  };

  const handleSimulatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCircle || !selectedSimMember || !simAmount) {
      triggerToast('Please select a member and enter simulation amount.', 'warning');
      return;
    }

    const amount = parseFloat(simAmount);
    if (isNaN(amount) || amount <= 0) {
      triggerToast('Please enter a valid deposit amount.', 'warning');
      return;
    }

    setSimulatingPayment(true);
    try {
      const response = await fetch('/api/collaborative/pay-virtual-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          virtualAccountNo: activeCircle.virtualAccount,
          amount,
          payerEmail: selectedSimMember.email,
          payerName: selectedSimMember.name
        })
      });

      if (response.ok) {
        triggerToast(`Simulated bank transfer of ₦${amount.toLocaleString()} received successfully!`, 'success');
        setSimAmount('');
        setSelectedSimMember(null);
        fetchAjoCircles();
      } else {
        const err = await response.json();
        triggerToast(err.error || 'Payment simulation failed.', 'danger');
      }
    } catch (err) {
      console.error('Simulation payment error', err);
      triggerToast('Sandbox communication failed.', 'danger');
    } finally {
      setSimulatingPayment(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerToast('Virtual account number copied!', 'success');
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
      
      {/* Circles selector list */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Ajo Circles</h3>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold px-2 py-0.5 rounded-full">
              {circles.length} Active
            </span>
          </div>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto">
            {circles.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No Ajo circles found. Launch one below!</p>
            ) : (
              circles.map((c) => {
                const isActive = activeCircle?.id === c.id;
                const progress = (c.raisedAmount / c.totalTarget) * 100;
                return (
                  <button
                    key={c.id}
                    id={`ajo-selector-${c.id}`}
                    onClick={() => setActiveCircle(c)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer block ${
                      isActive 
                        ? 'border-[#2563EB] bg-slate-50 dark:bg-slate-950/40' 
                        : 'border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-950/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate pr-2">{c.title}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        c.status === 'completed' 
                          ? 'bg-emerald-50 text-emerald-600' 
                          : 'bg-blue-50 text-blue-600'
                      }`}>{c.status}</span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold mt-1.5 uppercase font-mono">
                      <span>₦{c.raisedAmount.toLocaleString()}</span>
                      <span>/</span>
                      <span>₦{c.totalTarget.toLocaleString()}</span>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="bg-[#2563EB] h-full rounded-full transition-all" 
                        style={{ width: `${Math.min(100, progress)}%` }}
                      ></div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Launch circle card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="h-4.5 w-4.5 text-[#2563EB]" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Launch New Ajo Circle</h3>
          </div>

          <form onSubmit={handleCreateCircle} className="space-y-3.5">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1 uppercase">Ajo Circle Name</label>
              <input
                id="ajo-title-input"
                type="text"
                required
                value={circleTitle}
                onChange={(e) => setCircleTitle(e.target.value)}
                placeholder="e.g., Yaba Rent Savers"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1 uppercase">Target (₦)</label>
                <input
                  id="ajo-target-input"
                  type="number"
                  required
                  value={circleTarget}
                  onChange={(e) => setCircleTarget(e.target.value)}
                  placeholder="500,000"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1 uppercase">Cycle</label>
                <select
                  id="ajo-frequency-select"
                  value={circleFrequency}
                  onChange={(e) => setCircleFrequency(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                >
                  <option value="daily">Daily Contribution</option>
                  <option value="weekly">Weekly Contribution</option>
                  <option value="monthly">Monthly Contribution</option>
                </select>
              </div>
            </div>

            {/* Member list to add */}
            <div className="border border-slate-100 dark:border-slate-800 p-3 rounded-xl space-y-3.5">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Configure Circle Members</span>
              
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                {newMembers.map((nm) => (
                  <div key={nm.email} className="flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-950 p-2 rounded-lg">
                    <div className="truncate pr-2">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{nm.name}</p>
                      <p className="text-[9px] text-slate-400 font-mono truncate">{nm.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono">₦{nm.contributionAmount.toLocaleString()}</span>
                      <button 
                        type="button"
                        onClick={() => handleRemoveMemberFromList(nm.email)}
                        className="text-slate-400 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add member subform */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <input
                  type="text"
                  placeholder="Friend Name"
                  value={memberInputName}
                  onChange={(e) => setMemberInputName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg py-1.5 px-2.5 text-[11px] font-medium text-slate-900 dark:text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="email"
                    placeholder="Friend Email"
                    value={memberInputEmail}
                    onChange={(e) => setMemberInputEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg py-1.5 px-2.5 text-[11px] font-medium text-slate-900 dark:text-white"
                  />
                  <input
                    type="number"
                    placeholder="Contr. (₦)"
                    value={memberInputAmt}
                    onChange={(e) => setMemberInputAmt(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg py-1.5 px-2.5 text-[11px] font-bold font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddMemberToList}
                  className="w-full py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-[10px] font-bold text-slate-600 dark:text-slate-400 cursor-pointer flex items-center justify-center gap-1"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Insert Member</span>
                </button>
              </div>
            </div>

            <button
              id="ajo-create-submit-btn"
              type="submit"
              className="w-full bg-[#0F172A] dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Users className="h-4 w-4" />
              <span>Launch Ajo Circle</span>
            </button>
          </form>
        </div>

      </div>

      {/* Active circle details panel */}
      <div className="lg:col-span-2 space-y-6">
        {activeCircle ? (
          <>
            {/* Upper details card (No gradients) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{activeCircle.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">Circle Reference ID: <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{activeCircle.id}</span></p>
                </div>
                
                {/* Virtual Reserved Account banner */}
                <div className="bg-slate-50 dark:bg-slate-950/55 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 shrink-0">
                  <div className="text-xs">
                    <span className="text-[9px] text-slate-400 block font-semibold uppercase">Circle Monnify Reserved Account</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono font-bold text-slate-800 dark:text-white text-sm">{activeCircle.virtualAccount}</span>
                      <button 
                        onClick={() => copyToClipboard(activeCircle.virtualAccount)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Copy Reserved Account Number"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">{activeCircle.bankName}</span>
                  </div>
                </div>
              </div>

              {/* Progress bar / Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Accumulated Contributions</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white font-mono block mt-1">₦{activeCircle.raisedAmount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Target Savings Goal</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white font-mono block mt-1 font-semibold">₦{activeCircle.totalTarget.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Circle Billing Cycle</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white uppercase block mt-1.5 bg-slate-50 dark:bg-slate-850 px-2 py-0.5 rounded-full inline-block">
                    {activeCircle.cycleFrequency}
                  </span>
                </div>
              </div>

              {/* Member payment tracker */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">Payment Tracker ({activeCircle.members.length} members)</h4>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/55">
                  {activeCircle.members.map((member) => {
                    const pct = (member.deposited / member.contributionAmount) * 100;
                    return (
                      <div key={member.email} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-[10px]">
                            {member.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{member.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{member.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 shrink-0 justify-between md:justify-end">
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">₦{member.deposited.toLocaleString()}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">of ₦{member.contributionAmount.toLocaleString()}</span>
                          </div>

                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            member.hasPaid
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-amber-50 text-amber-600'
                          }`}>
                            {member.hasPaid ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                            <span>{member.hasPaid ? 'Settled' : 'Owing'}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Sandbox payment simulator block */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4.5 w-4.5 text-[#2563EB]" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Sandbox Bank Transfer Simulator</h3>
              </div>
              <p className="text-xs text-slate-400">
                Fund this Ajo Circle's reserved virtual account of <span className="font-mono font-semibold">{activeCircle.virtualAccount}</span> by simulating an inbound bank transfer on behalf of any circle member below.
              </p>

              <form onSubmit={handleSimulatePayment} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 block mb-1 uppercase">Circle Participant</label>
                  <select
                    id="sim-member-select"
                    required
                    value={selectedSimMember?.email || ''}
                    onChange={(e) => {
                      const m = activeCircle.members.find(mem => mem.email === e.target.value);
                      setSelectedSimMember(m || null);
                    }}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="">Select Member</option>
                    {activeCircle.members.map(m => (
                      <option key={m.email} value={m.email}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 block mb-1 uppercase">Simulated Transfer Amount (₦)</label>
                  <input
                    id="sim-amount-input"
                    type="number"
                    required
                    value={simAmount}
                    onChange={(e) => setSimAmount(e.target.value)}
                    placeholder="100,000"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-bold font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <button
                  id="sim-ajo-pay-btn"
                  type="submit"
                  disabled={simulatingPayment}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-2"
                >
                  {simulatingPayment ? (
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
          </>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 shadow-sm">
            <Users className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-semibold">Select an Ajo circle on the left to see progress, monitor member contributions, and simulate Sandbox payments.</p>
          </div>
        )}
      </div>

    </div>
  );
}
