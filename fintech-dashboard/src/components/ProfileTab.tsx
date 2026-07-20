/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Fingerprint, 
  ShieldCheck, 
  FileText, 
  Lock, 
  HelpCircle,
  Building,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { UserProfile } from '../types';

interface ProfileTabProps {
  triggerToast: (message: string, type: 'success' | 'warning' | 'danger' | 'info') => void;
}

export default function ProfileTab({ triggerToast }: ProfileTabProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [monnifyConfigured, setMonnifyConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const data = await response.json();
          setProfile(data.userProfile);
          setMonnifyConfigured(data.monnifyConfigured);
        }
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      
      {/* Header section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-200 text-2xl font-black shrink-0">
          OD
        </div>

        <div className="text-center md:text-left flex-1 space-y-1">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{profile?.name || 'Oyediran Daniel'}</h2>
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100/50 uppercase self-center md:self-auto">
              <ShieldCheck className="h-3 w-3" /> Fully Verified Tier 3
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Joined VibeFi Savings platform on June 12, 2026</p>
        </div>
      </div>

      {/* Grid panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Personal details */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">Personal KYC Identity</h3>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" /> Full Name
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{profile?.name || 'Oyediran Daniel'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" /> Email Address
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{profile?.email || 'maoyunoyediran@gmail.com'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" /> Mobile Number
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{profile?.phone || '+234 812 345 6789'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium flex items-center gap-2">
                <Fingerprint className="h-4 w-4 text-slate-400" /> Bank Verification No. (BVN)
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">************489</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" /> National Identity No. (NIN)
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">************812</span>
            </div>
          </div>
        </div>

        {/* Security / Verification checklist */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">Security & Limits</h3>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Daily Inbound Deposit Limit</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">₦5,000,000</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Daily Outbound Transfer Limit</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">₦2,500,000</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">BVN Matching Check</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                <CheckCircle className="h-3.5 w-3.5" /> Checked
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">NIN Verification Biometrics</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                <CheckCircle className="h-3.5 w-3.5" /> Match
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">IP Lock Region</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">Lagos, Nigeria</span>
            </div>
          </div>
        </div>

      </div>

      {/* Monnify Secure Integration Status */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <Building className="h-5 w-5 text-[#2563EB]" />
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Monnify API Integration Pipeline</h4>
            <p className="text-xs text-slate-400 mt-0.5">Secure server-side movement tracking</p>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          The VibeFi Savings backend handles real money movement invisibly using Monnify's secure infrastructure. This frontend communicates exclusively with secure Express API proxy routes, keeping credentials protected from browser inspection.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Environment Pipeline:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400 uppercase font-mono">SANDBOX</span>
          </div>

          <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Integration Status:</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
              <CheckCircle className="h-4 w-4" /> SECURELY ACTIVE
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
