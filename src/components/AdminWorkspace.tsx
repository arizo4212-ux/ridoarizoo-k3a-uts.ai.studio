import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
} from 'recharts';
import {
  LayoutDashboard,
  Gem,
  ShoppingBag,
  Users,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Search,
  Edit3,
  Trash2,
  Eye,
  LogOut,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { resolveProductImage, formatIDR, formatDateID } from '../lib/assets.ts';
import { exportSalesReportToPDF, exportSalesReportToExcel } from '../lib/exportReports.ts';

export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
}

export interface AdminProduct {
  id: number;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  caratWeight: string;
  origin: string;
  clarity: string;
  certification: string;
  imageUrl: string;
}

export interface AdminOrder {
  id: number;
  orderNumber: string;
  userId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  paymentProofData?: string | null;
  paymentBankSender?: string | null;
  paymentAccountName?: string | null;
  adminNotes?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  items: Array<{
    id: number;
    productId: number;
    productName: string;
    productSku: string;
    categoryName: string;
    price: number;
    quantity: number;
    subtotal: number;
  }>;
}

export interface AdminCustomer {
  id: number;
  uid: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: string;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string;
}

interface AdminWorkspaceProps {
  categories: AdminCategory[];
  products: AdminProduct[];
  orders: AdminOrder[];
  customers: AdminCustomer[];
  adminUserEmail: string;
  authHeaders: Record<string, string>;
  onRefreshData: () => Promise<void>;
  onBackToStore: () => void;
  onLogoutAdmin: () => void;
}

type AdminTab = 'dashboard' | 'products' | 'orders' | 'approvals' | 'customers' | 'reports';

