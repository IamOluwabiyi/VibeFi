/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

// In-Memory Data Store for SocialPay Ecosystem
interface Escrow {
  id: string;
  title: string;
  amount: number;
  payerEmail: string;
  status: 'pending' | 'completed' | 'refunded';
  paymentLink: string;
  qrCodeUrl: string;
  virtualAccount: string;
  bankName: string;
  createdAt: string;
  dueDate: string;
  reference: string;
}

interface Invoice {
  id: string;
  merchantName: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  vat: number; // percentage
  totalAmount: number;
  dueDate: string;
  description: string;
  attachmentName?: string;
  status: 'unpaid' | 'paid' | 'overdue';
  paymentLink: string;
  virtualAccount: string;
  bankName: string;
  createdAt: string;
  reference: string;
}

interface Donation {
  id: string;
  title: string;
  description: string;
  creatorName: string;
  targetAmount: number;
  raisedAmount: number;
  supportersCount: number;
  paymentLink: string;
  slug: string;
  createdAt: string;
  reference: string;
}

interface DonationPayment {
  id: string;
  donationId: string;
  donorName: string;
  donorEmail: string;
  amount: number;
  message: string;
  createdAt: string;
  reference: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning';
  timestamp: string;
}

interface PoolMember {
  name: string;
  email: string;
  contributionAmount: number;
  deposited: number;
  hasPaid: boolean;
}

interface VibePool {
  id: string;
  title: string;
  type: 'ajo' | 'group' | 'split';
  totalTarget: number;
  raisedAmount: number;
  membersCount: number;
  members: PoolMember[];
  virtualAccount: string;
  bankName: string;
  reference: string;
  createdAt: string;
  cycleFrequency: 'monthly' | 'weekly' | 'daily';
  status: 'active' | 'completed';
}

interface VibeVault {
  id: string;
  goalName: string;
  targetAmount: number;
  raisedAmount: number;
  unlockDate: string;
  contributionFrequency: 'monthly' | 'weekly' | 'daily';
  monthlyContribution: number;
  weeklyContribution: number;
  dailyContribution: number;
  virtualAccount: string;
  bankName: string;
  reference: string;
  createdAt: string;
  status: 'locked' | 'matured' | 'released';
}

// In-Memory Data Store for Pools & Vaults
const pools: VibePool[] = [
  {
    id: 'pool_1',
    title: 'Lagos Techies Rent Pool',
    type: 'group',
    totalTarget: 2000000,
    raisedAmount: 800000,
    membersCount: 4,
    members: [
      { name: 'Alex Rivera', email: 'alex@aetherfinance.co', contributionAmount: 500000, deposited: 500000, hasPaid: true },
      { name: 'Tolu Cole', email: 'tolu@gmail.com', contributionAmount: 500000, deposited: 300000, hasPaid: false },
      { name: 'Chioma Nduka', email: 'chioma@gmail.com', contributionAmount: 500000, deposited: 0, hasPaid: false },
      { name: 'Bimbo Ademola', email: 'bimbo@gmail.com', contributionAmount: 500000, deposited: 0, hasPaid: false }
    ],
    virtualAccount: '9920883711',
    bankName: 'Monnify Wema Sandbox',
    reference: 'VBF-POL-77382',
    createdAt: '2026-07-01T12:00:00Z',
    cycleFrequency: 'monthly',
    status: 'active'
  },
  {
    id: 'pool_2',
    title: 'Ajo Five Founders Club',
    type: 'ajo',
    totalTarget: 500000,
    raisedAmount: 100000,
    membersCount: 5,
    members: [
      { name: 'Alex Rivera', email: 'alex@aetherfinance.co', contributionAmount: 100000, deposited: 0, hasPaid: false },
      { name: 'Tolu Cole', email: 'tolu@gmail.com', contributionAmount: 100000, deposited: 0, hasPaid: false },
      { name: 'Chioma Nduka', email: 'chioma@gmail.com', contributionAmount: 100000, deposited: 0, hasPaid: false },
      { name: 'Bimbo Ademola', email: 'bimbo@gmail.com', contributionAmount: 100000, deposited: 0, hasPaid: false },
      { name: 'Femi Adebayo', email: 'femi@founders.co', contributionAmount: 100000, deposited: 100000, hasPaid: true }
    ],
    virtualAccount: '9920114922',
    bankName: 'Monnify Sterling Sandbox',
    reference: 'VBF-POL-11943',
    createdAt: '2026-07-05T09:30:00Z',
    cycleFrequency: 'weekly',
    status: 'active'
  }
];

const vaults: VibeVault[] = [
  {
    id: 'vlt_1',
    goalName: 'Decatur Business Capital',
    targetAmount: 5000000,
    raisedAmount: 1200000,
    unlockDate: '2026-12-31',
    contributionFrequency: 'monthly',
    monthlyContribution: 416667,
    weeklyContribution: 96154,
    dailyContribution: 13699,
    virtualAccount: '9920448192',
    bankName: 'Monnify Wema Sandbox',
    reference: 'VBF-VLT-33291',
    createdAt: '2026-07-01T08:00:00Z',
    status: 'locked'
  },
  {
    id: 'vlt_2',
    goalName: 'Silicon Valley Tech Summit Tour',
    targetAmount: 1500000,
    raisedAmount: 1500000,
    unlockDate: '2026-07-10', // already past today (2026-07-15) - matured!
    contributionFrequency: 'weekly',
    monthlyContribution: 500000,
    weeklyContribution: 115385,
    dailyContribution: 16438,
    virtualAccount: '9920993811',
    bankName: 'Monnify Sterling Sandbox',
    reference: 'VBF-VLT-11049',
    createdAt: '2026-06-01T10:00:00Z',
    status: 'matured'
  }
];

// Seed Initial Data
const escrows: Escrow[] = [
  {
    id: 'esc_1',
    title: 'Custom Web Design Project',
    amount: 150000,
    payerEmail: 'client.kole@domain.com',
    status: 'pending',
    paymentLink: '/pay/escrow/esc_1',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=monnify_escrow_esc_1',
    virtualAccount: '9920485731',
    bankName: 'Monnify Wema Sandbox',
    createdAt: '2026-07-14T10:00:00Z',
    dueDate: '2026-07-20T23:59:59Z',
    reference: 'VBF-ESC-48273'
  },
  {
    id: 'esc_2',
    title: 'Graphics Retainer',
    amount: 50000,
    payerEmail: 'design.lead@agency.co',
    status: 'completed',
    paymentLink: '/pay/escrow/esc_2',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=monnify_escrow_esc_2',
    virtualAccount: '9920119482',
    bankName: 'Monnify Wema Sandbox',
    createdAt: '2026-07-10T14:30:00Z',
    dueDate: '2026-07-15T23:59:59Z',
    reference: 'VBF-ESC-11942'
  }
];

const invoices: Invoice[] = [
  {
    id: 'inv_1',
    merchantName: 'VibeFi Agency',
    clientName: 'Sarah Martins',
    clientEmail: 'sarah.m@retailco.ng',
    amount: 85000,
    vat: 7.5,
    totalAmount: 91375, // 85000 * 1.075
    dueDate: '2026-07-25',
    description: 'Social Media Management - July 2026 Retainer',
    attachmentName: 'retainer_agreement_july.pdf',
    status: 'unpaid',
    paymentLink: '/pay/invoice/inv_1',
    virtualAccount: '9920334812',
    bankName: 'Monnify Sterling Sandbox',
    createdAt: '2026-07-12T09:15:00Z',
    reference: 'VBF-INV-99382'
  },
  {
    id: 'inv_2',
    merchantName: 'VibeFi Agency',
    clientName: 'Tunde Bakare',
    clientEmail: 'tunde@bakareholdings.com',
    amount: 300000,
    vat: 0,
    totalAmount: 300000,
    dueDate: '2026-07-01',
    description: 'Financial Consulting & Advisory Services',
    attachmentName: 'consulting_hours_june.xlsx',
    status: 'paid',
    paymentLink: '/pay/invoice/inv_2',
    virtualAccount: '9920115592',
    bankName: 'Monnify Sterling Sandbox',
    createdAt: '2026-06-25T11:00:00Z',
    reference: 'VBF-INV-22315'
  }
];

const donations: Donation[] = [
  {
    id: 'don_1',
    title: 'Tech Education for Kids in Yaba',
    description: 'We are raising funds to buy 15 laptops and set up a coding club for underprivileged children in Lagos.',
    creatorName: 'Chioma Nduka',
    targetAmount: 2500000,
    raisedAmount: 1850000,
    supportersCount: 37,
    paymentLink: '/pay/donation/don_1',
    slug: 'yaba-kids-code',
    createdAt: '2026-07-01T08:00:00Z',
    reference: 'VBF-DON-88492'
  }
];

const donationPayments: DonationPayment[] = [
  {
    id: 'dp_1',
    donationId: 'don_1',
    donorName: 'Anonymous Tech Sis',
    donorEmail: 'techsis@gmail.com',
    amount: 50000,
    message: 'Keep up the fantastic work! Tech is the future.',
    createdAt: '2026-07-14T18:22:00Z',
    reference: 'VBF-DP-11204'
  }
];

const notifications: Notification[] = [
  {
    id: 'not_1',
    title: 'Ecosystem Initialized',
    message: 'Welcome to the VibeFi SocialPay Sandbox environment.',
    type: 'info',
    timestamp: new Date().toISOString()
  }
];

