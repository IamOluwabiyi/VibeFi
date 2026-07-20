/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Transaction {
  id: string;
  type: 'deposit' | 'payout' | 'contribution' | 'withdrawal';
  amount: number;
  date: string;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  paymentMethod: string;
  reference: string;
}

export interface AjoMember {
  name: string;
  email: string;
  contributionAmount: number;
  deposited: number;
  hasPaid: boolean;
}

export interface AjoCircle {
  id: string;
  title: string;
  type: 'ajo' | 'group' | 'split';
  totalTarget: number;
  raisedAmount: number;
  membersCount: number;
  members: AjoMember[];
  virtualAccount: string;
  bankName: string;
  reference: string;
  createdAt: string;
  cycleFrequency: 'daily' | 'weekly' | 'monthly';
  status: 'active' | 'completed';
}

export interface LockedVault {
  id: string;
  goalName: string;
  targetAmount: number;
  raisedAmount: number;
  unlockDate: string; // YYYY-MM-DD
  monthlyContribution: number;
  weeklyContribution: number;
  dailyContribution: number;
  virtualAccount: string;
  bankName: string;
  reference: string;
  createdAt: string;
  status: 'locked' | 'matured' | 'released';
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  bvn: string;
  nin: string;
  kycStatus: 'unverified' | 'pending' | 'verified';
  savingsBalance: number;
}
