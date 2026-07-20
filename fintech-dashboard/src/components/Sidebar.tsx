/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Home,
  Users, 
  Lock,
  User,
  Sun, 
  Moon, 
  X
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  darkMode, 
  setDarkMode, 
  mobileOpen, 
  setMobileOpen 
}: SidebarProps) {
  
  const navItems = [
    { id: 'home', label: 'Home (Savings)', icon: <Home className="h-4.5 w-4.5" /> },
    { id: 'ajo', label: 'Ajo Group Saving', icon: <Users className="h-4.5 w-4.5" /> },
    { id: 'locked', label: 'Locked Savings', icon: <Lock className="h-4.5 w-4.5" /> },
    { id: 'profile', label: 'My Profile', icon: <User className="h-4.5 w-4.5" /> },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between p-5 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-colors">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-[#2563EB] rounded-lg flex items-center justify-center font-bold text-white text-base tracking-tighter">
              VF
            </div>
            <div>
              <h1 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">VibeFi</h1>
              <p className="text-[10px] text-slate-400 font-medium">Personal Savings</p>
            </div>
          </div>
          {/* Mobile close button */}
          <button
            id="mobile-close-sidebar"
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-[#EFF6FF] dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-400 font-bold' 
                    : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer Controls */}
      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        {/* Custom Light/Dark Mode Switcher */}
        <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-950/25 rounded-xl border border-slate-100 dark:border-slate-800/40">
          <span className="text-[10px] font-bold text-slate-400 uppercase pl-1">Theme</span>
          <div className="flex gap-1">
            <button
              id="theme-toggle-light"
              onClick={() => setDarkMode(false)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${!darkMode ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-200'}`}
              title="Light theme"
            >
              <Sun className="h-4.5 w-4.5" />
            </button>
            <button
              id="theme-toggle-dark"
              onClick={() => setDarkMode(true)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${darkMode ? 'bg-slate-800 text-white border border-slate-700/50' : 'text-slate-400 hover:text-slate-600'}`}
              title="Dark theme"
            >
              <Moon className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Account indicator */}
        <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800/40">
          <div className="w-10 h-10 rounded-lg bg-[#0F172A] dark:bg-slate-100 flex items-center justify-center text-white dark:text-[#0F172A] text-xs font-bold shrink-0">
            OD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#0F172A] dark:text-white truncate">Oyediran Daniel</p>
            <p className="text-[10px] text-[#64748B] dark:text-slate-400 truncate">Tier 3 Saver</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile, permanent on desktop) */}
      <aside className="hidden md:block w-64 h-screen fixed top-0 left-0 z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar overlay (shown when menu toggled) */}
      {mobileOpen && (
        <div id="mobile-sidebar-overlay" className="md:hidden fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 z-40 transition-opacity">
          <aside className="w-64 h-screen fixed top-0 left-0 z-50 animate-slide-right">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