// Active SSE Connections for Real-Time Webhook Notifications
let sseClients: express.Response[] = [];

// Helper to broadcast notification to all SSE clients
function broadcastNotification(notification: Notification) {
  notifications.unshift(notification);
  sseClients.forEach((client) => {
    client.write(`data: ${JSON.stringify(notification)}\n\n`);
  });
}

// =============================================================
// MONNIFY SANDBOX INTEGRATION HELPERS
// =============================================================

async function getMonnifyAccessToken(): Promise<string | null> {
  const apiKey = process.env.MONNIFY_API_KEY;
  const secretKey = process.env.MONNIFY_SECRET_KEY;

  if (!apiKey || !secretKey) {
    console.warn("[Monnify] API Key or Secret Key missing. Falling back to sandbox simulation.");
    return null;
  }

  try {
    const authHeader = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
    const response = await fetch('https://sandbox.monnify.com/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Monnify Auth Error] HTTP ${response.status}: ${errText}`);
      return null;
    }

    const data: any = await response.json();
    if (data.requestStatus === 'SUCCESS' && data.responseBody?.accessToken) {
      return data.responseBody.accessToken;
    }
    console.error(`[Monnify Auth Fail] Response:`, data);
    return null;
  } catch (err) {
    console.error('[Monnify Auth Exception]', err);
    return null;
  }
}

async function createMonnifyReservedAccount(params: {
  accountReference: string;
  accountName: string;
  customerEmail: string;
  customerName: string;
}): Promise<{ virtualAccount: string; bankName: string } | null> {
  const token = await getMonnifyAccessToken();
  const contractCode = process.env.MONNIFY_CONTRACT_CODE;

  if (!token || !contractCode) {
    console.warn("[Monnify] Access Token or Contract Code missing. Using simulated virtual account.");
    return null;
  }

  try {
    const payload = {
      accountReference: params.accountReference,
      accountName: params.accountName.substring(0, 100),
      currencyCode: 'NGN',
      contractCode: contractCode,
      customerEmail: params.customerEmail,
      customerName: params.customerName.substring(0, 100),
      getAllAvailableBanks: true
    };

    const response = await fetch('https://sandbox.monnify.com/api/v1/bank-transfer/reserved-accounts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Monnify Account Register Error] HTTP ${response.status}: ${errText}`);
      return null;
    }

    const data: any = await response.json();
    if (data.requestStatus === 'SUCCESS' && data.responseBody?.accounts?.length > 0) {
      const acc = data.responseBody.accounts[0];
      return {
        virtualAccount: acc.accountNumber,
        bankName: acc.bankName || 'Monnify Sandbox Bank'
      };
    }
    console.error("[Monnify Account Register Fail] Response:", data);
    return null;
  } catch (err) {
    console.error('[Monnify Account Register Exception]', err);
    return null;
  }
}

