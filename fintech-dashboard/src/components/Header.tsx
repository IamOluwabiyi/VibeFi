/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Menu, Bell, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setMobileOpen: (open: boolean) => void;
  checkingBalance: number;
}

export default function Header({ activeTab, setMobileOpen, checkingBalance }: HeaderProps) {
  const getTabTitle = () => {
    switch (activeTab) {
      case 'home': return 'Home Savings';
      case 'ajo': return 'Ajo Group Saving';
      case 'locked': return 'Locked Savings';
      case 'profile': return 'My Profile';
      default: return 'Overview';
    }
  };

  return (
    <header className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between transition-colors backdrop-blur-md">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          id="mobile-sidebar-toggle"
          onClick={() => setMobileOpen(true)}
          className="md:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 cursor-pointer"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h2 className="font-bold text-slate-900 dark:text-white text-base leading-tight md:text-lg">
            {getTabTitle()}
          </h2>
          <div className="hidden sm:flex items-center gap-2 mt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
              Monnify Sandbox Gateway Live
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Real-time mini account indicator */}
        <div className="hidden lg:flex flex-col items-end text-xs pr-4 border-r border-slate-200 dark:border-slate-800">
          <span className="text-slate-400 font-semibold uppercase text-[9px]">Wallet Savings</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
            ₦{checkingBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Notifications or alerts */}
        <div className="flex items-center gap-2">
          {/* Environment Indicator Badge */}
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 uppercase">
            VibeFi-V2
          </span>
          
          <button
            id="notifications-bell-btn"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer relative"
          >
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-blue-600"></span>
          </button>
        </div>
      </div>
    </header>
  );
}
