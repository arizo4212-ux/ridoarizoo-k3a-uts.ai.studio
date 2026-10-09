import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatIDR, formatDateID } from './assets.ts';

export interface ExportOrderRow {
  id: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  items: Array<{
    productName: string;
    productSku: string;
    categoryName: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
}

export interface ExportProductRow {
  sku: string;
  name: string;
  categoryName: string;
  price: number;
  stock: number;
  caratWeight: string;
  origin: string;
  certification: string;
}

export function exportSalesReportToPDF(
  orders: ExportOrderRow[],
  products: ExportProductRow[],
  periodLabel: string
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const approvedOrders = orders.filter((o) => o.paymentStatus === 'approved');
  const totalRevenue = approvedOrders.reduce((acc, o) => acc + o.totalAmount, 0);
  const waitingCount = orders.filter((o) => o.paymentStatus === 'waiting_verification').length;

  // Title Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(24, 24, 27);
  doc.text('RUPA GEMS — LAPORAN PENJUALAN & INVENTARIS RESMI', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Periode Laporan: ${periodLabel}   |   Dicetak pada: ${formatDateID(new Date())}   |   Database: PostgreSQL (Single Source of Truth)`,
    14,
    25
  );

  // Summary Metrics Strip
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 30, 268, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Total Pendapatan Terverifikasi: ${formatIDR(totalRevenue)}`, 20, 42);
  doc.text(`Total Pesanan: ${orders.length} Transaksi`, 115, 42);
  doc.text(` Pembayaran Disetujui: ${approvedOrders.length}`, 175, 42);
  doc.text(`Menunggu Verifikasi: ${waitingCount}`, 230, 42);

  // Table 1: Orders & Sales Transactions
  const tableRows = orders.map((o, idx) => [
    String(idx + 1),
    o.orderNumber,
    formatDateID(o.createdAt),
    o.customerName,
    o.items.map((i) => `${i.productName} (${i.quantity}x)`).join(', '),
    o.paymentMethod,
    o.paymentStatus === 'approved'
      ? 'DISETUJUI'
      : o.paymentStatus === 'waiting_verification'
      ? 'MENUNGGU VERIFIKASI'
      : o.paymentStatus.toUpperCase(),
    o.orderStatus.toUpperCase(),
    formatIDR(o.totalAmount),
  ]);

  autoTable(doc, {
    startY: 56,
    head: [
      [
        'No',
        'No. Invoice',
        'Tanggal',
        'Pelanggan',
        'Item Permata / Perhiasan',
        'Metode Bayar',
        'Status Pembayaran',
        'Status Order',
        'Total (IDR)',
      ],
    ],
    body: tableRows,
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [24, 24, 27],
      textColor: [250, 248, 245],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [250, 250, 249],
    },
  });

  // Add second page for Product Stock & Valuation
  doc.addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(24, 24, 27);
  doc.text('RUPA GEMS — RINGKASAN STOK KATALOG & VALUASI PERMATA', 14, 18);

  const productRows = products.map((p, idx) => [
    String(idx + 1),
    p.sku,
    p.name,
    p.categoryName,
    p.caratWeight,
    p.origin,
    p.certification,
    String(p.stock),
    formatIDR(p.price),
    formatIDR(p.price * p.stock),
  ]);

  autoTable(doc, {
    startY: 26,
    head: [
      [
        'No',
        'SKU',
        'Nama Produk',
        'Kategori',
        'Karat',
        'Asal (Origin)',
        'Sertifikasi',
        'Stok',
        'Harga Satuan',
        'Nilai Inventaris',
      ],
    ],
    body: productRows,
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [24, 24, 27],
      textColor: [250, 248, 245],
      fontStyle: 'bold',
    },
  });

  doc.save(`Laporan_Penjualan_Rupa_Gems_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportSalesReportToExcel(
  orders: ExportOrderRow[],
  products: ExportProductRow[],
  customers: Array<{
    name: string;
    email: string;
    phone: string;
    address: string;
    orderCount: number;
    totalSpent: number;
  }>
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Laporan Penjualan
  const salesSheetData = orders.map((o, idx) => ({
    No: idx + 1,
    'Nomor Invoice': o.orderNumber,
    'Tanggal Transaksi': formatDateID(o.createdAt),
    'Nama Pelanggan': o.customerName,
    'Email Pelanggan': o.customerEmail,
    'No. Telepon': o.customerPhone,
    'Alamat Pengiriman': o.shippingAddress,
    'Daftar Produk': o.items.map((i) => `${i.productName} (${i.quantity}x)`).join('; '),
    'Metode Pembayaran': o.paymentMethod,
    'Status Pembayaran': o.paymentStatus,
    'Status Pesanan': o.orderStatus,
    'Total Nominal (IDR)': o.totalAmount,
    'Total Terformat': formatIDR(o.totalAmount),
  }));
  const wsSales = XLSX.utils.json_to_sheet(salesSheetData);
  XLSX.utils.book_append_sheet(wb, wsSales, 'Laporan_Penjualan');

  // Sheet 2: Data Produk & Stok
  const productSheetData = products.map((p, idx) => ({
    No: idx + 1,
    SKU: p.sku,
    'Nama Produk': p.name,
    Kategori: p.categoryName,
    'Berat Karat': p.caratWeight,
    'Asal (Origin)': p.origin,
    Sertifikasi: p.certification,
    'Stok Tersedia': p.stock,
    'Harga Satuan (IDR)': p.price,
    'Total Valuasi Stok (IDR)': p.price * p.stock,
  }));
  const wsProducts = XLSX.utils.json_to_sheet(productSheetData);
  XLSX.utils.book_append_sheet(wb, wsProducts, 'Data_Produk_Stok');

  // Sheet 3: Data Pelanggan
  const customerSheetData = customers.map((c, idx) => ({
    No: idx + 1,
    'Nama Lengkap': c.name,
    Email: c.email,
    Telepon: c.phone,
    Alamat: c.address,
    'Jumlah Pesanan': c.orderCount,
    'Total Belanja Terverifikasi (IDR)': c.totalSpent,
  }));
  const wsCustomers = XLSX.utils.json_to_sheet(customerSheetData);
  XLSX.utils.book_append_sheet(wb, wsCustomers, 'Data_Pelanggan');

  XLSX.writeFile(wb, `Laporan_Penjualan_Rupa_Gems_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