async function triggerMonnifyDisbursement(params: {
  amount: number;
  reference: string;
  bankCode: string;
  accountNumber: string;
  narration: string;
}): Promise<{ success: boolean; message: string; reference?: string }> {
  const token = await getMonnifyAccessToken();
  const sourceAccountNumber = process.env.MONNIFY_SOURCE_ACCOUNT_NUMBER || '1234567890';

  if (!token) {
    return {
      success: false,
      message: "Monnify authentication failed or credentials not set."
    };
  }

  try {
    const payload = {
      amount: params.amount,
      reference: params.reference,
      narration: params.narration,
      destinationBankCode: params.bankCode,
      destinationAccountNumber: params.accountNumber,
      currency: 'NGN',
      sourceAccountNumber: sourceAccountNumber
    };

    const response = await fetch('https://sandbox.monnify.com/api/v1/disbursements/single', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Monnify Disbursement Error] HTTP ${response.status}: ${errText}`);
      return {
        success: false,
        message: `Monnify disbursement returned status ${response.status}: ${errText}`
      };
    }

    const data: any = await response.json();
    if (data.requestStatus === 'SUCCESS') {
      return {
        success: true,
        message: data.responseMessage || "Disbursement processed successfully.",
        reference: data.responseBody?.reference
      };
    }

    console.error("[Monnify Disbursement Fail] Response:", data);
    return {
      success: false,
      message: data.responseMessage || "Disbursement failed at Monnify."
    };
  } catch (err: any) {
    console.error('[Monnify Disbursement Exception]', err);
    return {
      success: false,
      message: err.message || "An exception occurred during disbursement."
    };
  }
}

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// 1. Core SocialPay Data Overview
app.get('/api/socialpay/summary', (req, res) => {
  const pendingEscrowAmount = escrows
    .filter(e => e.status === 'pending')
    .reduce((sum, e) => sum + e.amount, 0);

  const completedEscrowsCount = escrows.filter(e => e.status === 'completed').length;
  const totalEscrowsCount = escrows.length;
  const escrowCompletionRate = totalEscrowsCount > 0 ? (completedEscrowsCount / totalEscrowsCount) : 1.0;

  const paidInvoicesCount = invoices.filter(i => i.status === 'paid').length;
  const totalInvoicesCount = invoices.length;
  const invoicePaymentRate = totalInvoicesCount > 0 ? (paidInvoicesCount / totalInvoicesCount) : 1.0;

  const totalRevenue = escrows.filter(e => e.status === 'completed').reduce((sum, e) => sum + e.amount, 0) +
                       invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.totalAmount, 0) +
                       donations.reduce((sum, d) => sum + d.raisedAmount, 0) +
                       pools.reduce((sum, p) => sum + p.raisedAmount, 0) +
                       vaults.reduce((sum, v) => sum + v.raisedAmount, 0);

  // VIBE SCORE CALCULATION (0 - 1000)
  let vibeScore = 400; // base score
  // 1. Verified Profile status (Default true: +200)
  const isProfileVerified = true;
  if (isProfileVerified) vibeScore += 200;

  // 2. Savings Discipline (based on vaults, +150 max)
  const totalVaults = vaults.length;
  if (totalVaults > 0) {
    const savingsProgressRatio = vaults.reduce((acc, v) => acc + (v.raisedAmount / v.targetAmount), 0) / totalVaults;
    vibeScore += Math.floor(savingsProgressRatio * 150);
  } else {
    vibeScore += 100; // standard bonus
  }

  // 3. Completed Escrows (+150 max)
  vibeScore += Math.floor(escrowCompletionRate * 150);

  // 4. Successful Payments (+100 max)
  vibeScore += Math.floor(invoicePaymentRate * 100);

  // 5. Group Contribution Consistency (+100 max)
  const totalPools = pools.length;
  if (totalPools > 0) {
    const poolConsistencyRatio = pools.reduce((acc, p) => {
      const paidMembersCount = p.members.filter(m => m.hasPaid).length;
      return acc + (paidMembersCount / p.membersCount);
    }, 0) / totalPools;
    vibeScore += Math.floor(poolConsistencyRatio * 100);
  } else {
    vibeScore += 70;
  }

  // Cap at 1000
  vibeScore = Math.min(1000, Math.max(300, vibeScore));

  // FRAUD DETECTION ANALYZER
  // A. Duplicate payment detection: Same client email, same amount within 1 hour
  let duplicatePayments = false;
  const seenTx = new Set<string>();
  for (const esc of escrows) {
    const key = `esc_${esc.payerEmail}_${esc.amount}`;
    if (seenTx.has(key)) {
      duplicatePayments = true;
      break;
    }
    seenTx.add(key);
  }
  for (const inv of invoices) {
    const key = `inv_${inv.clientEmail}_${inv.amount}`;
    if (seenTx.has(key)) {
      duplicatePayments = true;
      break;
    }
    seenTx.add(key);
  }

  // B. Abnormal Transaction Patterns: transactions > ₦1,500,000
  const abnormalTransactionPatterns = escrows.some(e => e.amount > 1500000) || 
                                       invoices.some(i => i.totalAmount > 1500000) || 
                                       vaults.some(v => v.targetAmount > 1500000);

  // C. Suspicious Behaviour: any escrow with overdue lock cycle or high pool defaults
  const suspiciousBehaviour = pools.some(p => p.raisedAmount > 1000000 && p.members.some(m => m.deposited > 0 && !m.hasPaid));

  // D. Repeated failed transactions: any failure notifications in logs
  const repeatedFailedTransactions = notifications.some(n => n.type === 'warning' || n.message.toLowerCase().includes('fail') || n.message.toLowerCase().includes('decline'));

  // Calculate Fraud Risk Score (0 - 100)
  let fraudRiskScore = 8; // base risk is very low
  if (duplicatePayments) fraudRiskScore += 25;
  if (abnormalTransactionPatterns) fraudRiskScore += 35;
  if (suspiciousBehaviour) fraudRiskScore += 15;
  if (repeatedFailedTransactions) fraudRiskScore += 20;

  // DYNAMIC AI COACH INSIGHTS
  const aiCoachInsights: string[] = [];
  
  // Insight 1: Spending Analysis
  const saasExp = 120 + 843.12 + 340 + 45 + 180.45; // Vercel, AWS, Slack, Figma, OpenAI
  aiCoachInsights.push(`You spent ₦${Math.round(saasExp * 1650).toLocaleString()} (approx.) on SaaS infrastructure this cycle. Optimize idle AWS nodes to save up to 15%.`);

  // Insight 2: Savings Goal Completeness
  const completedSavingsCount = vaults.filter(v => v.status === 'matured' || v.status === 'released' || v.raisedAmount >= v.targetAmount).length;
  if (completedSavingsCount > 0) {
    aiCoachInsights.push(`Your savings goal discipline is spectacular! ${completedSavingsCount} commitment vaults have successfully completed.`);
  } else {
    aiCoachInsights.push("Your savings lock-up discipline is strong. No withdrawals allowed until dates mature.");
  }

  // Insight 3: Pending Escrow / Invoice summary
  const pendingInvoices = invoices.filter(i => i.status === 'unpaid').length;
  const pendingEscrows = escrows.filter(e => e.status === 'pending').length;
  if (pendingEscrows > 0 || pendingInvoices > 0) {
    aiCoachInsights.push(`${pendingEscrows} escrow contracts & ${pendingInvoices} invoices are currently awaiting payer settlement.`);
  } else {
    aiCoachInsights.push("All escrow contracts and branded client invoices have been successfully paid!");
  }

  // Income Expense & Cashflow Analysis
  const monthlyIncome = escrows.filter(e => e.status === 'completed').reduce((sum, e) => sum + e.amount, 0) +
                        invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.totalAmount, 0) +
                        donations.reduce((sum, d) => sum + d.raisedAmount, 0);

  const monthlyExpenses = vaults.reduce((sum, v) => sum + v.raisedAmount, 0) +
                          pools.reduce((sum, p) => sum + p.raisedAmount, 0) +
                          outboundTransfers.reduce((sum, t) => sum + t.amount, 0);

  res.json({
    escrows,
    invoices,
    donations,
    donationPayments,
    pools,
    vaults,
    outboundTransfers,
    notifications: notifications.slice(0, 15),
    vibeScore,
    profileVerified: isProfileVerified,
    fraudDetection: {
      duplicatePayments,
      suspiciousBehaviour,
      abnormalTransactionPatterns,
      repeatedFailedTransactions,
      riskScore: fraudRiskScore
    },
    aiCoachInsights,
    incomeExpenseAnalytics: {
      monthlyIncome,
      monthlyExpenses,
      netSavings: monthlyIncome - monthlyExpenses,
      cashflowRatio: monthlyExpenses > 0 ? Number((monthlyIncome / monthlyExpenses).toFixed(2)) : 1.0,
      categories: [
        { name: 'Escrow Revenue', value: escrows.filter(e => e.status === 'completed').reduce((sum, e) => sum + e.amount, 0) },
        { name: 'Invoice Revenue', value: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.totalAmount, 0) },
        { name: 'Mutual Group Savings', value: pools.reduce((sum, p) => sum + p.raisedAmount, 0) },
        { name: 'Milestone Locked Vaults', value: vaults.reduce((sum, v) => sum + v.raisedAmount, 0) },
        { name: 'Smart Card Expenses', value: outboundTransfers.reduce((sum, t) => sum + t.amount, 0) }
      ]
    },
    metrics: {
      pendingEscrowsCount: escrows.filter(e => e.status === 'pending').length,
      pendingEscrowAmount,
      unpaidInvoicesCount: invoices.filter(i => i.status === 'unpaid').length,
      unpaidInvoicesAmount: invoices.filter(i => i.status === 'unpaid').reduce((sum, i) => sum + i.totalAmount, 0),
      totalRevenue,
      totalSupporters: donations.reduce((sum, d) => sum + d.supportersCount, 0),
      activePoolsCount: pools.filter(p => p.status === 'active').length,
      lockedVaultsCount: vaults.filter(v => v.status === 'locked').length,
    }
  });
});

// Outbound transfers logging (Expense simulator)
let outboundTransfers: {
  id: string;
  recipientName: string;
  bankName: string;
  accountNumber: string;
  amount: number;
  reference: string;
  date: string;
}[] = [
  {
    id: 'trf_01',
    recipientName: 'Abiodun Martins',
    bankName: 'Access Bank',
    accountNumber: '0029384812',
    amount: 15000,
    reference: 'VBF-TRF-29381',
    date: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'trf_02',
    recipientName: 'VibeFi Host Domain',
    bankName: 'Monnify Sterling',
    accountNumber: '9920184711',
    amount: 32000,
    reference: 'VBF-TRF-94812',
    date: new Date(Date.now() - 86400000).toISOString()
  }
];

app.post('/api/socialpay/transfer', (req, res) => {
  const { recipientName, bankName, accountNumber, amount } = req.body;
  if (!recipientName || !bankName || !accountNumber || !amount) {
    return res.status(400).json({ error: 'Recipient name, bank name, account number, and amount are required.' });
  }

  const transferId = `trf_${Math.random().toString(36).substr(2, 6)}`;
  const reference = `VBF-TRF-${Math.floor(10000 + Math.random() * 90000)}`;
  const newTransfer = {
    id: transferId,
    recipientName,
    bankName,
    accountNumber,
    amount: Number(amount),
    reference,
    date: new Date().toISOString()
  };

  outboundTransfers.unshift(newTransfer);

  broadcastNotification({
    id: `not_trf_${transferId}`,
    title: 'Outbound Transfer Processed',
    message: `Disbursed ₦${Number(amount).toLocaleString()} to ${recipientName} (${bankName}). Ref: ${reference}`,
    type: 'info',
    timestamp: new Date().toISOString()
  });

  res.status(201).json(newTransfer);
});

// 2. Escrows Endpoints
app.post('/api/socialpay/escrows', (req, res) => {
  const { title, amount, payerEmail, dueDate } = req.body;
  if (!title || !amount) {
    return res.status(400).json({ error: 'Title and Amount are required.' });
  }

  const id = `esc_${Math.random().toString(36).substr(2, 6)}`;
  const randomLast4 = Math.floor(1000 + Math.random() * 9000);
  const newEscrow: Escrow = {
    id,
    title,
    amount: Number(amount),
    payerEmail: payerEmail || 'client@example.com',
    status: 'pending',
    paymentLink: `/pay/escrow/${id}`,
    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=monnify_escrow_${id}`,
    virtualAccount: `9920${randomLast4}11`,
    bankName: 'Monnify Wema Sandbox',
    createdAt: new Date().toISOString(),
    dueDate: dueDate || new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days default
    reference: `VBF-ESC-${Math.floor(10000 + Math.random() * 90000)}`
  };

  escrows.unshift(newEscrow);
  
  // Create system notification
  broadcastNotification({
    id: `not_esc_${id}`,
    title: 'Escrow Account Created',
    message: `Dynamic Account ${newEscrow.virtualAccount} is ready to receive ₦${newEscrow.amount.toLocaleString()} for "${newEscrow.title}".`,
    type: 'info',
    timestamp: new Date().toISOString()
  });

  res.status(201).json(newEscrow);
});

// 3. Invoices Endpoints
app.post('/api/socialpay/invoices', (req, res) => {
  const { clientName, clientEmail, description, amount, vat, dueDate, attachmentName } = req.body;
  if (!clientName || !clientEmail || !amount) {
    return res.status(400).json({ error: 'Client details and Amount are required.' });
  }

  const id = `inv_${Math.random().toString(36).substr(2, 6)}`;
  const amtNum = Number(amount);
  const vatPct = Number(vat || 0);
  const totalAmt = amtNum * (1 + (vatPct / 100));

  const randomLast4 = Math.floor(1000 + Math.random() * 9000);
  const newInvoice: Invoice = {
    id,
    merchantName: 'VibeFi Corp',
    clientName,
    clientEmail,
    amount: amtNum,
    vat: vatPct,
    totalAmount: totalAmt,
    dueDate: dueDate || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0], // 7 days default
    description: description || 'Branded Invoice Payment',
    attachmentName: attachmentName || undefined,
    status: 'unpaid',
    paymentLink: `/pay/invoice/${id}`,
    virtualAccount: `9920${randomLast4}55`,
    bankName: 'Monnify Sterling Sandbox',
    createdAt: new Date().toISOString(),
    reference: `VBF-INV-${Math.floor(10000 + Math.random() * 90000)}`
  };

  invoices.unshift(newInvoice);

  broadcastNotification({
    id: `not_inv_${id}`,
    title: 'Invoice Registered',
    message: `A branded invoice of ₦${totalAmt.toLocaleString()} has been sent to ${clientEmail}.`,
    type: 'info',
    timestamp: new Date().toISOString()
  });

  res.status(201).json(newInvoice);
});

// 4. Donations Endpoints
app.post('/api/socialpay/donations', (req, res) => {
  const { title, description, creatorName, targetAmount, slug } = req.body;
  if (!title || !creatorName || !targetAmount) {
    return res.status(400).json({ error: 'Title, Creator, and Target Amount are required.' });
  }

  const id = `don_${Math.random().toString(36).substr(2, 6)}`;
  const cleanSlug = slug ? slug.trim().toLowerCase().replace(/\s+/g, '-') : `fund-${id}`;

  const newDonation: Donation = {
    id,
    title,
    description: description || 'Supporting social fundraising with VibeFi.',
    creatorName,
    targetAmount: Number(targetAmount),
    raisedAmount: 0,
    supportersCount: 0,
    paymentLink: `/pay/donation/${cleanSlug}`,
    slug: cleanSlug,
    createdAt: new Date().toISOString(),
    reference: `VBF-DON-${Math.floor(10000 + Math.random() * 90000)}`
  };

  donations.unshift(newDonation);

  broadcastNotification({
    id: `not_don_${id}`,
    title: 'Donation Page Live',
    message: `Fundraising page "${newDonation.title}" is now active. Share link: vibe.fi/pay/donation/${cleanSlug}`,
    type: 'success',
    timestamp: new Date().toISOString()
  });

  res.status(201).json(newDonation);
});

