/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Toast from './components/Toast';

// Tabs
import HomeTab from './components/HomeTab';
import AjoTab from './components/AjoTab';
import LockedTab from './components/LockedTab';
import ProfileTab from './components/ProfileTab';
import ChatAssistant from './components/ChatAssistant';

export default function App() {
  // Global States
  const [activeTab, setActiveTab] = useState<string>('home');
  const [savingsBalance, setSavingsBalance] = useState<number>(150000);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  // Toast Notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'danger' | 'info' } | null>(null);

  // Sync Dark Mode Class with Body Element
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  // Utility to fire a beautiful Toast notification
  const triggerToast = (message: string, type: 'success' | 'warning' | 'danger' | 'info') => {
    setToast({ message, type });
  };

  // Listen to Server Sent Events for Live Webhook Payments
  useEffect(() => {
    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data);
        triggerToast(`${notification.title}: ${notification.message}`, 'success');
        
        // Refresh local savings balance dynamically if we receive custom updates
        const fetchBalance = async () => {
          const res = await fetch('/api/user/profile');
          if (res.ok) {
            const data = await res.json();
            setSavingsBalance(data.userProfile.savingsBalance);
          }
        };
        fetchBalance();
      } catch (err) {
        console.error('Error parsing SSE event data', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div id="vibefi-savings-root" className="min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        darkMode={darkMode} 
        setDarkMode={setDarkMode}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div id="main-content-layout" className="flex-1 md:pl-64 flex flex-col min-w-0">
        <Header 
          activeTab={activeTab} 
          setMobileOpen={setMobileOpen}
          checkingBalance={savingsBalance}
        />

        {/* Dynamic Tab Panel */}
        <main id="tab-panel-container" className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'home' && (
            <HomeTab 
              triggerToast={triggerToast}
              savingsBalance={savingsBalance}
              setSavingsBalance={setSavingsBalance}
            />
          )}

          {activeTab === 'ajo' && (
            <AjoTab 
              triggerToast={triggerToast}
              savingsBalance={savingsBalance}
              setSavingsBalance={setSavingsBalance}
            />
          )}

          {activeTab === 'locked' && (
            <LockedTab 
              triggerToast={triggerToast}
              savingsBalance={savingsBalance}
              setSavingsBalance={setSavingsBalance}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileTab 
              triggerToast={triggerToast}
            />
          )}
        </main>
      </div>

      {/* Floating Chat Assistant */}
      <ChatAssistant />

      {/* Global Toast Alerts */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}
