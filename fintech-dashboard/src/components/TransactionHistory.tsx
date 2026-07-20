/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  RefreshCw, 
  Download, 
  TrendingDown, 
  TrendingUp, 
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { Transaction } from '../types';

interface TransactionHistoryProps {
  // Option to pass a callback when state changes, or to manually trigger a parent balance refresh
  onRefresh?: () => void;
  // Option to pass transactions from parent to stay reactive, or we can fetch them locally
  initialTransactions?: Transaction[];
  triggerToast: (message: string, type: 'success' | 'warning' | 'danger' | 'info') => void;
}

export default function TransactionHistory({ onRefresh, initialTransactions, triggerToast }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions || []);
  const [loading, setLoading] = useState(!initialTransactions);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'deposit' | 'contribution' | 'withdrawal' | 'payout'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTransactions = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/user/transactions');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      } else {
        triggerToast('Failed to fetch transactions from backend', 'danger');
      }
    } catch (err) {
      console.error('Error fetching transactions', err);
      triggerToast('Network error while retrieving savings activity', 'danger');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (initialTransactions) {
      setTransactions(initialTransactions);
    } else {
      fetchTransactions();
    }
  }, [initialTransactions]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTransactions(true);
    if (onRefresh) {
      onRefresh();
    }
    triggerToast('Transaction history updated', 'success');
  };

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      triggerToast('No transactions to export', 'warning');
      return;
    }
    // Generate simple CSV content
    const headers = ['ID', 'Description', 'Type', 'Amount (NGN)', 'Date', 'Reference', 'Payment Method', 'Status'];
    const rows = filteredTransactions.map(tx => [
      tx.id,
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.type,
      tx.amount,
      new Date(tx.date).toLocaleDateString(),
      tx.reference,
      tx.paymentMethod,
      tx.status
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `VibeFi_Savings_Statement_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    triggerToast('Statement downloaded as CSV successfully!', 'success');
  };

  // Filter & search logic
  const filteredTransactions = transactions.filter(tx => {
    // Search matching
    const matchesSearch = 
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Type matching
    const matchesType = filterType === 'all' || tx.type === filterType;

    return matchesSearch && matchesType;
  });

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit':
        return (
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
            <ArrowDownLeft className="h-4.5 w-4.5" />
          </div>
        );
      case 'withdrawal':
        return (
          <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400">
            <ArrowUpRight className="h-4.5 w-4.5" />
          </div>
        );
      case 'contribution':
        return (
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
            <TrendingDown className="h-4.5 w-4.5" />
          </div>
        );
      case 'payout':
        return (
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
            <TrendingUp className="h-4.5 w-4.5" />
          </div>
        );
      default:
        return (
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400">
            <DollarSign className="h-4.5 w-4.5" />
          </div>
        );
    }
  };

  return (
    <div id="transaction-history-container" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      
      {/* Header section */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Recent Savings Activity</h3>
          <p className="text-xs text-slate-400 mt-0.5">Wallet deposits, locked disbursements, and Ajo group contributions.</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Refresh Action */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-xl transition-all cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-800"
            title="Refresh history"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Statement download */}
          <button
            onClick={handleExportCSV}
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-xl px-3 py-2 transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200 dark:border-slate-800"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by description, reference, or bank..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-slate-700"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {(['all', 'deposit', 'withdrawal', 'contribution', 'payout'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-all cursor-pointer ${
                filterType === type
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {type === 'all' ? 'All' : type + 's'}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions list layout */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-slate-600 dark:border-slate-400"></div>
          <span className="text-xs text-slate-400 mt-3 font-medium">Fetching transaction details...</span>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center px-4">
          <AlertCircle className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {searchTerm || filterType !== 'all' 
              ? 'No transactions found matching your criteria.' 
              : 'No activities registered yet on your personal ledger.'}
          </p>
          {(searchTerm || filterType !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setFilterType('all'); }}
              className="mt-3 text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
            >
              Clear filters & search
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-5">Activity</th>
                <th className="py-3.5 px-5">Date</th>
                <th className="py-3.5 px-5">Reference</th>
                <th className="py-3.5 px-5">Settlement Channel</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Amount (NGN)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 transition-colors">
                  {/* Icon & Description */}
                  <td className="py-3.5 px-5 flex items-center gap-3">
                    {getTransactionIcon(tx.type)}
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">{tx.description}</span>
                      <span className="text-[10px] text-slate-400 font-medium capitalize mt-0.5 block">{tx.type}</span>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="py-3.5 px-5 text-slate-400 font-medium font-mono">
                    {new Date(tx.date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>

                  {/* Reference */}
                  <td className="py-3.5 px-5 text-slate-400 font-mono text-[10px]">{tx.reference}</td>

                  {/* Payment Method / Channel */}
                  <td className="py-3.5 px-5 text-slate-500 dark:text-slate-400 font-medium">{tx.paymentMethod}</td>

                  {/* Status */}
                  <td className="py-3.5 px-5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      tx.status === 'completed' 
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' 
                        : tx.status === 'failed'
                        ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
                        : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                    }`}>
                      {tx.status}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className={`py-3.5 px-5 text-right font-mono font-bold text-sm ${
                    tx.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {tx.amount > 0 ? '+' : ''}₦{tx.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