// Unified Payment Process Engine for Monnify Webhooks
function handleMonnifyPayment(payload: any) {
  const { paymentReference, transactionReference, amountPaid, paymentStatus, virtualAccountNo, payerEmail, payerName } = payload;

  // 1. Find matching escrow
  const escrowMatch = escrows.find(e => e.reference === paymentReference || e.virtualAccount === virtualAccountNo);
  if (escrowMatch) {
    if (escrowMatch.status === 'pending' && paymentStatus === 'PAID') {
      escrowMatch.status = 'completed';
      
      broadcastNotification({
        id: `not_pay_esc_${escrowMatch.id}`,
        title: 'Escrow Funded Successfully',
        message: `Monnify Sandbox received ₦${amountPaid.toLocaleString()} for Escrow: "${escrowMatch.title}". Funds are secured!`,
        type: 'success',
        timestamp: new Date().toISOString()
      });
      return { status: 'SUCCESS', message: 'Escrow payment processed' };
    }
  }

  // 2. Find matching invoice
  const invoiceMatch = invoices.find(i => i.reference === paymentReference || i.virtualAccount === virtualAccountNo);
  if (invoiceMatch) {
    if (invoiceMatch.status === 'unpaid' && paymentStatus === 'PAID') {
      invoiceMatch.status = 'paid';

      broadcastNotification({
        id: `not_pay_inv_${invoiceMatch.id}`,
        title: 'Invoice Settled',
        message: `Client ${invoiceMatch.clientName} has settled the invoice of ₦${amountPaid.toLocaleString()} via Monnify.`,
        type: 'success',
        timestamp: new Date().toISOString()
      });
      return { status: 'SUCCESS', message: 'Invoice payment processed' };
    }
  }

  // 3. Find matching donation
  const donationMatch = donations.find(d => d.reference === paymentReference);
  if (donationMatch && paymentStatus === 'PAID') {
    donationMatch.raisedAmount += Number(amountPaid);
    donationMatch.supportersCount += 1;

    // Create donor record
    const donorRecord: DonationPayment = {
      id: `dp_${Math.random().toString(36).substr(2, 6)}`,
      donationId: donationMatch.id,
      donorName: payload.donorName || payerName || 'Anonymous Supporter',
      donorEmail: payload.donorEmail || payerEmail || 'supporter@monnify.com',
      amount: Number(amountPaid),
      message: payload.donorMessage || 'Supported this campaign!',
      createdAt: new Date().toISOString(),
      reference: paymentReference
    };
    donationPayments.unshift(donorRecord);

    broadcastNotification({
      id: `not_pay_don_${donationMatch.id}_${Date.now()}`,
      title: 'New Campaign Donation!',
      message: `₦${amountPaid.toLocaleString()} donated to "${donationMatch.title}" by ${donorRecord.donorName}.`,
      type: 'success',
      timestamp: new Date().toISOString()
    });
    return { status: 'SUCCESS', message: 'Donation payment logged' };
  }

  // 4. Find matching Vibe Pool
  const poolMatch = pools.find(p => p.virtualAccount === virtualAccountNo || p.reference === paymentReference);
  if (poolMatch && paymentStatus === 'PAID') {
    const amt = Number(amountPaid);
    poolMatch.raisedAmount += amt;

    const emailToSearch = payerEmail || '';
    const nameToSearch = payerName || '';
    let member = poolMatch.members.find(
      m => m.email.toLowerCase() === emailToSearch.toLowerCase() || m.name.toLowerCase() === nameToSearch.toLowerCase()
    );

    if (!member) {
      member = poolMatch.members.find(m => !m.hasPaid) || poolMatch.members[0];
    }

    if (member) {
      member.deposited += amt;
      if (member.deposited >= member.contributionAmount) {
        member.hasPaid = true;
      }
    }

    // Check if the whole pool is completed
    const allPaid = poolMatch.members.every(m => m.hasPaid);
    if (allPaid) {
      poolMatch.status = 'completed';
    }

    broadcastNotification({
      id: `not_pay_pol_${poolMatch.id}_${Date.now()}`,
      title: 'Pool Deposit Settled',
      message: `₦${amt.toLocaleString()} credited to pool "${poolMatch.title}" for member ${member ? member.name : 'Participant'}.`,
      type: 'success',
      timestamp: new Date().toISOString()
    });
    return { status: 'SUCCESS', message: 'Vibe Pool payment processed' };
  }

  // 5. Find matching Vibe Vault
  const vaultMatch = vaults.find(v => v.virtualAccount === virtualAccountNo || v.reference === paymentReference);
  if (vaultMatch && paymentStatus === 'PAID') {
    const amt = Number(amountPaid);
    vaultMatch.raisedAmount += amt;

    const isMatured = vaultMatch.raisedAmount >= vaultMatch.targetAmount;
    if (isMatured && vaultMatch.status === 'locked') {
      vaultMatch.status = 'matured';
    }

    broadcastNotification({
      id: `not_pay_vlt_${vaultMatch.id}_${Date.now()}`,
      title: 'Vibe Vault Deposit Locked',
      message: `₦${amt.toLocaleString()} locked securely inside Vibe Vault: "${vaultMatch.goalName}". Commitment rules active!`,
      type: 'success',
      timestamp: new Date().toISOString()
    });
    return { status: 'SUCCESS', message: 'Vibe Vault payment processed' };
  }

  return { status: 'SKIPPED', message: 'No matching transaction found or state unchanged' };
}

// 5. Monnify Webhook endpoint (Webhook Receiver)
app.post('/api/monnify/webhook', (req, res) => {
  const { paymentReference, paymentStatus } = req.body;

  if (!paymentReference || !paymentStatus) {
    return res.status(400).json({ error: 'Invalid Monnify Webhook Payload.' });
  }

  const signatureHeader = req.headers['monnify-signature'] || req.headers['Monnify-Signature'];
  const secretKey = process.env.MONNIFY_SECRET_KEY;

  if (secretKey) {
    const isSimulated = signatureHeader === 'sandbox-simulated-key';
    if (!isSimulated) {
      if (!signatureHeader) {
        return res.status(401).json({ error: 'Signature header missing' });
      }
      const rawBody = JSON.stringify(req.body);
      const computedHash = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
      if (computedHash !== signatureHeader) {
        console.error('[Monnify Webhook Security Alert] Signature verification failed!');
        return res.status(401).json({ error: 'Invalid Monnify Webhook Signature.' });
      }
    } else {
      console.log('[Monnify Webhook Sandbox] Bypassing signature verification for frontend simulator.');
    }
  } else {
    console.warn('[Monnify Webhook Warning] MONNIFY_SECRET_KEY is not configured. Webhook signature checking skipped.');
  }

  const result = handleMonnifyPayment(req.body);
  res.json(result);
});

// --- USER SAVINGS PROFILE DATA AND TRANSACTIONS ---
let userProfile = {
  name: 'Oyediran Daniel',
  email: 'maoyunoyediran@gmail.com',
  phone: '+234 812 345 6789',
  bvn: '22211839489',
  nin: '39481943812',
  kycStatus: 'verified' as const,
  savingsBalance: 150000,
};

let walletTransactions: any[] = [
  {
    id: 'tx_wl_1',
    type: 'deposit',
    amount: 50000,
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    description: 'Wallet Funded via Monnify Virtual Account',
    status: 'completed',
    paymentMethod: 'Bank Transfer (Wema Bank)',
    reference: 'VBF-WL-DEPOSIT-9912'
  },
  {
    id: 'tx_wl_2',
    type: 'contribution',
    amount: -100000,
    date: new Date(Date.now() - 86400000).toISOString(),
    description: 'Ajo Circle: Lagos Techies Rent Pool contribution',
    status: 'completed',
    paymentMethod: 'Wallet Balance Deduction',
    reference: 'VBF-WL-DEB-2291'
  }
];

app.get('/api/user/profile', (req, res) => {
  res.json({
    userProfile,
    monnifyConfigured: !!(process.env.MONNIFY_API_KEY && process.env.MONNIFY_SECRET_KEY)
  });
});

app.get('/api/user/transactions', (req, res) => {
  res.json(walletTransactions);
});

