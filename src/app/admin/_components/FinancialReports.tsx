"use client";

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface FinancialReportsProps {
  transactions: any[];
  posTransactions: any[];
  filteredTransactions: any[];
  filteredPosTransactions: any[];
  financialTotalRevenue: number;
  totalTicketRevenue: number;
  totalPosRevenue: number;
  revenueCompositionData: any[];
  trendData: any[];
  terminalRevenueData: any[];
  allRecentTransactions: any[];
  financeFilter: string;
  setFinanceFilter: (filter: any) => void;
  PIE_COLORS: string[];
  pointMutations?: any[];
}

export default function FinancialReports({
  transactions = [],
  posTransactions = [],
  financialTotalRevenue: defaultTotalRevenue,
  totalTicketRevenue: defaultTicketRevenue,
  totalPosRevenue: defaultPosRevenue,
  revenueCompositionData: defaultComposition,
  trendData: defaultTrend,
  financeFilter,
  setFinanceFilter,
  PIE_COLORS,
  pointMutations = []
}: FinancialReportsProps) {
  const [activeTab, setActiveTab] = useState<'RINGKASAN' | 'ONLINE' | 'POS' | 'POIN'>('RINGKASAN');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  // Dynamic filter processing based on financeFilter or custom date range
  const { 
    filteredTransactions, 
    filteredPosWahanaTransactions,
    filteredPosTransactions, 
    financialTotalRevenue, 
    totalTicketRevenue, 
    totalPosRevenue,
    annualPassTxCount,
    posTxCount,
    trendData,
    revenueCompositionData
  } = (() => {
    let txs = transactions;
    let posTxs = posTransactions;
    const now = new Date();

    if (financeFilter === 'TODAY') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      txs = transactions.filter(t => new Date(t.created_at) >= todayStart);
      posTxs = posTransactions.filter(t => new Date(t.created_at) >= todayStart);
    } else if (financeFilter === 'WEEK') {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);
      txs = transactions.filter(t => new Date(t.created_at) >= weekStart);
      posTxs = posTransactions.filter(t => new Date(t.created_at) >= weekStart);
    } else if (financeFilter === 'MONTH') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      txs = transactions.filter(t => new Date(t.created_at) >= monthStart);
      posTxs = posTransactions.filter(t => new Date(t.created_at) >= monthStart);
    } else if (financeFilter === 'YEAR') {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      txs = transactions.filter(t => new Date(t.created_at) >= yearStart);
      posTxs = posTransactions.filter(t => new Date(t.created_at) >= yearStart);
    } else if (financeFilter === 'CUSTOM' && (startDate || endDate)) {
      const s = startDate ? new Date(startDate) : new Date(0);
      s.setHours(0, 0, 0, 0);
      const e = endDate ? new Date(endDate) : new Date(startDate || now);
      e.setHours(23, 59, 59, 999);

      txs = transactions.filter(t => {
        const d = new Date(t.created_at);
        return d >= s && d <= e;
      });
      posTxs = posTransactions.filter(t => {
        const d = new Date(t.created_at);
        return d >= s && d <= e;
      });
    }

    let annualPassRev = 0;
    let posRev = 0;
    let annualPassTxCount = 0;
    let posTxCount = 0;

    // 1. Kategorisasi dari tabel transactions (Annual Pass vs Wahana Top-up/Bundle)
    txs.forEach((tx: any) => {
      const isPaid = ['PAID', 'SUCCESS', 'COMPLETED'].includes(tx.payment_status) || ['PAID', 'SUCCESS', 'COMPLETED'].includes(tx.status);
      if (isPaid) {
        const amt = Number(tx.amount || tx.total_amount || 0);
        const pName = (tx.package_name || '').toUpperCase();
        const isPosWahana = pName.includes('WAHANA') || pName.includes('TOP-UP') || pName.includes('BUNDLE') || tx.merchant_order_id?.startsWith('WAHANA-') || tx.merchant_order_id?.startsWith('BUNDLE-');

        if (isPosWahana) {
          posRev += amt;
          posTxCount += 1;
        } else {
          annualPassRev += amt;
          annualPassTxCount += 1;
        }
      }
    });

    // 2. Tambahan dari pos_transactions jika ada
    posTxs.forEach((tx: any) => {
      const amt = Number(tx.amount || 0);
      if (amt > 0) {
        posRev += amt;
        posTxCount += 1;
      }
    });

    // Dynamic trend chart
    const trendMap: Record<string, { date: string; 'Annual Pass': number; 'Tiket Wahana': number }> = {};
    txs.forEach((tx: any) => {
      const isPaid = ['PAID', 'SUCCESS', 'COMPLETED'].includes(tx.payment_status) || ['PAID', 'SUCCESS', 'COMPLETED'].includes(tx.status);
      if (isPaid) {
        const dKey = new Date(tx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        if (!trendMap[dKey]) trendMap[dKey] = { date: dKey, 'Annual Pass': 0, 'Tiket Wahana': 0 };
        
        const amt = Number(tx.amount || tx.total_amount || 0);
        const pName = (tx.package_name || '').toUpperCase();
        const isPosWahana = pName.includes('WAHANA') || pName.includes('TOP-UP') || pName.includes('BUNDLE') || tx.merchant_order_id?.startsWith('WAHANA-') || tx.merchant_order_id?.startsWith('BUNDLE-');

        if (isPosWahana) {
          trendMap[dKey]['Tiket Wahana'] += amt;
        } else {
          trendMap[dKey]['Annual Pass'] += amt;
        }
      }
    });

    // Pisahkan transaksi tabel transactions menjadi Membership Online vs POS Wahana
    const onlineMembershipTxs = txs.filter((tx: any) => {
      const pName = (tx.package_name || '').toUpperCase();
      const isPosWahana = pName.includes('WAHANA') || pName.includes('TOP-UP') || pName.includes('BUNDLE') || tx.merchant_order_id?.startsWith('WAHANA-') || tx.merchant_order_id?.startsWith('BUNDLE-');
      return !isPosWahana;
    });

    const onlinePosWahanaTxs = txs.filter((tx: any) => {
      const pName = (tx.package_name || '').toUpperCase();
      const isPosWahana = pName.includes('WAHANA') || pName.includes('TOP-UP') || pName.includes('BUNDLE') || tx.merchant_order_id?.startsWith('WAHANA-') || tx.merchant_order_id?.startsWith('BUNDLE-');
      return isPosWahana;
    });

    const calculatedTrend = Object.values(trendMap).length > 0 ? Object.values(trendMap) : (defaultTrend || []);

    const comp = [
      { name: 'Membership Annual Pass', value: annualPassRev },
      { name: 'Tiket Wahana POS', value: posRev }
    ].filter(d => d.value > 0);

    return {
      filteredTransactions: onlineMembershipTxs,
      filteredPosWahanaTransactions: onlinePosWahanaTxs,
      filteredPosTransactions: posTxs,
      financialTotalRevenue: annualPassRev + posRev,
      totalTicketRevenue: annualPassRev,
      totalPosRevenue: posRev,
      annualPassTxCount,
      posTxCount,
      trendData: calculatedTrend,
      revenueCompositionData: comp.length > 0 ? comp : (defaultComposition || [])
    };
  })();

  // Calculate payment status
  const paidTransactions = filteredTransactions.filter((t: any) =>
    ['PAID', 'SUCCESS', 'COMPLETED'].includes(t.payment_status || t.status)
  );
  const pendingTransactions = filteredTransactions.filter((t: any) =>
    ['PENDING', 'PENDING_PAYMENT'].includes(t.payment_status || t.status)
  );

  const paidAmount = paidTransactions.reduce((sum: number, t: any) => sum + Number(t.amount || t.total_amount || 0), 0);
  const pendingAmount = pendingTransactions.reduce((sum: number, t: any) => sum + Number(t.amount || t.total_amount || 0), 0);

  // POS calculation (100% Cashless QRIS / Payment Gateway + Voucher Redemption)
  let totalQris = 0;
  let totalTopupTrx = 0;
  let totalVoucherRedeemed = 0;

  filteredPosTransactions.forEach((t: any) => {
    const amount = Number(t.amount || 0);
    if (amount > 0) {
      totalQris += amount;
      totalTopupTrx += 1;
    } else {
      totalVoucherRedeemed += 1;
    }
  });

  const formatCurrency = (num: number) => {
    return `Rp ${num.toLocaleString('id-ID')}`;
  };

  // Helper untuk mengubah kode teknis Duitku menjadi nama metode yang jelas
  const formatPaymentMethod = (code: string | undefined | null) => {
    if (!code) return 'Online VA / QRIS';
    const c = code.toUpperCase();
    const map: Record<string, string> = {
      'BC': 'BCA Virtual Account',
      'M1': 'Mandiri Virtual Account',
      'M2': 'Mandiri Livin',
      'VA': 'Maybank VA',
      'B1': 'CIMB Niaga VA',
      'BT': 'Permata Bank VA',
      'A1': 'ATM Bersama / Prima',
      'NC': 'Bank Neo Commerce',
      'BR': 'BRI Virtual Account',
      'SP': 'ShopeePay',
      'DA': 'DANA QRIS',
      'OV': 'OVO',
      'LQ': 'LinkAja',
      'NQ': 'Nobu QRIS',
      'VC': 'Credit Card / Visa / Master',
      'CASH': 'Tunai (Cash)',
      'QRIS': 'QRIS Dinamis',
      'EDC': 'Mesin EDC'
    };
    return map[c] || code;
  };

  const handleExportCSV = () => {
    // Generate true Excel-compatible HTML table (opens in Microsoft Excel perfectly formatted)
    let excelContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Laporan Penjualan</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 11pt; }
          th { background-color: #059669; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #047857; padding: 10px 14px; }
          td { border: 1px solid #d1d5db; padding: 8px 12px; vertical-align: middle; }
          .text-left { text-align: left; }
          .text-center { text-align: center; }
          .text-right { text-align: right; font-weight: bold; }
          .lunas { background-color: #dcfce7; color: #166534; font-weight: bold; text-align: center; }
          .pending { background-color: #fef3c7; color: #92400e; font-weight: bold; text-align: center; }
          .title { font-size: 16pt; font-weight: bold; color: #065f46; margin-bottom: 5px; }
          .subtitle { font-size: 10pt; color: #6b7280; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <div class="title">LAPORAN TRANSAKSI PENJUALAN AVIARY PARK</div>
        <div class="subtitle">Dicetak pada: ${new Date().toLocaleString('id-ID')} | Periode: ${financeFilter}</div>
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>Order ID / No. Invoice</th>
              <th>Tanggal & Waktu</th>
              <th>Kategori</th>
              <th>Nama Pembeli / Member</th>
              <th>Jenis Tiket / Wahana</th>
              <th>Metode Pembayaran</th>
              <th>Total Penjualan (Rp)</th>
              <th>Status</th>
              <th>Lokasi / Kasir</th>
            </tr>
          </thead>
          <tbody>
    `;

    let rowNumber = 1;
    let totalRevenueSum = 0;

    // 1. Transaksi Online Membership (Jika di Tab Ringkasan atau Tab Online)
    if (activeTab === 'RINGKASAN' || activeTab === 'ONLINE') {
      filteredTransactions.forEach((t: any) => {
        const amt = Number(t.amount || t.total_amount || 0);
        const buyer = t.buyer_name || t.customer_name || '-';
        const packageName = t.package_name || 'Annual Pass Membership';
        const orderId = t.merchant_order_id || t.id || '-';
        const method = formatPaymentMethod(t.payment_method);
        const isPaid = ['PAID', 'SUCCESS', 'COMPLETED'].includes(t.payment_status || t.status);
        const statusText = isPaid ? 'LUNAS' : (t.payment_status || t.status || 'PENDING');
        
        if (isPaid) totalRevenueSum += amt;

        excelContent += `
          <tr>
            <td class="text-center">${rowNumber++}</td>
            <td class="text-left" style="mso-number-format:'\\@';">${orderId}</td>
            <td class="text-center">${new Date(t.created_at).toLocaleString('id-ID')}</td>
            <td class="text-center">Website (Annual Pass)</td>
            <td class="text-left">${buyer}</td>
            <td class="text-left">${packageName}</td>
            <td class="text-center">${method}</td>
            <td class="text-right">Rp ${amt.toLocaleString('id-ID')}</td>
            <td class="${isPaid ? 'lunas' : 'pending'}">${statusText}</td>
            <td class="text-left">Duitku Gateway</td>
          </tr>
        `;
      });
    }

    // 2. Transaksi POS Kasir (QRIS Wahana & Bundling) (Jika di Tab Ringkasan atau Tab POS)
    if (activeTab === 'RINGKASAN' || activeTab === 'POS') {
      filteredPosWahanaTransactions.forEach((t: any) => {
        const amt = Number(t.amount || t.total_amount || 0);
        const buyer = t.buyer_name || t.customer_name || 'Pengunjung POS';
        const packageName = t.package_name || 'Tiket Wahana POS';
        const orderId = t.merchant_order_id || t.id || '-';
        const method = formatPaymentMethod(t.payment_method || 'SP');
        const isPaid = ['PAID', 'SUCCESS', 'COMPLETED'].includes(t.payment_status || t.status);
        const statusText = isPaid ? 'LUNAS' : (t.payment_status || t.status || 'PENDING');
        
        if (isPaid) totalRevenueSum += amt;

        excelContent += `
          <tr>
            <td class="text-center">${rowNumber++}</td>
            <td class="text-left" style="mso-number-format:'\\@';">${orderId}</td>
            <td class="text-center">${new Date(t.created_at).toLocaleString('id-ID')}</td>
            <td class="text-center">POS Kasir (QRIS)</td>
            <td class="text-left">${buyer}</td>
            <td class="text-left">${packageName}</td>
            <td class="text-center">${method}</td>
            <td class="text-right">Rp ${amt.toLocaleString('id-ID')}</td>
            <td class="${isPaid ? 'lunas' : 'pending'}">${statusText}</td>
            <td class="text-left">Kasir POS Loket</td>
          </tr>
        `;
      });

      // 3. Transaksi Klaim Voucher / Mutasi POS
      filteredPosTransactions.forEach((t: any) => {
        const amt = Number(t.amount || 0);
        const buyer = t.member_name || t.members?.name || 'Pengunjung POS';
        const itemDesc = t.location === 'PAKET BUNDLING' ? 'Paket Bundling Wahana' : (t.location === 'WAHANA' ? 'Tiket Wahana Satuan' : (t.location || 'Klaim Voucher Tiket'));
        const invoiceNo = t.invoice_number || t.id?.substring(0, 8) || '-';
        const terminal = t.terminal_name || 'Kasir Wahana';
        const method = Number(t.amount || 0) > 0 ? formatPaymentMethod(t.payment_method || 'QRIS') : 'Klaim Voucher';
        const isVoucher = Number(t.amount || 0) === 0;

        if (!isVoucher) totalRevenueSum += amt;

        excelContent += `
          <tr>
            <td class="text-center">${rowNumber++}</td>
            <td class="text-left" style="mso-number-format:'\\@';">${invoiceNo}</td>
            <td class="text-center">${new Date(t.created_at).toLocaleString('id-ID')}</td>
            <td class="text-center">POS Kasir (Klaim)</td>
            <td class="text-left">${buyer}</td>
            <td class="text-left">${itemDesc}</td>
            <td class="text-center">${method}</td>
            <td class="text-right">${amt > 0 ? `Rp ${amt.toLocaleString('id-ID')}` : 'GRATIS (VOUCHER)'}</td>
            <td class="lunas">${isVoucher ? 'DITUKAR' : 'LUNAS'}</td>
            <td class="text-left">${terminal}</td>
          </tr>
        `;
      });
    }

    excelContent += `
          </tbody>
          <tfoot>
            <tr style="background-color: #f3f4f6; font-weight: bold;">
              <td colspan="7" class="text-right" style="padding: 12px;">TOTAL PENDAPATAN LUNAS:</td>
              <td class="text-right" style="color: #059669; font-size: 12pt; padding: 12px;">Rp ${totalRevenueSum.toLocaleString('id-ID')}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const hiddenElement = document.createElement('a');
    const tabName = activeTab === 'POS' ? 'POS_Wahana' : (activeTab === 'ONLINE' ? 'Annual_Pass' : 'Total_Penjualan');
    hiddenElement.href = url;
    hiddenElement.target = '_blank';
    hiddenElement.download = `Laporan_${tabName}_Aviary_${new Date().toISOString().split('T')[0]}.xls`;
    hiddenElement.click();
  };

  // Helper for single calendar date range picker
  const handleDateClick = (dayStr: string) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(dayStr);
      setEndDate('');
      setFinanceFilter('CUSTOM');
    } else if (startDate && !endDate) {
      if (new Date(dayStr) < new Date(startDate)) {
        setEndDate(startDate);
        setStartDate(dayStr);
      } else {
        setEndDate(dayStr);
      }
      setFinanceFilter('CUSTOM');
    }
  };

  const isDateSelected = (dayStr: string) => {
    if (startDate === dayStr || endDate === dayStr) return 'SELECTED';
    if (startDate && endDate) {
      const d = new Date(dayStr);
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (d > s && d < e) return 'IN_RANGE';
    }
    return 'NONE';
  };

  const getCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];
    
    // Prev month padding
    const prevMonthTotal = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthTotal - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: i, isCurrentMonth: true });
    }

    return days;
  };

  const getFilterLabel = () => {
    if (financeFilter === 'TODAY') return 'Hari Ini';
    if (financeFilter === 'WEEK') return 'Minggu Ini';
    if (financeFilter === 'MONTH') return 'Bulan Ini';
    if (financeFilter === 'YEAR') return 'Tahun Ini';
    if (financeFilter === 'ALL') return 'Semua Waktu';
    if (financeFilter === 'CUSTOM') {
      if (startDate && endDate) return `${startDate} s/d ${endDate}`;
      if (startDate) return `${startDate}`;
      return 'Periode Tanggal';
    }
    return 'Periode Tanggal';
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header & Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Laporan & Transaksi Keuangan</h2>
          <p style={{ color: '#64748b', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>Rekapitulasi lengkap penjualan tiket online, kasir POS wahana, dan pendapatan bersih</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Unified Date Range Picker Button & Popover */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.25rem',
                backgroundColor: 'white',
                border: '1px solid #cbd5e1',
                borderRadius: '0.75rem',
                fontWeight: '600',
                color: '#1e293b',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                fontSize: '0.875rem'
              }}
            >
              {getFilterLabel()}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
            </button>

            {/* Dropdown Calendar Popover */}
            {showDatePicker && (
              <div 
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '120%',
                  backgroundColor: 'white',
                  borderRadius: '1rem',
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                  border: '1px solid #e2e8f0',
                  padding: '1.25rem',
                  zIndex: 9999,
                  width: '320px',
                  animation: 'fadeIn 0.2s ease-out'
                }}
              >
                {/* Preset Fast Filters */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  {[
                    { id: 'TODAY', label: 'Hari Ini' },
                    { id: 'WEEK', label: 'Minggu Ini' },
                    { id: 'MONTH', label: 'Bulan Ini' },
                    { id: 'YEAR', label: 'Tahun Ini' },
                    { id: 'ALL', label: 'Semua' },
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setFinanceFilter(p.id);
                        setStartDate('');
                        setEndDate('');
                        setShowDatePicker(false);
                      }}
                      style={{
                        padding: '0.35rem 0.5rem',
                        fontSize: '0.75rem',
                        borderRadius: '0.4rem',
                        border: 'none',
                        backgroundColor: financeFilter === p.id ? '#10b981' : '#f1f5f9',
                        color: financeFilter === p.id ? 'white' : '#475569',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Single Month Calendar Navigator */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <button 
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0.5rem', color: '#64748b', fontWeight: 'bold', fontSize: '1rem' }}
                  >
                    ◀
                  </button>
                  <span style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '0.9rem' }}>
                    {calendarMonth.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
                  </span>
                  <button 
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0.5rem', color: '#64748b', fontWeight: 'bold', fontSize: '1rem' }}
                  >
                    ▶
                  </button>
                </div>

                {/* Day Headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.2rem', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold', marginBottom: '0.4rem' }}>
                  <span>Min</span><span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span>
                </div>

                {/* Days Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.2rem' }}>
                  {getCalendarDays().map((d, idx) => {
                    const status = isDateSelected(d.dateStr);
                    const isStart = startDate === d.dateStr;
                    const isEnd = endDate === d.dateStr;

                    return (
                      <button
                        key={idx}
                        onClick={() => handleDateClick(d.dateStr)}
                        disabled={!d.isCurrentMonth}
                        style={{
                          aspectRatio: '1',
                          border: 'none',
                          borderRadius: isStart ? '0.5rem 0 0 0.5rem' : isEnd ? '0 0.5rem 0.5rem 0' : (status === 'SELECTED' ? '0.5rem' : '0'),
                          backgroundColor: status === 'SELECTED' ? '#10b981' : (status === 'IN_RANGE' ? '#dcfce7' : 'transparent'),
                          color: !d.isCurrentMonth ? '#cbd5e1' : (status === 'SELECTED' ? 'white' : (status === 'IN_RANGE' ? '#166534' : '#1e293b')),
                          fontWeight: status !== 'NONE' ? 'bold' : 'normal',
                          fontSize: '0.8rem',
                          cursor: d.isCurrentMonth ? 'pointer' : 'default',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}
                      >
                        {d.dayNum}
                      </button>
                    );
                  })}
                </div>

                {/* Selection Footer info */}
                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {startDate && endDate ? `${startDate} ~ ${endDate}` : (startDate ? `Mulai: ${startDate}` : 'Pilih 2 tanggal rentang')}
                  </span>
                  <button
                    onClick={() => setShowDatePicker(false)}
                    style={{ padding: '0.35rem 0.75rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.4rem', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            )}
          </div>

          <button onClick={handleExportCSV} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '0.75rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            Export Excel
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid #e2e8f0', marginBottom: '2rem', overflowX: 'auto' }}>
        <button onClick={() => setActiveTab('RINGKASAN')} style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'RINGKASAN' ? '3px solid #10b981' : '3px solid transparent', color: activeTab === 'RINGKASAN' ? '#10b981' : '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', whiteSpace: 'nowrap' }}>Ringkasan Total</button>
        <button onClick={() => setActiveTab('ONLINE')} style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'ONLINE' ? '3px solid #3b82f6' : '3px solid transparent', color: activeTab === 'ONLINE' ? '#3b82f6' : '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', whiteSpace: 'nowrap' }}>Membership Annual Pass (Online)</button>
        <button onClick={() => setActiveTab('POS')} style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'POS' ? '3px solid #f59e0b' : '3px solid transparent', color: activeTab === 'POS' ? '#f59e0b' : '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', whiteSpace: 'nowrap' }}>Kasir POS Wahana & Bundling</button>
      </div>

      {/* TAB CONTENT: RINGKASAN */}
      {activeTab === 'RINGKASAN' && (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '4px solid #10b981' }}>
              <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '600', margin: '0 0 0.5rem 0' }}>TOTAL PENDAPATAN (LUNAS)</p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#059669', margin: 0 }}>{formatCurrency(financialTotalRevenue)}</h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.5rem 0 0 0' }}>Gabungan Online & Kasir POS</p>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '4px solid #3b82f6' }}>
              <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '600', margin: '0 0 0.5rem 0' }}>PENDAPATAN ANNUAL PASS</p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#2563eb', margin: 0 }}>{formatCurrency(totalTicketRevenue)}</h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.5rem 0 0 0' }}>Membership Annual Pass ({annualPassTxCount} Transaksi)</p>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '4px solid #f59e0b' }}>
              <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '600', margin: '0 0 0.5rem 0' }}>PENDAPATAN KASIR POS</p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#d97706', margin: 0 }}>{formatCurrency(totalPosRevenue)}</h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.5rem 0 0 0' }}>Tiket & Bundling Wahana ({posTxCount} Transaksi)</p>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '4px solid #64748b' }}>
              <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '600', margin: '0 0 0.5rem 0' }}>TRANSAKSI TERTUNDA</p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#475569', margin: 0 }}>{formatCurrency(pendingAmount)}</h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.5rem 0 0 0' }}>{pendingTransactions.length} Transaksi menunggu pembayaran</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1rem' }}>Tren Penjualan</h3>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} tickFormatter={(value: any) => (value / 1000000) + 'Jt'} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none'}} formatter={(value: any) => ['Rp ' + Number(value || 0).toLocaleString('id-ID'), '']} />
                    <Legend iconType="circle" />
                    <Bar dataKey="Annual Pass" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="Tiket Wahana" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1rem' }}>Komposisi Revenue</h3>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={revenueCompositionData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                      {revenueCompositionData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none'}} formatter={(value: any) => formatCurrency(value)} />
                    <Legend iconType="circle" layout="vertical" verticalAlign="bottom" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ONLINE */}
      {activeTab === 'ONLINE' && (
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', animation: 'fadeIn 0.3s ease-out', overflowX: 'auto' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1rem' }}>Daftar Transaksi Tiket Online (Duitku)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.875rem' }}>
                <th style={{ padding: '1rem 0' }}>Order ID</th>
                <th style={{ padding: '1rem' }}>Waktu</th>
                <th style={{ padding: '1rem' }}>Nama Pembeli</th>
                <th style={{ padding: '1rem' }}>Jenis Paket Tiket</th>
                <th style={{ padding: '1rem' }}>Total Bayar (Rp)</th>
                <th style={{ padding: '1rem' }}>Metode Bayar</th>
                <th style={{ padding: '1rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((trx: any, idx: number) => {
                const amount = Number(trx.amount || trx.total_amount || 0);
                const orderId = trx.merchant_order_id || trx.id || '-';
                const buyer = trx.buyer_name || trx.customer_name || '-';
                const packageName = trx.package_name || 'Annual Pass Membership';
                const isPaid = ['PAID', 'SUCCESS', 'COMPLETED'].includes(trx.payment_status || trx.status);
                
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem 0', fontWeight: '600', color: '#0f172a', fontSize: '0.8rem' }}>{orderId}</td>
                    <td style={{ padding: '1rem', color: '#475569', fontSize: '0.85rem' }}>{new Date(trx.created_at).toLocaleString('id-ID')}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b' }}>{buyer}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#059669', fontWeight: '600' }}>{packageName}</td>
                    <td style={{ padding: '1rem', fontWeight: '700', color: '#0f172a' }}>{formatCurrency(amount)}</td>
                    <td style={{ padding: '1rem' }}><span style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '600' }}>{formatPaymentMethod(trx.payment_method)}</span></td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ backgroundColor: isPaid ? '#dcfce7' : '#fef3c7', color: isPaid ? '#16a34a' : '#d97706', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '700' }}>
                        {isPaid ? 'LUNAS' : (trx.payment_status || trx.status || 'MENUNGGU')}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Belum ada transaksi online.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB CONTENT: POS WAHANA & BUNDLING */}
      {activeTab === 'POS' && (
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', animation: 'fadeIn 0.3s ease-out' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.25rem' }}>Rekonsiliasi Kasir POS Wahana & Paket Bundling</h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>Menampilkan seluruh transaksi QRIS Duitku & Penukaran Voucher tiket wahana yang terjadi di loket kasir POS.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>TOTAL PENDAPATAN QRIS (CASHLESS)</p>
              <h4 style={{ margin: '0.5rem 0 0 0', fontSize: '1.6rem', color: '#059669', fontWeight: '800' }}>{formatCurrency(totalPosRevenue)}</h4>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Lunas via Payment Gateway Duitku</p>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>TRANSAKSI TOP-UP BERBAYAR</p>
              <h4 style={{ margin: '0.5rem 0 0 0', fontSize: '1.6rem', color: '#2563eb', fontWeight: '800' }}>{posTxCount} Transaksi</h4>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Pembelian Tiket Satuan & Bundling</p>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>TOTAL TIKET DITUKAR (VOUCHER)</p>
              <h4 style={{ margin: '0.5rem 0 0 0', fontSize: '1.6rem', color: '#d97706', fontWeight: '800' }}>
                {filteredPosTransactions.filter((t: any) => Number(t.amount || 0) === 0 || t.location?.includes('VOUCHER')).length} Tiket
              </h4>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Klaim kuota tiket wahana di gate/POS</p>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.875rem' }}>
                  <th style={{ padding: '1rem 0' }}>Order / Invoice</th>
                  <th style={{ padding: '1rem' }}>Waktu</th>
                  <th style={{ padding: '1rem' }}>Pengunjung / Member</th>
                  <th style={{ padding: '1rem' }}>Jenis Transaksi / Wahana</th>
                  <th style={{ padding: '1rem' }}>Total Bayar (Rp)</th>
                  <th style={{ padding: '1rem' }}>Metode Bayar</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {/* Gabungkan Transaksi POS QRIS dan Voucher Redeem */}
                {[
                  ...filteredPosWahanaTransactions.map((t: any) => ({
                    orderId: t.merchant_order_id || t.id || '-',
                    time: t.created_at,
                    buyer: t.buyer_name || t.customer_name || 'Pengunjung POS',
                    title: t.package_name || 'Tiket Wahana POS',
                    amount: Number(t.amount || t.total_amount || 0),
                    method: formatPaymentMethod(t.payment_method || 'SP'),
                    status: ['PAID', 'SUCCESS', 'COMPLETED'].includes(t.payment_status || t.status) ? 'LUNAS' : (t.payment_status || t.status || 'MENUNGGU'),
                    isPaid: ['PAID', 'SUCCESS', 'COMPLETED'].includes(t.payment_status || t.status)
                  })),
                  ...filteredPosTransactions.map((t: any) => ({
                    orderId: t.invoice_number || t.id?.substring(0, 8) || '-',
                    time: t.created_at,
                    buyer: t.member_name || t.members?.name || 'Pengunjung POS',
                    title: t.location === 'PAKET BUNDLING' ? '🎟️ Paket Bundling Top-Up' : (t.location === 'WAHANA' ? '🎡 Tiket Wahana' : (t.location || 'Tukar Voucher Tiket')),
                    amount: Number(t.amount || 0),
                    method: Number(t.amount || 0) > 0 ? (t.payment_method || 'QRIS') : 'Klaim Voucher',
                    status: Number(t.amount || 0) > 0 ? 'LUNAS' : 'DITUKAR',
                    isPaid: true
                  }))
                ]
                .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                .map((row: any, idx: number) => {
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1rem 0', fontWeight: '600', color: '#0f172a', fontSize: '0.8rem' }}>{row.orderId}</td>
                      <td style={{ padding: '1rem', color: '#475569', fontSize: '0.85rem' }}>{new Date(row.time).toLocaleString('id-ID')}</td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b' }}>{row.buyer}</td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#d97706', fontWeight: '600' }}>{row.title}</td>
                      <td style={{ padding: '1rem', fontWeight: '700', color: '#0f172a' }}>{row.amount > 0 ? formatCurrency(row.amount) : 'GRATIS (VOUCHER)'}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ backgroundColor: row.amount > 0 ? '#dbeafe' : '#fef3c7', color: row.amount > 0 ? '#2563eb' : '#d97706', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '600' }}>
                          {row.method}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ backgroundColor: row.isPaid ? '#dcfce7' : '#fef3c7', color: row.isPaid ? '#16a34a' : '#d97706', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '700' }}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredPosWahanaTransactions.length === 0 && filteredPosTransactions.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Belum ada transaksi POS Wahana & Bundling.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


    </div>
  );
}