export const AdminWorkspace: React.FC<AdminWorkspaceProps> = ({
  categories,
  products,
  orders,
  customers,
  adminUserEmail,
  authHeaders,
  onRefreshData,
  onBackToStore,
  onLogoutAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [reportPeriod, setReportPeriod] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Product Modal State
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState({
    categoryId: categories[0]?.id || 1,
    sku: '',
    name: '',
    description: '',
    price: 25000000,
    stock: 3,
    caratWeight: '2.50 ct',
    origin: 'Ratnapura, Sri Lanka',
    clarity: 'VVS1 · Natural',
    certification: 'GRS Swiss Certified',
    imageUrl: 'gem_sapphire',
  });

  // Payment Proof Inspection Modal State
  const [inspectingOrder, setInspectingOrder] = useState<AdminOrder | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewOrderStatus, setReviewOrderStatus] = useState<'processing' | 'shipped' | 'completed' | 'cancelled'>('shipped');

  // Customer Modal State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<AdminCustomer | null>(null);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  const showNotice = (type: 'success' | 'error', message: string) => {
    setFeedbackBanner({ type, message });
    setTimeout(() => setFeedbackBanner(null), 4500);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshData();
      showNotice('success', 'Data real-time berhasil disinkronkan dari PostgreSQL.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Real-time Analytics Computations
  const analytics = useMemo(() => {
    const approvedOrders = orders.filter((o) => o.paymentStatus === 'approved');
    const waitingOrders = orders.filter((o) => o.paymentStatus === 'waiting_verification');
    const totalRevenue = approvedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const pendingRevenue = waitingOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalInventoryUnits = products.reduce((sum, p) => sum + p.stock, 0);
    const totalInventoryValuation = products.reduce((sum, p) => sum + p.price * p.stock, 0);

    // Revenue by Category
    const categoryTotals: Record<string, { name: string; revenue: number; units: number }> = {};
    for (const cat of categories) {
      categoryTotals[cat.name] = { name: cat.name, revenue: 0, units: 0 };
    }
    for (const ord of approvedOrders) {
      for (const item of ord.items) {
        if (!categoryTotals[item.categoryName]) {
          categoryTotals[item.categoryName] = { name: item.categoryName, revenue: 0, units: 0 };
        }
        categoryTotals[item.categoryName].revenue += item.subtotal;
        categoryTotals[item.categoryName].units += item.quantity;
      }
    }

    // Order Timeline Chart Data
    const timelineData = [...orders]
      .reverse()
      .map((o) => ({
        invoice: o.orderNumber.replace('INV-RG-', '#'),
        tanggal: new Date(o.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
        nominalJuta: Math.round((o.totalAmount / 1000000) * 10) / 10,
        status: o.paymentStatus === 'approved' ? 'Disetujui' : 'Menunggu Verifikasi',
      }));

    return {
      totalRevenue,
      pendingRevenue,
      approvedCount: approvedOrders.length,
      waitingCount: waitingOrders.length,
      totalInventoryUnits,
      totalInventoryValuation,
      categoryChartData: Object.values(categoryTotals).map((c) => ({
        name: c.name,
        pendapatanJuta: Math.round((c.revenue / 1000000) * 10) / 10,
        unitTerjual: c.units,
      })),
      timelineData,
    };
  }, [orders, products, categories]);

  // Open Product Add/Edit Modal
  const openAddProductModal = () => {
    setEditingProduct(null);
    setProductForm({
      categoryId: categories[0]?.id || 1,
      sku: `RG-GEM-${String(products.length + 1).padStart(3, '0')}`,
      name: '',
      description: '',
      price: 25000000,
      stock: 3,
      caratWeight: '2.50 ct',
      origin: 'Ratnapura, Sri Lanka',
      clarity: 'VVS1 · Natural',
      certification: 'GRS Swiss Certified',
      imageUrl: 'gem_sapphire',
    });
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (prod: AdminProduct) => {
    setEditingProduct(prod);
    setProductForm({
      categoryId: prod.categoryId,
      sku: prod.sku,
      name: prod.name,
      description: prod.description,
      price: prod.price,
      stock: prod.stock,
      caratWeight: prod.caratWeight,
      origin: prod.origin,
      clarity: prod.clarity,
      certification: prod.certification,
      imageUrl: prod.imageUrl,
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(productForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan produk');

      setIsProductModalOpen(false);
      await onRefreshData();
      showNotice('success', editingProduct ? 'Produk & stok berhasil diperbarui.' : 'Produk baru berhasil ditambahkan.');
    } catch (err: any) {
      showNotice('error', err.message);
    }
  };

  const handleQuickStockAdjust = async (prod: AdminProduct, delta: number) => {
    const newStock = Math.max(0, prod.stock + delta);
    try {
      const res = await fetch(`/api/admin/products/${prod.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ stock: newStock }),
      });
      if (!res.ok) throw new Error('Gagal memperbarui stok');
      await onRefreshData();
      showNotice('success', `Stok ${prod.name} diperbarui menjadi ${newStock} unit.`);
    } catch (err: any) {
      showNotice('error', err.message);
    }
  };

  const handleDeleteProduct = async (prod: AdminProduct) => {
    try {
      const res = await fetch(`/api/admin/products/${prod.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (!res.ok) throw new Error('Gagal menghapus produk');
      await onRefreshData();
      showNotice('success', `Produk ${prod.name} telah dihapus.`);
    } catch (err: any) {
      showNotice('error', err.message);
    }
  };

  const handleReviewPaymentDecision = async (
    order: AdminOrder,
    decision: 'approved' | 'rejected',
    nextOrderStatus?: 'processing' | 'shipped' | 'completed' | 'cancelled'
  ) => {
    try {
      const statusToApply =
        nextOrderStatus || (decision === 'approved' ? reviewOrderStatus : 'cancelled');
      const notesToApply =
        reviewNotes.trim() ||
        (decision === 'approved'
          ? 'Bukti transfer diverifikasi valid oleh Admin Keuangan Rupa Gems.'
          : 'Bukti pembayaran tidak sesuai dengan mutasi rekening. Mohon unggah ulang.');

      const res = await fetch(`/api/admin/orders/${order.id}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          paymentStatus: decision,
          orderStatus: statusToApply,
          adminNotes: notesToApply,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses verifikasi');

      setInspectingOrder(null);
      setReviewNotes('');
      await onRefreshData();
      showNotice(
        'success',
        decision === 'approved'
          ? `Pembayaran ${order.orderNumber} DISETUJUI dan status pesanan diperbarui.`
          : `Pembayaran ${order.orderNumber} DITOLAK.`
      );
    } catch (err: any) {
      showNotice('error', err.message);
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          id: editingCustomer?.id,
          ...customerForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan pelanggan');
      setIsCustomerModalOpen(false);
      await onRefreshData();
      showNotice('success', 'Data pelanggan berhasil disimpan ke database.');
    } catch (err: any) {
      showNotice('error', err.message);
    }
  };

  // Filtered Lists
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.origin.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus =
        orderStatusFilter === 'all' ||
        o.paymentStatus === orderStatusFilter ||
        o.orderStatus === orderStatusFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [orders, orderStatusFilter, searchQuery]);

  const pendingApprovals = useMemo(
    () => orders.filter((o) => o.paymentStatus === 'waiting_verification' || o.paymentStatus === 'pending_upload'),
    [orders]
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex">
      {/* Sidebar Navigation (260px fixed) */}
      <aside className="w-64 bg-[#0F172A] text-slate-200 flex flex-col justify-between shrink-0 border-r border-slate-800">
        <div>
          <div className="px-6 py-5 border-b border-slate-800">
            <span className="font-serif-display text-2xl font-semibold tracking-tight text-white block">
              Rupa Gems
            </span>
            <span className="text-xs text-slate-400 mt-0.5 block">
              Executive Admin Console
            </span>
          </div>

          <nav className="p-3 space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Dashboard Real-Time</span>
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'products'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3">
                <Gem className="w-4 h-4 shrink-0" />
                <span>Data Produk & Stok</span>
              </span>
              <span className="font-mono-tabular text-xs opacity-80">{products.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('approvals')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'approvals'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Approval Pembayaran</span>
              </span>
              <span className="font-mono-tabular text-xs opacity-90">{pendingApprovals.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span>Data Order & Riwayat</span>
              </span>
              <span className="font-mono-tabular text-xs opacity-80">{orders.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'customers'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3">
                <Users className="w-4 h-4 shrink-0" />
                <span>Data Pelanggan</span>
              </span>
              <span className="font-mono-tabular text-xs opacity-80">{customers.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span>Laporan Sales (PDF/XLS)</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <div className="px-2 py-1.5">
            <p className="text-xs text-slate-400">Masuk sebagai Kurator</p>
            <p className="text-xs font-medium text-white truncate">{adminUserEmail}</p>
          </div>
          <button
            onClick={onBackToStore}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Storefront</span>
          </button>
          <button
            onClick={onLogoutAdmin}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-950/50 rounded-lg transition-colors whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Sesi Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract for Admin Workspace */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between gap-8">
          <div className="flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap">
            <span className="font-medium text-slate-900">Rupa Gems Admin</span>
            <span>/</span>
            <span className="text-slate-600">
              {activeTab === 'dashboard' && 'Dashboard Performa Real-Time'}
              {activeTab === 'products' && 'Kelola Data Produk & Stok'}
              {activeTab === 'approvals' && 'Verifikasi & Approval Bukti Pembayaran'}
              {activeTab === 'orders' && 'Data Order & Riwayat Transaksi'}
              {activeTab === 'customers' && 'Buku Induk Data Pelanggan'}
              {activeTab === 'reports' && 'Laporan Penjualan & Ekspor Dokumen'}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Sinkronkan Data</span>
            </button>
            <button
              onClick={() => exportSalesReportToPDF(orders, products, 'Semua Transaksi Aktif')}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Ekspor PDF</span>
            </button>
            <button
              onClick={() => exportSalesReportToExcel(orders, products, customers)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Ekspor Excel</span>
            </button>
          </div>
        </header>

        {feedbackBanner && (
          <div
            className={`mx-8 mt-4 px-4 py-3 rounded-lg border text-sm flex items-center justify-between ${
              feedbackBanner.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <span>{feedbackBanner.message}</span>
            <button
              onClick={() => setFeedbackBanner(null)}
              className="text-xs font-medium underline ml-4"
            >
              Tutup
            </button>
          </div>
        )}

        <main className="p-8 space-y-8 overflow-y-auto">
          {/* TAB 1: REAL-TIME VISUAL DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* 4 KPI Strip */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200">
                  <p className="text-xs font-medium text-slate-500">
                    Pendapatan Terverifikasi (Approved)
                  </p>
                  <p className="text-2xl font-semibold text-slate-900 font-mono-tabular mt-2">
                    {formatIDR(analytics.totalRevenue)}
                  </p>
                  <p className="text-xs text-emerald-700 mt-2">
                    {analytics.approvedCount} transaksi lunas terverifikasi
                  </p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200">
                  <p className="text-xs font-medium text-slate-500">
                    Menunggu Approval Pembayaran
                  </p>
                  <p className="text-2xl font-semibold text-amber-700 font-mono-tabular mt-2">
                    {formatIDR(analytics.pendingRevenue)}
                  </p>
                  <p className="text-xs text-slate-600 mt-2">
                    {analytics.waitingCount} bukti transfer perlu direview
                  </p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200">
                  <p className="text-xs font-medium text-slate-500">
                    Valuasi Stok Katalog Aktif
                  </p>
                  <p className="text-2xl font-semibold text-slate-900 font-mono-tabular mt-2">
                    {formatIDR(analytics.totalInventoryValuation)}
                  </p>
                  <p className="text-xs text-slate-600 mt-2">
                    {products.length} SKU · {analytics.totalInventoryUnits} unit permata tersedia
                  </p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200">
                  <p className="text-xs font-medium text-slate-500">
                    Total Pelanggan Terdaftar
                  </p>
                  <p className="text-2xl font-semibold text-slate-900 font-mono-tabular mt-2">
                    {customers.length} Kolektor
                  </p>
                  <p className="text-xs text-slate-600 mt-2">
                    Total {orders.length} riwayat pesanan tercatat
                  </p>
                </div>
              </div>

              {/* Real-Time Visual Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        Performa Penjualan per Kategori (Juta IDR)
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Akumulasi transaksi dengan status pembayaran disetujui
                      </p>
                    </div>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.categoryChartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#475569' }} unit=" Jt" />
                        <Tooltip
                          formatter={(value: any) => [`Rp ${value} Juta`, 'Pendapatan']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }}
                        />
                        <Bar dataKey="pendapatanJuta" radius={[6, 6, 0, 0]}>
                          {analytics.categoryChartData.map((_entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={index === 0 ? '#0F172A' : index === 1 ? '#B45309' : '#047857'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        Tren Nilai Transaksi Pesanan Masuk (Juta IDR)
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Grafik real-time berdasarkan urutan invoice pesanan terbaru
                      </p>
                    </div>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.timelineData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#B45309" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#B45309" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="invoice" tick={{ fontSize: 11, fill: '#475569' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#475569' }} unit=" Jt" />
                        <Tooltip
                          formatter={(value: any) => [`Rp ${value} Juta`, 'Nilai Order']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="nominalJuta"
                          stroke="#B45309"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorRevenue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Quick Action Queue: Waiting Payment Approvals */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Antrean Verifikasi Bukti Pembayaran Pelanggan
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Klik &quot;Periksa Bukti&quot; untuk melihat lampiran resi transfer dan menyetujui pembayaran
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('approvals')}
                    className="text-xs font-medium text-amber-700 hover:text-amber-800 underline"
                  >
                    Lihat Semua ({pendingApprovals.length})
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                        <th className="py-3 px-6">No. Invoice</th>
                        <th className="py-3 px-6">Pelanggan</th>
                        <th className="py-3 px-6">Bank Pengirim</th>
                        <th className="py-3 px-6 text-right">Total Nominal</th>
                        <th className="py-3 px-6">Status Bukti</th>
                        <th className="py-3 px-6 text-right">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {pendingApprovals.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500">
                            Seluruh bukti pembayaran pelanggan telah selesai diverifikasi.
                          </td>
                        </tr>
                      ) : (
                        pendingApprovals.map((ord) => (
                          <tr key={ord.id} className="hover:bg-slate-50/80">
                            <td className="py-3.5 px-6 font-mono-tabular font-medium text-slate-900">
                              {ord.orderNumber}
                            </td>
                            <td className="py-3.5 px-6">
                              <div className="font-medium text-slate-900">{ord.customerName}</div>
                              <div className="text-xs text-slate-500">{ord.customerEmail}</div>
                            </td>
                            <td className="py-3.5 px-6 text-slate-700">
                              {ord.paymentBankSender || ord.paymentMethod}
                              <div className="text-xs text-slate-500">
                                a.n. {ord.paymentAccountName || ord.customerName}
                              </div>
                            </td>
                            <td className="py-3.5 px-6 text-right font-mono-tabular font-semibold text-slate-900">
                              {formatIDR(ord.totalAmount)}
                            </td>
                            <td className="py-3.5 px-6">
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                                <Clock className="w-3.5 h-3.5" />
                                Menunggu Verifikasi
                              </span>
                            </td>
                            <td className="py-3.5 px-6 text-right">
                              <button
                                onClick={() => {
                                  setInspectingOrder(ord);
                                  setReviewNotes(ord.adminNotes || '');
                                  setReviewOrderStatus('shipped');
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Periksa Bukti</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KELOLA DATA PRODUK & STOK */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama permata, SKU, kategori, atau negara asal..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                  />
                </div>
                <button
                  onClick={openAddProductModal}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Koleksi Permata</span>
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                        <th className="py-3.5 px-6">Produk Permata</th>
                        <th className="py-3.5 px-6">SKU & Kategori</th>
                        <th className="py-3.5 px-6">Spesifikasi Gemologi</th>
                        <th className="py-3.5 px-6 text-right">Harga Satuan</th>
                        <th className="py-3.5 px-6 text-center">Kontrol Stok</th>
                        <th className="py-3.5 px-6 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {filteredProducts.map((prod) => (
                        <tr key={prod.id} className="hover:bg-slate-50/80">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3.5">
                              <img
                                src={resolveProductImage(prod.imageUrl)}
                                alt={prod.name}
                                referrerPolicy="no-referrer"
                                className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                              />
                              <div>
                                <div className="font-semibold text-slate-900">{prod.name}</div>
                                <div className="text-xs text-slate-500">{prod.certification}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-mono-tabular text-xs font-medium text-slate-900">
                              {prod.sku}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">{prod.categoryName}</div>
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-600">
                            <div>{prod.caratWeight} · {prod.clarity}</div>
                            <div className="text-slate-400">Origin: {prod.origin}</div>
                          </td>
                          <td className="py-4 px-6 text-right font-mono-tabular font-semibold text-slate-900">
                            {formatIDR(prod.price)}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleQuickStockAdjust(prod, -1)}
                                className="w-7 h-7 rounded border border-slate-200 hover:bg-slate-100 flex items-center justify-center font-mono-tabular text-sm"
                                title="Kurangi Stok"
                              >
                                -
                              </button>
                              <span
                                className={`w-10 text-center font-mono-tabular font-semibold ${
                                  prod.stock <= 2 ? 'text-rose-600' : 'text-slate-900'
                                }`}
                              >
                                {prod.stock}
                              </span>
                              <button
                                onClick={() => handleQuickStockAdjust(prod, 1)}
                                className="w-7 h-7 rounded border border-slate-200 hover:bg-slate-100 flex items-center justify-center font-mono-tabular text-sm"
                                title="Tambah Stok"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => openEditProductModal(prod)}
                                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Edit Produk"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(prod)}
                                className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Hapus Produk"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: APPROVAL BUKTI PEMBAYARAN PELANGGAN */}
          {activeTab === 'approvals' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">
                  Panel Approval Bukti Pembayaran Pelanggan
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Verifikasi keaslian bukti transfer bank pelanggan sebelum menerbitkan sertifikat gemologi dan pengiriman berasuransi.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-slate-300 transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className="font-mono-tabular text-xs font-semibold text-slate-500">
                              {ord.orderNumber} · {formatDateID(ord.createdAt)}
                            </span>
                            <h4 className="text-base font-semibold text-slate-900 mt-0.5">
                              {ord.customerName}
                            </h4>
                            <p className="text-xs text-slate-500">
                              {ord.customerEmail} · {ord.customerPhone}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono-tabular text-base font-bold text-slate-900 block">
                              {formatIDR(ord.totalAmount)}
                            </span>
                            <span
                              className={`text-xs font-medium ${
                                ord.paymentStatus === 'approved'
                                  ? 'text-emerald-700'
                                  : ord.paymentStatus === 'rejected'
                                  ? 'text-rose-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {ord.paymentStatus === 'approved'
                                ? 'Disetujui (Approved)'
                                : ord.paymentStatus === 'rejected'
                                ? 'Ditolak (Rejected)'
                                : 'Menunggu Verifikasi'}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-1">
                          <div>
                            <span className="text-slate-400">Metode & Pengirim:</span>{' '}
                            <span className="font-medium text-slate-800">
                              {ord.paymentBankSender || ord.paymentMethod} — a.n.{' '}
                              {ord.paymentAccountName || ord.customerName}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Item Dibeli:</span>{' '}
                            <span className="text-slate-800">
                              {ord.items.map((i) => `${i.productName} (${i.quantity}x)`).join(', ')}
                            </span>
                          </div>
                          {ord.adminNotes && (
                            <div>
                              <span className="text-slate-400">Catatan Kurator:</span>{' '}
                              <span className="italic text-slate-700">{ord.adminNotes}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => {
                            setInspectingOrder(ord);
                            setReviewNotes(ord.adminNotes || '');
                            setReviewOrderStatus(
                              ord.orderStatus === 'completed' ? 'completed' : 'shipped'
                            );
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 underline"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat Bukti Transfer</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleReviewPaymentDecision(ord, 'approved', 'shipped')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleReviewPaymentDecision(ord, 'rejected', 'cancelled')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DATA ORDER & RIWAYAT */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nomor invoice, nama pelanggan, atau email..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  {[
                    { id: 'all', label: 'Semua' },
                    { id: 'waiting_verification', label: 'Menunggu Verifikasi' },
                    { id: 'approved', label: 'Disetujui' },
                    { id: 'shipped', label: 'Dikirim' },
                    { id: 'completed', label: 'Selesai' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setOrderStatusFilter(tab.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        orderStatusFilter === tab.id
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                        <th className="py-3.5 px-6">No. Invoice & Waktu</th>
                        <th className="py-3.5 px-6">Pelanggan & Alamat</th>
                        <th className="py-3.5 px-6">Rincian Item</th>
                        <th className="py-3.5 px-6 text-right">Total Nominal</th>
                        <th className="py-3.5 px-6">Status Pembayaran</th>
                        <th className="py-3.5 px-6">Status Pengiriman</th>
                        <th className="py-3.5 px-6 text-right">Kelola</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {filteredOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-50/80">
                          <td className="py-4 px-6">
                            <div className="font-mono-tabular font-semibold text-slate-900">
                              {ord.orderNumber}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {formatDateID(ord.createdAt)}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-medium text-slate-900">{ord.customerName}</div>
                            <div className="text-xs text-slate-500">{ord.customerPhone}</div>
                            <div className="text-xs text-slate-400 max-w-xs truncate">
                              {ord.shippingAddress}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-700">
                            {ord.items.map((item) => (
                              <div key={item.id} className="py-0.5">
                                {item.productName}{' '}
                                <span className="font-mono-tabular text-slate-500">
                                  ({item.quantity}x)
                                </span>
                              </div>
                            ))}
                          </td>
                          <td className="py-4 px-6 text-right font-mono-tabular font-semibold text-slate-900">
                            {formatIDR(ord.totalAmount)}
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`text-xs font-medium ${
                                ord.paymentStatus === 'approved'
                                  ? 'text-emerald-700'
                                  : ord.paymentStatus === 'rejected'
                                  ? 'text-rose-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {ord.paymentStatus === 'approved'
                                ? 'Disetujui'
                                : ord.paymentStatus === 'rejected'
                                ? 'Ditolak'
                                : 'Menunggu Verifikasi'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-xs font-medium text-slate-700 capitalize">
                              {ord.orderStatus}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => {
                                setInspectingOrder(ord);
                                setReviewNotes(ord.adminNotes || '');
                                setReviewOrderStatus(
                                  (ord.orderStatus as any) || 'shipped'
                                );
                              }}
                              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                            >
                              Detail & Status
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DATA PELANGGAN */}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-200">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Database Pelanggan & Kolektor Rupa Gems
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Data pelanggan tersinkronisasi otomatis dari transaksi checkout dan akun autentikasi
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingCustomer(null);
                    setCustomerForm({ name: '', email: '', phone: '', address: '' });
                    setIsCustomerModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Pelanggan</span>
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                        <th className="py-3.5 px-6">Nama Pelanggan</th>
                        <th className="py-3.5 px-6">Kontak & Email</th>
                        <th className="py-3.5 px-6">Alamat Pengiriman Utama</th>
                        <th className="py-3.5 px-6 text-right">Total Pesanan</th>
                        <th className="py-3.5 px-6 text-right">Akumulasi Pembelian</th>
                        <th className="py-3.5 px-6 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {customers.map((cust) => (
                        <tr key={cust.id} className="hover:bg-slate-50/80">
                          <td className="py-4 px-6">
                            <div className="font-semibold text-slate-900">{cust.name}</div>
                            <div className="text-xs text-slate-500 capitalize">Role: {cust.role}</div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-slate-800">{cust.email}</div>
                            <div className="font-mono-tabular text-xs text-slate-500">
                              {cust.phone}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-600 max-w-xs">
                            {cust.address}
                          </td>
                          <td className="py-4 px-6 text-right font-mono-tabular font-medium text-slate-900">
                            {cust.orderCount} Transaksi
                          </td>
                          <td className="py-4 px-6 text-right font-mono-tabular font-semibold text-slate-900">
                            {formatIDR(cust.totalSpent)}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => {
                                setEditingCustomer(cust);
                                setCustomerForm({
                                  name: cust.name,
                                  email: cust.email,
                                  phone: cust.phone,
                                  address: cust.address,
                                });
                                setIsCustomerModalOpen(true);
                              }}
                              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                              Edit Profil
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: LAPORAN SALES & EKSPOR OTOMATIS PDF / EXCEL */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Laporan Penjualan & Ekspor Dokumen Resmi
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Unduh laporan penjualan, mutasi verifikasi pembayaran, dan valuasi stok inventaris secara otomatis ke format PDF maupun Microsoft Excel (.xlsx).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={reportPeriod}
                    onChange={(e) => setReportPeriod(e.target.value)}
                    className="px-3.5 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
                  >
                    <option value="all">Semua Transaksi (All-Time)</option>
                    <option value="approved">Hanya Transaksi Disetujui (Approved)</option>
                  </select>

                  <button
                    onClick={() => {
                      const targetOrders =
                        reportPeriod === 'approved'
                          ? orders.filter((o) => o.paymentStatus === 'approved')
                          : orders;
                      exportSalesReportToPDF(
                        targetOrders,
                        products,
                        reportPeriod === 'approved' ? 'Transaksi Lunas Terverifikasi' : 'Semua Transaksi'
                      );
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Unduh Laporan PDF</span>
                  </button>

                  <button
                    onClick={() => {
                      const targetOrders =
                        reportPeriod === 'approved'
                          ? orders.filter((o) => o.paymentStatus === 'approved')
                          : orders;
                      exportSalesReportToExcel(targetOrders, products, customers);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Unduh Laporan Excel (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Financial Ledger Summary Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900">
                    Buku Besar Penjualan (Sales Ledger)
                  </h4>
                  <span className="font-mono-tabular text-xs font-semibold text-emerald-700">
                    Total Terverifikasi: {formatIDR(analytics.totalRevenue)}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                        <th className="py-3 px-6">No. Invoice</th>
                        <th className="py-3 px-6">Tanggal</th>
                        <th className="py-3 px-6">Pelanggan</th>
                        <th className="py-3 px-6">Produk Terjual</th>
                        <th className="py-3 px-6">Metode Bayar</th>
                        <th className="py-3 px-6">Status Bayar</th>
                        <th className="py-3 px-6 text-right">Nominal (IDR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {(reportPeriod === 'approved'
                        ? orders.filter((o) => o.paymentStatus === 'approved')
                        : orders
                      ).map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-50/80">
                          <td className="py-3.5 px-6 font-mono-tabular font-medium text-slate-900">
                            {ord.orderNumber}
                          </td>
                          <td className="py-3.5 px-6 text-xs text-slate-600">
                            {formatDateID(ord.createdAt)}
                          </td>
                          <td className="py-3.5 px-6 font-medium text-slate-900">
                            {ord.customerName}
                          </td>
                          <td className="py-3.5 px-6 text-xs text-slate-600">
                            {ord.items.map((i) => `${i.productName} (${i.quantity}x)`).join(', ')}
                          </td>
                          <td className="py-3.5 px-6 text-xs text-slate-600">
                            {ord.paymentMethod}
                          </td>
                          <td className="py-3.5 px-6">
                            <span
                              className={`text-xs font-medium ${
                                ord.paymentStatus === 'approved'
                                  ? 'text-emerald-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {ord.paymentStatus.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-right font-mono-tabular font-semibold text-slate-900">
                            {formatIDR(ord.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: ADD / EDIT PRODUCT */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingProduct ? 'Edit Data Produk & Stok' : 'Tambah Koleksi Permata Baru'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Kategori Koleksi
                  </label>
                  <select
                    value={productForm.categoryId}
                    onChange={(e) =>
                      setProductForm({ ...productForm, categoryId: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Kode SKU
                  </label>
                  <input
                    type="text"
                    required
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono-tabular"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Produk Permata / Perhiasan
                </label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Harga (IDR)
                  </label>
                  <input
                    type="number"
                    required
                    min={100000}
                    step={100000}
                    value={productForm.price}
                    onChange={(e) =>
                      setProductForm({ ...productForm, price: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono-tabular"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Jumlah Stok Tersedia
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={productForm.stock}
                    onChange={(e) =>
                      setProductForm({ ...productForm, stock: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono-tabular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Berat Karat
                  </label>
                  <input
                    type="text"
                    required
                    value={productForm.caratWeight}
                    onChange={(e) =>
                      setProductForm({ ...productForm, caratWeight: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Asal (Origin)
                  </label>
                  <input
                    type="text"
                    required
                    value={productForm.origin}
                    onChange={(e) => setProductForm({ ...productForm, origin: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Visual Katalog
                  </label>
                  <select
                    value={productForm.imageUrl}
                    onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  >
                    <option value="gem_sapphire">Royal Blue Sapphire</option>
                    <option value="gem_ruby">Pigeon Blood Ruby</option>
                    <option value="gem_emerald">Colombian Emerald</option>
                    <option value="ring_padparadscha">Padparadscha Gold Ring</option>
                    <option value="pendant_jadeite">Imperial Jadeite Pendant</option>
                    <option value="hero_banner">High Jewelry Diamond Halo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Kejernihan (Clarity)
                  </label>
                  <input
                    type="text"
                    required
                    value={productForm.clarity}
                    onChange={(e) => setProductForm({ ...productForm, clarity: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Lembaga Sertifikasi
                  </label>
                  <input
                    type="text"
                    required
                    value={productForm.certification}
                    onChange={(e) =>
                      setProductForm({ ...productForm, certification: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Deskripsi Kurasi
                </label>
                <textarea
                  rows={3}
                  required
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm({ ...productForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                >
                  Simpan ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INSPECT & APPROVE PAYMENT PROOF */}
      {inspectingOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="font-mono-tabular text-xs text-slate-500">
                  Verifikasi Pembayaran · {inspectingOrder.orderNumber}
                </span>
                <h3 className="text-lg font-semibold text-slate-900">
                  Bukti Transfer Pelanggan — {inspectingOrder.customerName}
                </h3>
              </div>
              <button
                onClick={() => setInspectingOrder(null)}
                className="text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                Tutup
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
              <div className="bg-slate-100 rounded-xl p-4 flex flex-col items-center justify-center border border-slate-200">
                {inspectingOrder.paymentProofData ? (
                  <img
                    src={inspectingOrder.paymentProofData}
                    alt={`Bukti Bayar ${inspectingOrder.orderNumber}`}
                    className="max-h-96 w-auto rounded-lg shadow-sm object-contain bg-white"
                  />
                ) : (
                  <p className="text-xs text-slate-500 py-16">
                    Pelanggan belum mengunggah lampiran gambar bukti transfer.
                  </p>
                )}
              </div>

              <div className="space-y-4 flex flex-col justify-between">
                <div className="space-y-3 text-sm">
                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Total Tagihan:</span>
                      <span className="font-mono-tabular font-bold text-slate-900">
                        {formatIDR(inspectingOrder.totalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Bank Pengirim:</span>
                      <span className="text-xs font-medium text-slate-800">
                        {inspectingOrder.paymentBankSender || inspectingOrder.paymentMethod}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Nama Rekening:</span>
                      <span className="text-xs font-medium text-slate-800">
                        {inspectingOrder.paymentAccountName || inspectingOrder.customerName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Status Saat Ini:</span>
                      <span className="text-xs font-semibold text-amber-700 uppercase">
                        {inspectingOrder.paymentStatus}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Tindak Lanjut Status Pengiriman Order
                    </label>
                    <select
                      value={reviewOrderStatus}
                      onChange={(e) => setReviewOrderStatus(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    >
                      <option value="processing">Sedang Diproses di Atelier (Processing)</option>
                      <option value="shipped">Dikirim dengan Kurir Berasuransi (Shipped)</option>
                      <option value="completed">Selesai Diterima Pelanggan (Completed)</option>
                      <option value="cancelled">Dibatalkan (Cancelled)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Catatan Verifikasi Admin / Kurator
                    </label>
                    <textarea
                      rows={3}
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Contoh: Dana telah masuk ke rekening BCA Prioritas Rupa Gems. Segel sertifikat siap dikirim."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleReviewPaymentDecision(inspectingOrder, 'rejected', 'cancelled')}
                    className="px-4 py-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                  >
                    Tolak Bukti Pembayaran
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReviewPaymentDecision(inspectingOrder, 'approved', reviewOrderStatus)}
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
                  >
                    Setujui Pembayaran (Approve)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD / EDIT CUSTOMER */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingCustomer ? 'Perbarui Data Pelanggan' : 'Registrasi Pelanggan Baru'}
              </h3>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Lengkap Pelanggan
                </label>
                <input
                  type="text"
                  required
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Alamat Email
                </label>
                <input
                  type="email"
                  required
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  required
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono-tabular"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Alamat Lengkap Pengiriman Berasuransi
                </label>
                <textarea
                  rows={3}
                  required
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                >
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