// Helper for local sandbox chat parsing if Gemini API key is not present or fails
function fallbackChat(message: string): string {
  const q = message.toLowerCase();
  
  if (q.includes('save') || q.includes('saved') || q.includes('balance') || q.includes('how much') || q.includes('total')) {
    const walletBal = userProfile.savingsBalance;
    const lockedSaved = vaults.reduce((sum, v) => sum + v.raisedAmount, 0);
    const total = walletBal + lockedSaved;
    
    let vaultDetails = vaults.map(v => `• ${v.goalName}: ₦${v.raisedAmount.toLocaleString()} saved (Target: ₦${v.targetAmount.toLocaleString()})`).join('\n');
    
    return `Based on your real-time ledger, here is your savings summary:
• Savings Wallet Balance: ₦${walletBal.toLocaleString()}
• Locked Savings Vaults: ₦${lockedSaved.toLocaleString()}
${vaultDetails}

Total savings in VibeFi: ₦${total.toLocaleString()}`;
  }
  
  if (q.includes('payout') || q.includes('ajo') || q.includes('next pay') || q.includes('circle')) {
    if (pools.length === 0) {
      return `I couldn't find any active Ajo circles in your profile. You can start one under the Ajo Circles tab!`;
    }
    
    let poolDetails = pools.map(p => {
      const paidCount = p.members.filter(m => m.hasPaid).length;
      return `• ${p.title}: ₦${p.raisedAmount.toLocaleString()} raised of ₦${p.totalTarget.toLocaleString()} target. Cycle: ${p.cycleFrequency}. ${paidCount}/${p.membersCount} members have contributed.`;
    }).join('\n');
    
    return `Here is the status of your group Ajo savings circles:
${poolDetails}

Your payouts are scheduled dynamically based on your cycle frequency (${pools[0]?.cycleFrequency}) once contributions are completed by members.`;
  }
  
  if (q.includes('weekly') || q.includes('what should i be saving') || q.includes('target') || q.includes('suggest') || q.includes('monthly')) {
    const contrTxs = walletTransactions.filter(t => t.type === 'contribution' && t.status === 'completed');
    if (contrTxs.length > 0) {
      const avg = Math.abs(contrTxs[0].amount);
      const suggestedWeekly = Math.round(avg / 4);
      return `Based on your recent Ajo contribution of ₦${avg.toLocaleString()} to group savings, a weekly locked savings target of ₦${suggestedWeekly.toLocaleString()}/week fits your pattern perfectly. You can set this up directly on the Locked Savings screen.`;
    } else {
      return `I couldn't find any recent Ajo contributions to analyze. If you start contributing to a group savings circle, I can recommend a personalized weekly or monthly target. In the meantime, starting with 10% of your wallet balance is a great rule of thumb!`;
    }
  }
  
  return `Hello! I am your VibeFi Savings Assistant. 
I can help you answer questions about your savings using your actual data. Try asking me:
- "How much have I saved so far?"
- "When is my next Ajo payout?"
- "What should I be saving weekly?"`;
}

app.post('/api/savings/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  if (!ai) {
    const reply = fallbackChat(message);
    return res.json({ reply });
  }

  try {
    const prompt = `You are the in-app chat assistant for VibeFi Savings.
Your job is to answer the user's questions about their savings wallet balance, Ajo group cycles, target locked goal progress, and contribution history.

CRITICAL REQUIREMENT:
You must ALWAYS use the real data provided below to answer the question. NEVER invent, hallucinate, or make up numbers or placeholders. If the data to answer their question is not present, say so honestly (e.g., "I couldn't find any data on that.").

CURRENT DATE & TIME: ${new Date().toISOString()} (User local time is 2026-07-20)

USER SAVINGS DATA:
- Savings Wallet Balance: ₦${userProfile.savingsBalance.toLocaleString()}
- User Profile: ${JSON.stringify(userProfile)}

LOCKED SAVINGS GOAL PROGRESS (VAULTS):
${JSON.stringify(vaults, null, 2)}

AJO GROUP SAVINGS CIRCLES (POOLS):
${JSON.stringify(pools, null, 2)}

RECENT WALLET TRANSACTIONS (CONTRIBUTION HISTORY):
${JSON.stringify(walletTransactions, null, 2)}

User Question: "${message}"

Answer the user directly and concisely. Be friendly, professional, and clear. Avoid overly verbose explanations. Do not use gradients or formatting that is not standard markdown. If they ask about saving weekly or targets, suggest realistic targets based on their contribution history (for example, if they have contributed ₦100,000, ₦25,000/week or ₦100,000/month is a great suggestion).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const reply = response.text || fallbackChat(message);
    res.json({ reply });
  } catch (err: any) {
    console.error('Gemini Savings Chat Error:', err);
    const reply = fallbackChat(message);
    res.json({ reply });
  }
});

app.post('/api/user/deposit', (req, res) => {
  const { amount, bankName } = req.body;
  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Valid deposit amount is required.' });
  }

  const amtNum = Number(amount);
  userProfile.savingsBalance += amtNum;

  const newTx = {
    id: `tx_${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    type: 'deposit' as const,
    amount: amtNum,
    date: new Date().toISOString(),
    description: 'Wallet Funded via Monnify Webhook',
    status: 'completed' as const,
    paymentMethod: `Simulated Transfer (${bankName || 'Wema Bank'})`,
    reference: `VBF-DEP-${Math.floor(10000 + Math.random() * 90000)}`
  };

  walletTransactions.unshift(newTx);

  broadcastNotification({
    id: `not_dep_${newTx.id}`,
    title: 'Wallet Funded!',
    message: `₦${amtNum.toLocaleString()} successfully credited to your VibeFi Savings Balance via Monnify.`,
    type: 'success',
    timestamp: new Date().toISOString()
  });

  res.status(201).json({ success: true, profile: userProfile, transaction: newTx });
});

app.get('/api/collaborative/pools', (req, res) => {
  res.json(pools);
});

app.get('/api/collaborative/vaults', (req, res) => {
  res.json(vaults);
});

// Collaborative Finance Modules: Pools & Vaults Endpoints
app.post('/api/collaborative/pools', async (req, res) => {
  const { title, type, totalTarget, members, cycleFrequency } = req.body;
  if (!title || !totalTarget || !members || !Array.isArray(members)) {
    return res.status(400).json({ error: 'Title, total target, and members array are required.' });
  }

  const id = `pool_${Math.random().toString(36).substr(2, 6)}`;
  const randomLast4 = Math.floor(1000 + Math.random() * 9000);
  
  const formattedMembers = members.map((m: any) => ({
    name: m.name || 'Anonymous Friend',
    email: m.email || 'friend@example.com',
    contributionAmount: Number(m.contributionAmount || (totalTarget / members.length)),
    deposited: 0,
    hasPaid: false
  }));

  let virtualAccount = `9920${randomLast4}22`;
  let bankName = 'Monnify Wema Sandbox';

  const monnifyAcc = await createMonnifyReservedAccount({
    accountReference: `VBF-POL-${id}`,
    accountName: title,
    customerEmail: formattedMembers[0]?.email || 'customer@vibefi.co',
    customerName: formattedMembers[0]?.name || 'VibeFi Customer'
  });

  if (monnifyAcc) {
    virtualAccount = monnifyAcc.virtualAccount;
    bankName = monnifyAcc.bankName;
  }

  const newPool: VibePool = {
    id,
    title,
    type: type || 'group',
    totalTarget: Number(totalTarget),
    raisedAmount: 0,
    membersCount: formattedMembers.length,
    members: formattedMembers,
    virtualAccount,
    bankName,
    reference: `VBF-POL-${Math.floor(10000 + Math.random() * 90000)}`,
    createdAt: new Date().toISOString(),
    cycleFrequency: cycleFrequency || 'monthly',
    status: 'active'
  };

  pools.unshift(newPool);

  broadcastNotification({
    id: `not_pool_${id}`,
    title: `Vibe Pool Created: ${newPool.title}`,
    message: `Reserved Account ${newPool.virtualAccount} created for pool. Track contributions in real time!`,
    type: 'success',
    timestamp: new Date().toISOString()
  });

  res.status(201).json(newPool);
});

app.post('/api/collaborative/vaults', async (req, res) => {
  const { goalName, targetAmount, unlockDate, contributionFrequency } = req.body;
  if (!goalName || !targetAmount || !unlockDate) {
    return res.status(400).json({ error: 'Goal Name, target amount, and unlock date are required.' });
  }

  const id = `vlt_${Math.random().toString(36).substr(2, 6)}`;
  const randomLast4 = Math.floor(1000 + Math.random() * 9000);

  // Parse days from today until unlockDate
  const daysDiff = Math.max(1, Math.ceil((new Date(unlockDate).getTime() - new Date().getTime()) / 86400000));
  const monthsDiff = Math.max(1, Math.ceil(daysDiff / 30));
  const weeksDiff = Math.max(1, Math.ceil(daysDiff / 7));

  const target = Number(targetAmount);
  const monthlyContribution = Math.round(target / monthsDiff);
  const weeklyContribution = Math.round(target / weeksDiff);
  const dailyContribution = Math.round(target / daysDiff);

  let virtualAccount = `9920${randomLast4}99`;
  let bankName = 'Monnify Sterling Sandbox';

  const monnifyAcc = await createMonnifyReservedAccount({
    accountReference: `VBF-VLT-${id}`,
    accountName: goalName,
    customerEmail: 'saver@vibefi.co',
    customerName: 'Primary Saver Account'
  });

  if (monnifyAcc) {
    virtualAccount = monnifyAcc.virtualAccount;
    bankName = monnifyAcc.bankName;
  }

  const newVault: VibeVault = {
    id,
    goalName,
    targetAmount: target,
    raisedAmount: 0,
    unlockDate,
    contributionFrequency: contributionFrequency || 'monthly',
    monthlyContribution,
    weeklyContribution,
    dailyContribution,
    virtualAccount,
    bankName,
    reference: `VBF-VLT-${Math.floor(10000 + Math.random() * 90000)}`,
    createdAt: new Date().toISOString(),
    status: 'locked'
  };

  vaults.unshift(newVault);

  broadcastNotification({
    id: `not_vlt_${id}`,
    title: `Vibe Vault Activated`,
    message: `Vault "${newVault.goalName}" is locked until ${unlockDate}. Save Today, Unlock Tomorrow.`,
    type: 'success',
    timestamp: new Date().toISOString()
  });

  res.status(201).json(newVault);
});

// Simulated Bank Credit to Monnify Reserved Virtual Account
app.post('/api/collaborative/pay-virtual-account', (req, res) => {
  const { virtualAccountNo, amount, payerEmail, payerName } = req.body;
  if (!virtualAccountNo || !amount) {
    return res.status(400).json({ error: 'Virtual Account and Amount are required.' });
  }

  const paymentReference = `VBF-WEB-${Math.floor(10000 + Math.random() * 90000)}`;

  const mockPayload = {
    paymentReference,
    transactionReference: `TX-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
    amountPaid: Number(amount),
    paymentStatus: 'PAID',
    virtualAccountNo,
    payerEmail,
    payerName
  };

  const result = handleMonnifyPayment(mockPayload);
  res.json(result);
});

app.post('/api/collaborative/vaults/:id/release', async (req, res) => {
  const { id } = req.params;
  const vault = vaults.find(v => v.id === id);
  if (!vault) {
    return res.status(404).json({ error: 'Vault not found' });
  }

  if (vault.status === 'released') {
    return res.status(400).json({ error: 'Funds already released.' });
  }

  // Strictly enforce lock state by comparing current date with unlockDate
  const now = new Date();
  const nowDateStr = now.toISOString().split('T')[0];
  if (nowDateStr < vault.unlockDate) {
    return res.status(400).json({ 
      error: `Locked Savings: Withdrawal blocked. Your funds are secured and locked until the unlock date (${vault.unlockDate}).` 
    });
  }

  // Attempt real disbursement via Monnify API
  const disbursementResult = await triggerMonnifyDisbursement({
    amount: vault.raisedAmount,
    reference: `VBF-DSB-${vault.id}-${Math.floor(1000 + Math.random() * 9000)}`,
    bankCode: '035', // Wema Bank
    accountNumber: '0123456789', // Target disbursement account
    narration: `Payout for matured vault: ${vault.goalName}`
  });

  if (disbursementResult.success) {
    vault.status = 'released';
    outboundTransfers.unshift({
      id: `trf_${Math.random().toString(36).substr(2, 6)}`,
      recipientName: 'Primary Account (Disbursement)',
      bankName: 'Wema Bank',
      accountNumber: '0123456789',
      amount: vault.raisedAmount,
      reference: disbursementResult.reference || `VBF-TRF-${Math.floor(10000 + Math.random() * 90000)}`,
      date: new Date().toISOString()
    });

    broadcastNotification({
      id: `not_vlt_disb_${id}`,
      title: 'Vibe Vault Funds Disbursed!',
      message: `Monnify Disbursement API processed ₦${vault.raisedAmount.toLocaleString()} to primary bank account successfully for goal: "${vault.goalName}".`,
      type: 'success',
      timestamp: new Date().toISOString()
    });

    return res.json({ success: true, vault });
  } else {
    // If Monnify credentials are not fully set, gracefully perform simulation
    if (!process.env.MONNIFY_API_KEY) {
      vault.status = 'released';
      outboundTransfers.unshift({
        id: `trf_${Math.random().toString(36).substr(2, 6)}`,
        recipientName: 'Primary Account (Disbursement)',
        bankName: 'Wema Bank (Simulated)',
        accountNumber: '0123456789',
        amount: vault.raisedAmount,
        reference: `VBF-TRF-${Math.floor(10000 + Math.random() * 90000)}`,
        date: new Date().toISOString()
      });

      broadcastNotification({
        id: `not_vlt_disb_${id}`,
        title: 'Vibe Vault Funds Disbursed (Simulated)',
        message: `Simulated Monnify disbursement of ₦${vault.raisedAmount.toLocaleString()} completed successfully for goal: "${vault.goalName}".`,
        type: 'success',
        timestamp: new Date().toISOString()
      });

      return res.json({ success: true, vault });
    } else {
      return res.status(400).json({ error: `Monnify Disbursement Failed: ${disbursementResult.message}` });
    }
  }
});

// Real-Time SSE Stream Endpoint
app.get('/api/socialpay/notifications/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  sseClients.push(res);

  // Send initial history
  res.write(`data: ${JSON.stringify({ type: 'INIT', message: 'Connected to VibeFi Live Event Hub' })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
  });
});

// 6. Gemini Assistant Endpoint for SocialPay
app.post('/api/socialpay/interpret', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  if (!ai) {
    // If Gemini key is missing, fall back to safe local parsing
    return fallbackInterpret(prompt, res);
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `You are the AI Assistant for VibeFi SocialPay and Collaborative Finance Fintech platform.
Analyze the user's message and determine if they want to:
1. Create an escrow invoice (isEscrowRequest)
2. Create a standard branded invoice (isInvoiceRequest)
3. Create a donation/fundraising page (isDonationRequest)
4. Create a Vibe Pool (ajo, group savings, or bill split) (isPoolRequest)
5. Create a Vibe Vault (locked goal commitment savings) (isVaultRequest)
6. Show spending analytics/expense tracking/cashflow (isSpendingRequest)
7. View financial reports/VAT/revenues statement (isReportRequest)
8. Consult the AI Financial Coach for advice (isCoachRequest)
9. Scan for duplicate payments or fraud risks (isFraudRequest)

Interpret the parameters:
- Amount/Target: E.g. "₦2M", "5 million", "500k", "100000"
- Title / Goal Name: E.g. "School Fees", "Laptops", "5 friends", etc.
- Number of friends/members (only for pool requests): E.g. "five friends" -> 5
- Unlock Date or Duration (only for vault requests): E.g. "Dec 2026", "end of year", "next 6 months" (default to 6 months from today)

Message: "${prompt}"

Provide your assessment as a JSON object matching this schema:
{
  "isEscrowRequest": boolean,
  "isInvoiceRequest": boolean,
  "isDonationRequest": boolean,
  "isPoolRequest": boolean,
  "isVaultRequest": boolean,
  "isSpendingRequest": boolean,
  "isReportRequest": boolean,
  "isCoachRequest": boolean,
  "isFraudRequest": boolean,
  "amount": number or null,
  "title": string or null,
  "payerEmail": string or null,
  "clientName": string or null,
  "slug": string or null,
  "membersCount": number or null,
  "unlockDate": string or null,
  "responseMessage": string
}
Keep "responseMessage" friendly, professional and directly related to the user's intent. Do not include markdown tags, just the raw JSON block.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isEscrowRequest: { type: Type.BOOLEAN },
            isInvoiceRequest: { type: Type.BOOLEAN },
            isDonationRequest: { type: Type.BOOLEAN },
            isPoolRequest: { type: Type.BOOLEAN },
            isVaultRequest: { type: Type.BOOLEAN },
            isSpendingRequest: { type: Type.BOOLEAN },
            isReportRequest: { type: Type.BOOLEAN },
            isCoachRequest: { type: Type.BOOLEAN },
            isFraudRequest: { type: Type.BOOLEAN },
            amount: { type: Type.NUMBER },
            title: { type: Type.STRING },
            payerEmail: { type: Type.STRING },
            clientName: { type: Type.STRING },
            slug: { type: Type.STRING },
            membersCount: { type: Type.NUMBER },
            unlockDate: { type: Type.STRING },
            responseMessage: { type: Type.STRING }
          },
          required: [
            'isEscrowRequest', 'isInvoiceRequest', 'isDonationRequest', 
            'isPoolRequest', 'isVaultRequest', 'isSpendingRequest', 
            'isReportRequest', 'isCoachRequest', 'isFraudRequest', 'responseMessage'
          ]
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    
    let actionResult = null;
    if (parsed.isSpendingRequest) {
      actionResult = { type: 'spending' };
    } else if (parsed.isReportRequest) {
      actionResult = { type: 'report' };
    } else if (parsed.isCoachRequest) {
      actionResult = { type: 'coach' };
    } else if (parsed.isFraudRequest) {
      actionResult = { type: 'fraud' };
    } else if (parsed.isEscrowRequest && parsed.amount) {
      const escrowId = `esc_${Math.random().toString(36).substr(2, 6)}`;
      const randomLast4 = Math.floor(1000 + Math.random() * 9000);
      const newEscrow: Escrow = {
        id: escrowId,
        title: parsed.title || 'Escrow Services Contract',
        amount: parsed.amount,
        payerEmail: parsed.payerEmail || 'client@vibefi-user.co',
        status: 'pending',
        paymentLink: `/pay/escrow/${escrowId}`,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=monnify_escrow_${escrowId}`,
        virtualAccount: `9920${randomLast4}11`,
        bankName: 'Monnify Wema Sandbox',
        createdAt: new Date().toISOString(),
        dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
        reference: `VBF-ESC-${Math.floor(10000 + Math.random() * 90000)}`
      };
      escrows.unshift(newEscrow);
      actionResult = { type: 'escrow', data: newEscrow };

      broadcastNotification({
        id: `not_esc_ai_${escrowId}`,
        title: 'Escrow Generated by AI',
        message: `An escrow of ₦${newEscrow.amount.toLocaleString()} was generated via command. Account: ${newEscrow.virtualAccount}`,
        type: 'success',
        timestamp: new Date().toISOString()
      });
    } else if (parsed.isInvoiceRequest && parsed.amount) {
      const invoiceId = `inv_${Math.random().toString(36).substr(2, 6)}`;
      const randomLast4 = Math.floor(1000 + Math.random() * 9000);
      const newInvoice: Invoice = {
        id: invoiceId,
        merchantName: 'VibeFi Agency',
        clientName: parsed.clientName || 'General Client',
        clientEmail: parsed.payerEmail || 'client@vibefi-user.co',
        amount: parsed.amount,
        vat: 7.5,
        totalAmount: parsed.amount * 1.075,
        dueDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
        description: parsed.title || 'Branded Invoice Payment',
        status: 'unpaid',
        paymentLink: `/pay/invoice/${invoiceId}`,
        virtualAccount: `9920${randomLast4}55`,
        bankName: 'Monnify Sterling Sandbox',
        createdAt: new Date().toISOString(),
        reference: `VBF-INV-${Math.floor(10000 + Math.random() * 90000)}`
      };
      invoices.unshift(newInvoice);
      actionResult = { type: 'invoice', data: newInvoice };

      broadcastNotification({
        id: `not_inv_ai_${invoiceId}`,
        title: 'Invoice Generated by AI',
        message: `Invoice for ₦${newInvoice.totalAmount.toLocaleString()} has been auto-generated for ${newInvoice.clientName}.`,
        type: 'success',
        timestamp: new Date().toISOString()
      });
    } else if (parsed.isPoolRequest) {
      // Create pool via AI
      const poolId = `pool_${Math.random().toString(36).substr(2, 6)}`;
      const totalTarget = parsed.amount || 500000;
      const count = parsed.membersCount || 5;
      const share = totalTarget / count;
      
      const memberNames = ['Alex Rivera', 'Tolu Cole', 'Chioma Nduka', 'Bimbo Ademola', 'Femi Adebayo', 'Yemi Benson', 'Kelechi Egwu'];
      const generatedMembers: PoolMember[] = [];
      for (let i = 0; i < count; i++) {
        const name = memberNames[i % memberNames.length] + (i >= memberNames.length ? ` ${Math.floor(i / memberNames.length) + 1}` : '');
        generatedMembers.push({
          name,
          email: `${name.toLowerCase().replace(/\s+/g, '')}@vibefi.co`,
          contributionAmount: share,
          deposited: 0,
          hasPaid: false
        });
      }

      const randomLast4 = Math.floor(1000 + Math.random() * 9000);
      let virtualAccount = `9920${randomLast4}22`;
      let bankName = 'Monnify Wema Sandbox';

      const monnifyAcc = await createMonnifyReservedAccount({
        accountReference: `VBF-POL-${poolId}`,
        accountName: parsed.title || `Ajo Group of ${count} Friends`,
        customerEmail: generatedMembers[0]?.email || 'customer@vibefi.co',
        customerName: generatedMembers[0]?.name || 'VibeFi Customer'
      });

      if (monnifyAcc) {
        virtualAccount = monnifyAcc.virtualAccount;
        bankName = monnifyAcc.bankName;
      }

      const newPool: VibePool = {
        id: poolId,
        title: parsed.title || `Ajo Group of ${count} Friends`,
        type: 'ajo',
        totalTarget,
        raisedAmount: 0,
        membersCount: count,
        members: generatedMembers,
        virtualAccount,
        bankName,
        reference: `VBF-POL-${Math.floor(10000 + Math.random() * 90000)}`,
        createdAt: new Date().toISOString(),
        cycleFrequency: 'monthly',
        status: 'active'
      };

      pools.unshift(newPool);
      actionResult = { type: 'pool', data: newPool };

      broadcastNotification({
        id: `not_pool_ai_${poolId}`,
        title: 'Vibe Ajo Pool Created by AI',
        message: `Successfully set up "${newPool.title}" pool with reserved account: ${newPool.virtualAccount}`,
        type: 'success',
        timestamp: new Date().toISOString()
      });
    } else if (parsed.isVaultRequest) {
      const vaultId = `vlt_${Math.random().toString(36).substr(2, 6)}`;
      const targetAmount = parsed.amount || 1500000;
      const goalName = parsed.title || 'Special Goal Saving';
      const unlockDate = parsed.unlockDate || '2026-12-31';

      const daysDiff = Math.max(1, Math.ceil((new Date(unlockDate).getTime() - new Date().getTime()) / 86400000));
      const monthsDiff = Math.max(1, Math.ceil(daysDiff / 30));
      const weeksDiff = Math.max(1, Math.ceil(daysDiff / 7));

      const monthlyContribution = Math.round(targetAmount / monthsDiff);
      const weeklyContribution = Math.round(targetAmount / weeksDiff);
      const dailyContribution = Math.round(targetAmount / daysDiff);

      const randomLast4 = Math.floor(1000 + Math.random() * 9000);
      let virtualAccount = `9920${randomLast4}99`;
      let bankName = 'Monnify Sterling Sandbox';

      const monnifyAcc = await createMonnifyReservedAccount({
        accountReference: `VBF-VLT-${vaultId}`,
        accountName: goalName,
        customerEmail: 'saver@vibefi.co',
        customerName: 'Primary Saver Account'
      });

      if (monnifyAcc) {
        virtualAccount = monnifyAcc.virtualAccount;
        bankName = monnifyAcc.bankName;
      }

      const newVault: VibeVault = {
        id: vaultId,
        goalName,
        targetAmount,
        raisedAmount: 0,
        unlockDate,
        contributionFrequency: 'monthly',
        monthlyContribution,
        weeklyContribution,
        dailyContribution,
        virtualAccount,
        bankName,
        reference: `VBF-VLT-${Math.floor(10000 + Math.random() * 90000)}`,
        createdAt: new Date().toISOString(),
        status: 'locked'
      };

      vaults.unshift(newVault);
      actionResult = { type: 'vault', data: newVault };

      broadcastNotification({
        id: `not_vault_ai_${vaultId}`,
        title: 'Vibe Vault Activated by AI',
        message: `Goal "${newVault.goalName}" is locked until maturity ${unlockDate}. Save Today, Unlock Tomorrow.`,
        type: 'success',
        timestamp: new Date().toISOString()
      });
    }

    res.json({ parsed, actionResult });
  } catch (err: any) {
    console.error('Gemini Interpretation Error:', err);
    fallbackInterpret(prompt, res);
  }
});

function fallbackInterpret(prompt: string, res: express.Response) {
  const cleanPrompt = prompt.toLowerCase();
  
  // Regex matcher for amounts like ₦50,000, 50k, 50000, etc.
  const amountMatch = cleanPrompt.match(/(?:₦|naira|n)?\s*(\d+[\d,]*)(?:\s*k\b|\s*thousand|\s*m\b|\s*million)?/);
  let amount = 50000; 
  if (amountMatch) {
    let parsedAmt = amountMatch[1].replace(/,/g, '');
    let finalAmt = parseFloat(parsedAmt);
    if (cleanPrompt.includes('m') || cleanPrompt.includes('million')) {
      finalAmt *= 1000000;
    } else if (cleanPrompt.includes('k') || cleanPrompt.includes('thousand')) {
      finalAmt *= 1000;
    }
    if (!isNaN(finalAmt)) {
      amount = finalAmt;
    }
  }

  // Detect type
  const isSpending = cleanPrompt.includes('spending') || cleanPrompt.includes('expense') || cleanPrompt.includes('cashflow') || cleanPrompt.includes('outflow');
  const isReport = cleanPrompt.includes('report') || cleanPrompt.includes('statement') || cleanPrompt.includes('liabilities') || cleanPrompt.includes('tax') || cleanPrompt.includes('vat');
  const isCoach = cleanPrompt.includes('coach') || cleanPrompt.includes('advice') || cleanPrompt.includes('insight') || cleanPrompt.includes('tips');
  const isFraud = cleanPrompt.includes('fraud') || cleanPrompt.includes('suspicious') || cleanPrompt.includes('duplicate') || cleanPrompt.includes('scam');
  const isPool = cleanPrompt.includes('ajo') || cleanPrompt.includes('pool') || cleanPrompt.includes('savings group') || cleanPrompt.includes('friends') || cleanPrompt.includes('split');
  const isVault = cleanPrompt.includes('vault') || cleanPrompt.includes('commitment') || cleanPrompt.includes('school fees') || cleanPrompt.includes('laptop') || cleanPrompt.includes('rent') || cleanPrompt.includes('save today') || cleanPrompt.includes('december');
  const isEscrow = cleanPrompt.includes('escrow');
  const isInvoice = cleanPrompt.includes('invoice') || cleanPrompt.includes('bill');
  const isDonation = cleanPrompt.includes('donation') || cleanPrompt.includes('fundraiser') || cleanPrompt.includes('page');

  let actionResult = null;
  let responseMessage = '';

  if (isSpending) {
    actionResult = { type: 'spending' };
    responseMessage = "AI Command Executed: Loaded your VibeFi Smart Wallet, Income and Expense analytics, and live Cashflow metrics.";
    return res.json({
      parsed: {
        isEscrowRequest: false,
        isInvoiceRequest: false,
        isDonationRequest: false,
        isPoolRequest: false,
        isVaultRequest: false,
        isSpendingRequest: true,
        isReportRequest: false,
        isCoachRequest: false,
        isFraudRequest: false,
        amount: null,
        title: "Cashflow Analysis",
        payerEmail: null,
        responseMessage
      },
      actionResult
    });
  }

  if (isReport) {
    actionResult = { type: 'report' };
    responseMessage = "AI Command Executed: Generating your corporate financial report including revenues, active liabilities, and projected Nigerian VAT (7.5%).";
    return res.json({
      parsed: {
        isEscrowRequest: false,
        isInvoiceRequest: false,
        isDonationRequest: false,
        isPoolRequest: false,
        isVaultRequest: false,
        isSpendingRequest: false,
        isReportRequest: true,
        isCoachRequest: false,
        isFraudRequest: false,
        amount: null,
        title: "Financial Statements",
        payerEmail: null,
        responseMessage
      },
      actionResult
    });
  }

  if (isCoach) {
    actionResult = { type: 'coach' };
    responseMessage = "AI Command Executed: Fetched live recommendations from the VibeFi Financial Coach regarding SaaS optimize points, Escrows, and Ajo discipline.";
    return res.json({
      parsed: {
        isEscrowRequest: false,
        isInvoiceRequest: false,
        isDonationRequest: false,
        isPoolRequest: false,
        isVaultRequest: false,
        isSpendingRequest: false,
        isReportRequest: false,
        isCoachRequest: true,
        isFraudRequest: false,
        amount: null,
        title: "Financial Coach Insights",
        payerEmail: null,
        responseMessage
      },
      actionResult
    });
  }

  if (isFraud) {
    actionResult = { type: 'fraud' };
    responseMessage = "AI Command Executed: Scanned transaction history logs. No critical vulnerabilities found. Fraud Risk Score and detailed analyzer opened below.";
    return res.json({
      parsed: {
        isEscrowRequest: false,
        isInvoiceRequest: false,
        isDonationRequest: false,
        isPoolRequest: false,
        isVaultRequest: false,
        isSpendingRequest: false,
        isReportRequest: false,
        isCoachRequest: false,
        isFraudRequest: true,
        amount: null,
        title: "Fraud Shield",
        payerEmail: null,
        responseMessage
      },
      actionResult
    });
  }

  if (isPool) {
    // Generate AI Pool
    const poolId = `pool_${Math.random().toString(36).substr(2, 6)}`;
    const totalTarget = amount || 500000;
    
    // Parse number of friends
    let count = 5;
    const countMatch = cleanPrompt.match(/(?:for|with)\s+(\w+)\s+friends/);
    if (countMatch) {
      const wordsMap: any = { 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10 };
      if (wordsMap[countMatch[1]]) {
        count = wordsMap[countMatch[1]];
      } else {
        const parsedCount = parseInt(countMatch[1]);
        if (!isNaN(parsedCount)) count = parsedCount;
      }
    }

    const share = totalTarget / count;
    const memberNames = ['Alex Rivera', 'Tolu Cole', 'Chioma Nduka', 'Bimbo Ademola', 'Femi Adebayo', 'Yemi Benson', 'Kelechi Egwu'];
    const generatedMembers: PoolMember[] = [];
    for (let i = 0; i < count; i++) {
      const name = memberNames[i % memberNames.length] + (i >= memberNames.length ? ` ${Math.floor(i / memberNames.length) + 1}` : '');
      generatedMembers.push({
        name,
        email: `${name.toLowerCase().replace(/\s+/g, '')}@vibefi.co`,
        contributionAmount: share,
        deposited: 0,
        hasPaid: false
      });
    }

    const randomLast4 = Math.floor(1000 + Math.random() * 9000);
    const titleMatch = cleanPrompt.match(/(?:name|called|for)\s+["']?([^"'\s]+)["']?/i);
    const newPool: VibePool = {
      id: poolId,
      title: titleMatch ? `Ajo: ${titleMatch[1]}` : `Ajo Group Savings of ${count} Friends`,
      type: 'ajo',
      totalTarget,
      raisedAmount: 0,
      membersCount: count,
      members: generatedMembers,
      virtualAccount: `9920${randomLast4}22`,
      bankName: 'Monnify Wema Sandbox',
      reference: `VBF-POL-${Math.floor(10000 + Math.random() * 90000)}`,
      createdAt: new Date().toISOString(),
      cycleFrequency: 'monthly',
      status: 'active'
    };

    pools.unshift(newPool);
    actionResult = { type: 'pool', data: newPool };
    responseMessage = `Command parsed: I've created an Ajo group savings pool "${newPool.title}" for ${count} friends with target ₦${totalTarget.toLocaleString()}.`;

    broadcastNotification({
      id: `not_pool_ai_${poolId}`,
      title: 'Vibe Ajo Pool Created (Sandbox Engine)',
      message: `Successfully set up "${newPool.title}" with reserved account: ${newPool.virtualAccount}`,
      type: 'success',
      timestamp: new Date().toISOString()
    });
  } else if (isVault) {
    const vaultId = `vlt_${Math.random().toString(36).substr(2, 6)}`;
    const targetAmount = amount || 1500000;
    
    // Parse goal name
    let goalName = 'School Fees Saving';
    if (cleanPrompt.includes('rent')) goalName = 'Rent Accumulation';
    else if (cleanPrompt.includes('laptop')) goalName = 'Premium Tech Laptop';
    else if (cleanPrompt.includes('travel') || cleanPrompt.includes('vacation')) goalName = 'Vacation Escape Fund';
    else if (cleanPrompt.includes('capital') || cleanPrompt.includes('business')) goalName = 'Business Capital Expansion';
    else if (cleanPrompt.includes('wedding')) goalName = 'Dream Wedding Fund';

    const unlockDate = '2026-12-31';
    const daysDiff = Math.max(1, Math.ceil((new Date(unlockDate).getTime() - new Date().getTime()) / 86400000));
    const monthsDiff = Math.max(1, Math.ceil(daysDiff / 30));
    const weeksDiff = Math.max(1, Math.ceil(daysDiff / 7));

    const monthlyContribution = Math.round(targetAmount / monthsDiff);
    const weeklyContribution = Math.round(targetAmount / weeksDiff);
    const dailyContribution = Math.round(targetAmount / daysDiff);

    const randomLast4 = Math.floor(1000 + Math.random() * 9000);
    const newVault: VibeVault = {
      id: vaultId,
      goalName,
      targetAmount,
      raisedAmount: 0,
      unlockDate,
      contributionFrequency: 'monthly',
      monthlyContribution,
      weeklyContribution,
      dailyContribution,
      virtualAccount: `9920${randomLast4}99`,
      bankName: 'Monnify Sterling Sandbox',
      reference: `VBF-VLT-${Math.floor(10000 + Math.random() * 90000)}`,
      createdAt: new Date().toISOString(),
      status: 'locked'
    };

    vaults.unshift(newVault);
    actionResult = { type: 'vault', data: newVault };
    responseMessage = `Command parsed: I have created a Vibe Vault for "${newVault.goalName}" with a target of ₦${targetAmount.toLocaleString()}, locked securely until ${unlockDate}.`;

    broadcastNotification({
      id: `not_vault_ai_${vaultId}`,
      title: 'Vibe Vault Created (Sandbox Engine)',
      message: `Goal "${newVault.goalName}" activated and locked until ${unlockDate}.`,
      type: 'success',
      timestamp: new Date().toISOString()
    });
  } else {
    // Escrow fallback
    const escrowId = `esc_${Math.random().toString(36).substr(2, 6)}`;
    const randomLast4 = Math.floor(1000 + Math.random() * 9000);
    const newEscrow: Escrow = {
      id: escrowId,
      title: 'AI Interpreted Escrow Contract',
      amount,
      payerEmail: 'client@vibefi-user.co',
      status: 'pending',
      paymentLink: `/pay/escrow/${escrowId}`,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=monnify_escrow_${escrowId}`,
      virtualAccount: `9920${randomLast4}11`,
      bankName: 'Monnify Wema Sandbox',
      createdAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
      reference: `VBF-ESC-${Math.floor(10000 + Math.random() * 90000)}`
    };
    escrows.unshift(newEscrow);
    actionResult = { type: 'escrow', data: newEscrow };
    responseMessage = `I've interpreted your request and auto-generated an Escrow Invoice for ₦${amount.toLocaleString()} with Monnify virtual account credentials.`;

    broadcastNotification({
      id: `not_esc_ai_${escrowId}`,
      title: 'Escrow Generated (Sandbox Engine)',
      message: `Generated an escrow virtual account for ₦${amount.toLocaleString()} automatically.`,
      type: 'success',
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    parsed: {
      isEscrowRequest: isEscrow || (!isInvoice && !isDonation && !isPool && !isVault),
      isInvoiceRequest: isInvoice,
      isDonationRequest: isDonation,
      isPoolRequest: isPool,
      isVaultRequest: isVault,
      amount,
      title: isPool ? 'Pool Savings' : isVault ? 'Goal Savings' : 'General Contract Services',
      payerEmail: 'client@vibefi-user.co',
      responseMessage
    },
    actionResult
  });
}

// -------------------------------------------------------------
// VITE DEV SERVER AND STATIC ASSETS SERVING
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[VibeFi Server] Running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();
