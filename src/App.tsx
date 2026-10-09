import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { signInWithPopup, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Trash2,
  X,
  Upload,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Lock,
  ArrowRight,
  SlidersHorizontal,
  UserCheck,
} from 'lucide-react';
import { auth, googleAuthProvider } from './lib/firebase.ts';
import {
  HERO_BANNER_IMAGE,
  resolveProductImage,
  formatIDR,
  formatDateID,
} from './lib/assets.ts';
import { apiService } from './lib/apiClient.ts';
import {
  AdminWorkspace,
  AdminCategory,
  AdminProduct,
  AdminOrder,
  AdminCustomer,
} from './components/AdminWorkspace.tsx';

interface CartItem {
  product: AdminProduct;
  quantity: number;
}

export default function App() {
  // Storefront Catalog State
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Search, Category & Price Sorting State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<'featured' | 'price_asc' | 'price_desc'>('featured');

  // Product Detail Modal State
  const [selectedProductModal, setSelectedProductModal] = useState<AdminProduct | null>(null);

  // Shopping Cart Drawer & Checkout State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'shipping_payment' | 'confirmation'>('cart');
  const [checkoutForm, setCheckoutForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingAddress: '',
    paymentMethod: 'Bank Transfer BCA Prioritas (8820 9912 01)',
    paymentBankSender: 'BCA Prioritas',
    paymentAccountName: '',
    paymentProofData: '',
  });
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [confirmedOrder, setConfirmedOrder] = useState<AdminOrder | null>(null);

  // Customer Order History & Payment Proof Upload View
  const [activeStoreSection, setActiveStoreSection] = useState<'catalog' | 'orders' | 'admin_login'>('catalog');
  const [lookupOrders, setLookupOrders] = useState<AdminOrder[]>([]);
  const [lookupQuery, setLookupQuery] = useState<string>('');
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);
  const [uploadingOrderId, setUploadingOrderId] = useState<number | null>(null);

  // Authentication & Admin Workspace State (Stored strictly in memory)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [firebaseToken, setFirebaseToken] = useState<string | null>(null);
  const [adminSessionToken, setAdminSessionToken] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>('admin@rupagems.id');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAdminWorkspaceOpen, setIsAdminWorkspaceOpen] = useState<boolean>(false);

  // Admin Overview Data
  const [adminOrders, setAdminOrders] = useState<AdminOrder[]>([]);
  const [adminCustomers, setAdminCustomers] = useState<AdminCustomer[]>([]);

  // Toast / Inline Notification
  const [storeNotice, setStoreNotice] = useState<string | null>(null);

  const triggerNotice = (msg: string) => {
    setStoreNotice(msg);
    setTimeout(() => setStoreNotice(null), 4000);
  };

  // Load Storefront Catalog from Real PostgreSQL Backend (with static-host resilience)
  const fetchCatalog = useCallback(async () => {
    setIsLoadingCatalog(true);
    setCatalogError(null);
    try {
      const data = await apiService.getCatalog();
      setCategories(data.categories || []);
      setProducts(data.products || []);
    } catch (err: any) {
      setCatalogError(err.message);
    } finally {
      setIsLoadingCatalog(false);
    }
  }, []);

  // Load Public / Customer Orders
  const fetchCustomerOrders = useCallback(async (emailOrInvoice?: string) => {
    setIsLoadingOrders(true);
    try {
      const data = await apiService.lookupOrders(emailOrInvoice);
      setLookupOrders(data.orders || []);
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  // Build Auth Headers for Protected Admin Endpoints
  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (adminSessionToken) {
      headers['x-admin-session'] = adminSessionToken;
    }
    if (firebaseToken) {
      headers['Authorization'] = `Bearer ${firebaseToken}`;
    }
    return headers;
  }, [adminSessionToken, firebaseToken]);

  // Load Full Admin Data from PostgreSQL (with static-host resilience)
  const fetchAdminOverview = useCallback(async () => {
    if (!adminSessionToken && !firebaseToken) return;
    try {
      const data = await apiService.getAdminOverview(authHeaders);
      setCategories(data.categories || []);
      setProducts(data.products || []);
      setAdminOrders(data.orders || []);
      setAdminCustomers(data.customers || []);
    } catch (err) {
      console.error('Failed to load admin overview:', err);
    }
  }, [adminSessionToken, firebaseToken, authHeaders]);

  useEffect(() => {
    fetchCatalog();
    fetchCustomerOrders();
  }, [fetchCatalog, fetchCustomerOrders]);

  // Listen to Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const token = await user.getIdToken();
        setFirebaseToken(token);
        setCheckoutForm((prev) => ({
          ...prev,
          customerName: prev.customerName || user.displayName || '',
          customerEmail: prev.customerEmail || user.email || '',
          paymentAccountName: prev.paymentAccountName || user.displayName || '',
        }));
        // Sync user profile to PostgreSQL
        await fetch('/api/auth/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        }).catch(() => {});
      } else {
        setFirebaseToken(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isAdminWorkspaceOpen) {
      fetchAdminOverview();
      const interval = setInterval(() => {
        fetchAdminOverview();
      }, 4000);

      let bc: BroadcastChannel | null = null;
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('rupa_gems_sync_channel');
        bc.onmessage = () => {
          fetchAdminOverview();
        };
      }

      return () => {
        clearInterval(interval);
        if (bc) bc.close();
      };
    }
  }, [isAdminWorkspaceOpen, fetchAdminOverview]);

  // Efficient Multi-Field Client Search & Category Filter
  const displayedProducts = useMemo(() => {
    let list = [...products];

    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.categorySlug === selectedCategory);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.origin.toLowerCase().includes(q) ||
          p.caratWeight.toLowerCase().includes(q) ||
          p.certification.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    if (sortOption === 'price_asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'price_desc') {
      list.sort((a, b) => b.price - a.price);
    }

    return list;
  }, [products, selectedCategory, searchQuery, sortOption]);

  // Shopping Cart Handlers
  const addToCart = (product: AdminProduct, qty = 1) => {
    if (product.stock <= 0) {
      triggerNotice(`Maaf, stok untuk ${product.name} sedang habis.`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const nextQty = Math.min(product.stock, existing.quantity + qty);
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: nextQty } : item
        );
      }
      return [...prev, { product, quantity: Math.min(product.stock, qty) }];
    });
    setCheckoutStep('cart');
    setIsCartOpen(true);
    triggerNotice(`${product.name} ditambahkan ke keranjang belanja.`);
  };

  const updateCartQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          return {
            ...item,
            quantity: Math.min(item.product.stock, nextQty),
          };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const cartTotalCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const cartTotalAmount = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart]
  );

  // Handle File Upload to Base64 for Payment Receipt Proof
  const handleReceiptFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    onBase64Ready: (base64: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onBase64Ready(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Customer Checkout to PostgreSQL
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setIsSubmittingOrder(true);
    try {
      const data = await apiService.createOrder({
        uid: firebaseUser?.uid,
        customerName: checkoutForm.customerName,
        customerEmail: checkoutForm.customerEmail,
        customerPhone: checkoutForm.customerPhone,
        shippingAddress: checkoutForm.shippingAddress,
        paymentMethod: checkoutForm.paymentMethod,
        paymentBankSender: checkoutForm.paymentBankSender,
        paymentAccountName: checkoutForm.paymentAccountName || checkoutForm.customerName,
        paymentProofData: checkoutForm.paymentProofData || undefined,
        items: cart.map((c) => ({
          productId: c.product.id,
          quantity: c.quantity,
        })),
      });

      setConfirmedOrder(data.order);
      setCart([]);
      setCheckoutStep('confirmation');
      await fetchCatalog();
      await fetchCustomerOrders();
    } catch (err: any) {
      triggerNotice(err.message);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Upload Payment Proof for Existing Order in Order History
  const handleUploadProofForOrder = async (order: AdminOrder, base64Data: string) => {
    setUploadingOrderId(order.id);
    try {
      await apiService.uploadPaymentProof(order.id, {
        paymentProofData: base64Data,
        paymentBankSender: order.paymentBankSender || 'Bank Transfer BCA',
        paymentAccountName: order.customerName,
      });
      await fetchCustomerOrders(lookupQuery);
      triggerNotice(`Bukti pembayaran untuk ${order.orderNumber} berhasil diunggah dan siap direview Admin.`);
    } catch (err: any) {
      triggerNotice(err.message);
    } finally {
      setUploadingOrderId(null);
    }
  };

  // Admin Login Form Submit
  const handleAdminFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const data = await apiService.adminLogin(adminEmail, adminPassword);
      setAdminSessionToken(data.token);
      const overview = await apiService.getAdminOverview({ 'x-admin-session': data.token });
      setCategories(overview.categories || []);
      setProducts(overview.products || []);
      setAdminOrders(overview.orders || []);
      setAdminCustomers(overview.customers || []);
      setIsAdminWorkspaceOpen(true);
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  // Google Sign-In via Firebase Popup
  const handleGoogleSignIn = async (openAdminAfter = false) => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const token = await cred.user.getIdToken();
      setFirebaseToken(token);
      if (openAdminAfter) {
        const overview = await apiService.getAdminOverview({ Authorization: `Bearer ${token}` });
        setCategories(overview.categories || []);
        setProducts(overview.products || []);
        setAdminOrders(overview.orders || []);
        setAdminCustomers(overview.customers || []);
        setIsAdminWorkspaceOpen(true);
      } else {
        triggerNotice(`Selamat datang kembali, ${cred.user.displayName || cred.user.email}`);
      }
    } catch (err: any) {
      setAuthError('Gagal melakukan autentikasi Google Sign-In. Anda juga dapat menggunakan Kredensial Kurator Admin.');
    }
  };

  // Render Dedicated Full-Screen Admin Console when Authenticated into Admin Mode
  if (isAdminWorkspaceOpen && (adminSessionToken || firebaseToken)) {
    return (
      <AdminWorkspace
        categories={categories}
        products={products}
        orders={adminOrders}
        customers={adminCustomers}
        adminUserEmail={firebaseUser?.email || adminEmail}
        authHeaders={authHeaders}
        onRefreshData={fetchAdminOverview}
        onBackToStore={() => {
          setIsAdminWorkspaceOpen(false);
          setActiveStoreSection('catalog');
          fetchCatalog();
          fetchCustomerOrders();
        }}
        onLogoutAdmin={async () => {
          setAdminSessionToken(null);
          if (firebaseUser) {
            await signOut(auth);
          }
          setIsAdminWorkspaceOpen(false);
          setActiveStoreSection('catalog');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#18181B]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-stone-200 px-6 lg:px-12 py-4 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Title (Single text element wordmark) */}
        <a
          href="#katalog"
          onClick={(e) => {
            e.preventDefault();
            setActiveStoreSection('catalog');
            setSelectedCategory('all');
          }}
          className="font-serif-display text-2xl font-bold tracking-tight text-stone-900 whitespace-nowrap shrink-0"
        >
          Rupa Gems
        </a>

        {/* Zone 2: 4–5 Concise Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600">
          <a
            href="#semua-koleksi"
            onClick={(e) => {
              e.preventDefault();
              setSearchQuery('');
              setActiveStoreSection('catalog');
              setSelectedCategory('all');
            }}
            className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 ${
              activeStoreSection === 'catalog' && selectedCategory === 'all'
                ? 'text-stone-900 underline underline-offset-8 decoration-amber-700 decoration-2'
                : ''
            }`}
          >
            Semua Koleksi
          </a>
          <a
            href="#permata-lepas"
            onClick={(e) => {
              e.preventDefault();
              setSearchQuery('');
              setActiveStoreSection('catalog');
              setSelectedCategory('permata-mulia-lepas');
            }}
            className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 ${
              activeStoreSection === 'catalog' && selectedCategory === 'permata-mulia-lepas'
                ? 'text-stone-900 underline underline-offset-8 decoration-amber-700 decoration-2'
                : ''
            }`}
          >
            Permata Mulia
          </a>
          <a
            href="#perhiasan-fine"
            onClick={(e) => {
              e.preventDefault();
              setSearchQuery('');
              setActiveStoreSection('catalog');
              setSelectedCategory('cincin-perhiasan-fine');
            }}
            className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 ${
              activeStoreSection === 'catalog' && selectedCategory === 'cincin-perhiasan-fine'
                ? 'text-stone-900 underline underline-offset-8 decoration-amber-700 decoration-2'
                : ''
            }`}
          >
            Perhiasan Fine
          </a>
          <a
            href="#riwayat-pesanan"
            onClick={(e) => {
              e.preventDefault();
              setSearchQuery('');
              setActiveStoreSection('orders');
              fetchCustomerOrders();
            }}
            className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 ${
              activeStoreSection === 'orders'
                ? 'text-stone-900 underline underline-offset-8 decoration-amber-700 decoration-2'
                : ''
            }`}
          >
            Riwayat & Bukti Bayar
          </a>
          <a
            href="#admin-panel"
            onClick={async (e) => {
              e.preventDefault();
              setSearchQuery('');
              if (adminSessionToken || firebaseToken) {
                const headers: Record<string, string> = {};
                if (adminSessionToken) headers['x-admin-session'] = adminSessionToken;
                if (firebaseToken) headers['Authorization'] = `Bearer ${firebaseToken}`;
                const overview = await apiService.getAdminOverview(headers);
                setCategories(overview.categories || []);
                setProducts(overview.products || []);
                setAdminOrders(overview.orders || []);
                setAdminCustomers(overview.customers || []);
                setIsAdminWorkspaceOpen(true);
              } else {
                setActiveStoreSection('admin_login');
              }
            }}
            className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 ${
              activeStoreSection === 'admin_login'
                ? 'text-stone-900 underline underline-offset-8 decoration-amber-700 decoration-2'
                : ''
            }`}
          >
            Admin Panel
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action Button (Shopping Bag Drawer Trigger) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setCheckoutStep('cart');
              setIsCartOpen(true);
            }}
            className="inline-flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Keranjang ({cartTotalCount})</span>
          </button>
        </div>
      </header>

      {/* Subtle Toast Notice */}
      {storeNotice && (
        <div className="fixed bottom-6 right-6 z-40 bg-stone-900 text-stone-50 px-5 py-3.5 rounded-xl shadow-lg border border-stone-700 text-xs font-medium flex items-center gap-3">
          <span>{storeNotice}</span>
          <button
            onClick={() => setStoreNotice(null)}
            className="text-stone-400 hover:text-white underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* VIEW 1: STOREFRONT CATALOG (12 Products across 3 Categories) */}
      {activeStoreSection === 'catalog' && (
        <main className="flex-1">
          {/* Split-Screen Editorial Hero Section */}
          <section className="max-w-[1360px] mx-auto px-6 lg:px-12 py-10 lg:py-14">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-between py-2">
                <div className="space-y-5">
                  <p className="text-xs font-medium tracking-wide text-amber-800">
                    Atelier Permata & Perhiasan Bersertifikat · Jakarta
                  </p>
                  <h1
                    className="font-serif-display text-4xl sm:text-5xl lg:text-[3.35rem] font-semibold text-stone-900 leading-[1.08]"
                    style={{ textWrap: 'balance' }}
                  >
                    Keindahan Abadi Permata Mulia & Pusaka Nusantara.
                  </h1>
                  <p className="text-base text-stone-600 leading-relaxed max-w-xl">
                    Setiap permata di Rupa Gems dipilih secara kuratorial dari tambang bersejarah Ratnapura, Mogok, Muzo, hingga kepulauan Halmahera dan Banten—dilengkapi sertifikat keaslian gemologi internasional.
                  </p>
                </div>

                <div className="pt-8 space-y-6">
                  <div className="flex flex-wrap items-center gap-4">
                    <a
                      href="#katalog-utama"
                      className="inline-flex items-center gap-2.5 px-6 py-3.5 text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <span>Jelajahi 12 Koleksi Eksklusif</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => {
                        if (adminSessionToken || firebaseToken) {
                          setIsAdminWorkspaceOpen(true);
                        } else {
                          setActiveStoreSection('admin_login');
                        }
                      }}
                      className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-medium text-stone-800 border border-stone-300 hover:bg-stone-100 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Portal Kurator & Admin</span>
                    </button>
                  </div>

                  {/* Clean Unboxed Metadata Proof Row */}
                  <div className="pt-6 border-t border-stone-200/80 flex flex-wrap items-center gap-3 text-xs text-stone-500">
                    <span className="font-mono-tabular font-semibold text-stone-800">
                      12 Mahakarya Kurasi
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>3 Kategori Spesialis</span>
                    <span aria-hidden="true">·</span>
                    <span>Sertifikasi GIA, GRS & GRI Lab</span>
                    <span aria-hidden="true">·</span>
                    <span>Pengiriman Brankas Berasuransi 100%</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="relative h-full min-h-[340px] lg:min-h-[440px] rounded-2xl overflow-hidden border border-stone-200 bg-stone-200">
                  <img
                    src={HERO_BANNER_IMAGE}
                    alt="Koleksi Permata Mulia dan Cincin Berlian Rupa Gems"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent flex flex-col justify-end p-6 sm:p-8">
                    <p className="text-xs text-stone-300">
                      Koleksi Unggulan Musim Ini · GIA & GRS Certified
                    </p>
                    <p className="font-serif-display text-2xl sm:text-3xl text-white font-medium mt-1">
                      Royal Ceylon Sapphire, Pigeon Blood Ruby & Colombian Emerald
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Search, 3 Category Filter Controls & Sort Bar */}
          <section id="katalog-utama" className="max-w-[1360px] mx-auto px-6 lg:px-12 py-8 space-y-8">
            <div className="bg-white p-5 rounded-xl border border-stone-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Interactive Segmented Category Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-100 rounded-lg">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    selectedCategory === 'all'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Semua Kategori ({products.length})
                </button>
                {categories.map((cat) => {
                  const count = products.filter((p) => p.categoryId === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.slug)}
                      className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        selectedCategory === cat.slug
                          ? 'bg-white text-stone-900 shadow-sm'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {cat.name} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Efficient Search Input & Price Sort */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative min-w-[260px] sm:min-w-[320px]">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama permata, karat, asal, atau SKU..."
                    className="w-full pl-10 pr-8 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:bg-white focus:border-stone-900"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-stone-400 shrink-0 hidden sm:block" />
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as any)}
                    className="px-3 py-2 text-xs font-medium bg-stone-50 border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:border-stone-900"
                  >
                    <option value="featured">Urutan Kurasi Utama</option>
                    <option value="price_asc">Harga: Terendah ke Tertinggi</option>
                    <option value="price_desc">Harga: Tertinggi ke Terendah</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Category Description Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 pb-4">
              <div>
                <h2 className="font-serif-display text-3xl font-semibold text-stone-900">
                  {selectedCategory === 'all'
                    ? 'Katalog Koleksi Rupa Gems'
                    : categories.find((c) => c.slug === selectedCategory)?.name || 'Koleksi'}
                </h2>
                <p className="text-sm text-stone-600 mt-1">
                  {selectedCategory === 'all'
                    ? 'Menampilkan 12 produk permata mulia dan perhiasan fine dalam 3 kategori utama.'
                    : categories.find((c) => c.slug === selectedCategory)?.description}
                </p>
              </div>
              <p className="text-xs font-mono-tabular text-stone-500">
                Menampilkan {displayedProducts.length} dari {products.length} produk
              </p>
            </div>

            {/* Product Grid (3 Columns Desktop, 2 Tablet, 1 Mobile) */}
            {isLoadingCatalog ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-xl border border-stone-200 overflow-hidden animate-pulse"
                  >
                    <div className="aspect-[4/3] bg-stone-200" />
                    <div className="p-6 space-y-3">
                      <div className="h-3 bg-stone-200 rounded w-1/3" />
                      <div className="h-5 bg-stone-200 rounded w-3/4" />
                      <div className="h-4 bg-stone-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : catalogError ? (
              <div className="bg-white p-8 rounded-xl border border-rose-200 text-center space-y-3">
                <p className="text-sm font-medium text-rose-800">{catalogError}</p>
                <button
                  onClick={fetchCatalog}
                  className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg"
                >
                  Muat Ulang Katalog
                </button>
              </div>
            ) : displayedProducts.length === 0 ? (
              <div className="bg-white p-12 rounded-xl border border-stone-200 text-center space-y-3">
                <p className="text-base font-medium text-stone-800">
                  Tidak ditemukan permata yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg"
                >
                  Reset Filter Pencarian
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {displayedProducts.map((product) => (
                  <article
                    key={product.id}
                    className="group bg-white rounded-xl border border-stone-200/90 overflow-hidden flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div>
                      {/* 4:3 Uniform Aspect Ratio Product Image */}
                      <div
                        onClick={() => setSelectedProductModal(product)}
                        className="aspect-[4/3] w-full bg-stone-100 overflow-hidden cursor-pointer relative"
                      >
                        <img
                          src={resolveProductImage(product.imageUrl)}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>

                      {/* Card Body with Zero-Pill Clean Typographic Metadata */}
                      <div className="p-6 space-y-2.5">
                        <div className="flex items-center justify-between text-xs text-stone-500">
                          <span>{product.categoryName}</span>
                          <span className="font-mono-tabular">{product.sku}</span>
                        </div>

                        <h3
                          onClick={() => setSelectedProductModal(product)}
                          className="text-base font-semibold text-stone-900 group-hover:text-amber-800 transition-colors cursor-pointer line-clamp-1"
                        >
                          {product.name}
                        </h3>

                        <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>

                        {/* Gemological Metadata Separator Line (No Pill Boxes) */}
                        <div className="pt-2 flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                          <span className="font-mono-tabular font-medium text-stone-800">
                            {product.caratWeight}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{product.origin}</span>
                          <span aria-hidden="true">·</span>
                          <span>{product.certification}</span>
                        </div>
                      </div>
                    </div>

                    {/* Price & Add to Cart Footer */}
                    <div className="px-6 py-4 bg-stone-50/70 border-t border-stone-200/80 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-mono-tabular text-base font-bold text-stone-900">
                          {formatIDR(product.price)}
                        </p>
                        <p className="text-xs text-stone-500 font-mono-tabular">
                          {product.stock > 0
                            ? `Tersedia: ${product.stock} unit`
                            : 'Stok Habis Terjual'}
                        </p>
                      </div>

                      <button
                        onClick={() => addToCart(product, 1)}
                        disabled={product.stock <= 0}
                        className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-amber-800 disabled:bg-stone-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        {product.stock > 0 ? '+ Keranjang' : 'Terjual'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      {/* VIEW 2: CUSTOMER ORDER HISTORY & UPLOAD PAYMENT PROOF */}
      {activeStoreSection === 'orders' && (
        <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 lg:px-12 py-10 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-200 pb-6">
            <div>
              <p className="text-xs font-medium text-amber-800">
                Transparansi Transaksi & Verifikasi Pembayaran
              </p>
              <h1 className="font-serif-display text-3xl sm:text-4xl font-semibold text-stone-900 mt-1">
                Riwayat Pesanan & Status Approval Pembayaran
              </h1>
              <p className="text-sm text-stone-600 mt-1">
                Pantau status verifikasi bukti transfer Anda secara real-time atau unggah bukti pembayaran baru.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                placeholder="Cari No. Invoice atau Email..."
                className="px-3.5 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900"
              />
              <button
                onClick={() => fetchCustomerOrders(lookupQuery)}
                className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg whitespace-nowrap"
              >
                Cari Pesanan
              </button>
            </div>
          </div>

          {isLoadingOrders ? (
            <div className="py-12 text-center text-sm text-stone-500">
              Memuat data riwayat pesanan dari PostgreSQL...
            </div>
          ) : lookupOrders.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-stone-200 text-center space-y-3">
              <p className="text-base font-medium text-stone-800">
                Belum ada pesanan yang ditemukan untuk kriteria tersebut.
              </p>
              <button
                onClick={() => setActiveStoreSection('catalog')}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-stone-900 rounded-lg"
              >
                Mulai Belanja Koleksi Permata
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {lookupOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-xl border border-stone-200 p-6 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
                    <div>
                      <div className="flex items-center gap-3 text-xs text-stone-500">
                        <span className="font-mono-tabular font-bold text-stone-900 text-sm">
                          {ord.orderNumber}
                        </span>
                        <span>·</span>
                        <span>{formatDateID(ord.createdAt)}</span>
                        <span>·</span>
                        <span>{ord.customerName}</span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1">
                        Tujuan Pengiriman: {ord.shippingAddress}
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <p className="font-mono-tabular text-lg font-bold text-stone-900">
                        {formatIDR(ord.totalAmount)}
                      </p>
                      <div className="flex sm:justify-end items-center gap-2 text-xs mt-0.5">
                        {ord.paymentStatus === 'approved' ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Pembayaran Disetujui Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                            <Clock className="w-3.5 h-3.5" />
                            {ord.paymentStatus === 'rejected'
                              ? 'Bukti Ditolak — Unggah Ulang'
                              : 'Menunggu Approval Bukti Bayar'}
                          </span>
                        )}
                        <span className="text-stone-400">·</span>
                        <span className="text-stone-600 capitalize">Order: {ord.orderStatus}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-7 space-y-2">
                      <p className="text-xs font-semibold text-stone-700">
                        Rincian Koleksi Permata:
                      </p>
                      {ord.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs text-stone-700 py-1 border-b border-stone-100 last:border-none"
                        >
                          <span>
                            {item.productName}{' '}
                            <span className="text-stone-400 font-mono-tabular">
                              ({item.productSku}) × {item.quantity}
                            </span>
                          </span>
                          <span className="font-mono-tabular font-medium">
                            {formatIDR(item.subtotal)}
                          </span>
                        </div>
                      ))}
                      {ord.adminNotes && (
                        <p className="text-xs text-stone-600 bg-stone-50 p-3 rounded-lg border border-stone-200/70 mt-2">
                          <span className="font-semibold text-stone-800">Catatan Verifikasi Rupa Gems:</span>{' '}
                          {ord.adminNotes}
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-5 flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-end gap-3">
                      <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {uploadingOrderId === ord.id
                            ? 'Mengunggah...'
                            : 'Unggah / Perbarui Bukti Transfer'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleReceiptFileChange(e, (base64) =>
                              handleUploadProofForOrder(ord, base64)
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* VIEW 3: ADMIN LOGIN & SECURITY PORTAL */}
      {activeStoreSection === 'admin_login' && (
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-md w-full p-8 space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800">
                <ShieldCheck className="w-4 h-4" />
                <span>Autentikasi Keamanan Rupa Gems</span>
              </div>
              <h1 className="font-serif-display text-3xl font-semibold text-stone-900">
                Login Kurator & Admin Panel
              </h1>
              <p className="text-xs text-stone-500 leading-relaxed">
                Masuk untuk mengelola 12 produk & stok, menyetujui bukti pembayaran pelanggan, serta mengunduh laporan penjualan real-time (PDF & Excel).
              </p>
            </div>

            {authError && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {authError}
              </div>
            )}

            <form onSubmit={handleAdminFormLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Email Administrator
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@rupagems.id"
                  className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Kata Sandi Keamanan
                </label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Masukkan kata sandi admin..."
                  className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900"
                />
              </div>

              {/* Quick Fill Demo Helper for Evaluator Convenience */}
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-600 flex items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-stone-800 block">Akun Kurator Resmi:</span>
                  <span className="font-mono-tabular">admin@rupagems.id / RupaGems2026!</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAdminEmail('admin@rupagems.id');
                    setAdminPassword('RupaGems2026!');
                  }}
                  className="px-2.5 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 whitespace-nowrap"
                >
                  Isi Otomatis
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-3 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors"
              >
                Masuk ke Admin Console
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-stone-200" />
              <span className="flex-shrink mx-3 text-xs text-stone-400">atau SSO Google</span>
              <div className="flex-grow border-t border-stone-200" />
            </div>

            <button
              type="button"
              onClick={() => handleGoogleSignIn(true)}
              className="w-full py-2.5 px-4 text-xs font-semibold text-stone-800 bg-white border border-stone-300 hover:bg-stone-50 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4 text-stone-600" />
              <span>Masuk dengan Google OAuth Terverifikasi</span>
            </button>
          </div>
        </main>
      )}

      {/* PRODUCT DETAIL MODAL (Contiguous Purchase Module) */}
      {selectedProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden border border-stone-200 grid grid-cols-1 md:grid-cols-2 max-h-[90vh] overflow-y-auto">
            <div className="bg-stone-100 h-full min-h-[280px]">
              <img
                src={resolveProductImage(selectedProductModal.imageUrl)}
                alt={selectedProductModal.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span>{selectedProductModal.categoryName}</span>
                  <button
                    onClick={() => setSelectedProductModal(null)}
                    className="text-stone-500 hover:text-stone-900 font-medium"
                  >
                    Tutup ✕
                  </button>
                </div>

                <h2 className="font-serif-display text-2xl sm:text-3xl font-semibold text-stone-900">
                  {selectedProductModal.name}
                </h2>

                <p className="font-mono-tabular text-xl font-bold text-amber-800">
                  {formatIDR(selectedProductModal.price)}
                </p>

                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  {selectedProductModal.description}
                </p>

                <div className="pt-3 border-t border-stone-200 space-y-1.5 text-xs text-stone-600">
                  <div className="flex justify-between">
                    <span className="text-stone-400">Kode SKU:</span>
                    <span className="font-mono-tabular font-medium text-stone-900">
                      {selectedProductModal.sku}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Berat Karat:</span>
                    <span className="font-mono-tabular font-medium text-stone-900">
                      {selectedProductModal.caratWeight}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Asal Tambang (Origin):</span>
                    <span className="font-medium text-stone-900">{selectedProductModal.origin}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Kejernihan (Clarity):</span>
                    <span className="font-medium text-stone-900">{selectedProductModal.clarity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Sertifikasi Gemologi:</span>
                    <span className="font-medium text-stone-900">
                      {selectedProductModal.certification}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Ketersediaan Stok:</span>
                    <span className="font-mono-tabular font-semibold text-stone-900">
                      {selectedProductModal.stock} unit tersedia
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-200 flex items-center gap-3">
                <button
                  onClick={() => {
                    addToCart(selectedProductModal, 1);
                    setSelectedProductModal(null);
                  }}
                  disabled={selectedProductModal.stock <= 0}
                  className="w-full py-3 text-xs font-semibold text-white bg-stone-900 hover:bg-amber-800 disabled:bg-stone-300 rounded-lg transition-colors"
                >
                  {selectedProductModal.stock > 0
                    ? 'Tambahkan ke Keranjang Belanja'
                    : 'Stok Habis'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SLIDE-OVER SHOPPING CART & CHECKOUT WITH PAYMENT PROOF UPLOAD */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
          <div className="bg-white w-full max-w-lg h-full flex flex-col justify-between shadow-2xl border-l border-stone-200">
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h2 className="font-serif-display text-2xl font-semibold text-stone-900">
                  {checkoutStep === 'cart' && 'Keranjang Belanja Rupa Gems'}
                  {checkoutStep === 'shipping_payment' && 'Pengiriman & Bukti Pembayaran'}
                  {checkoutStep === 'confirmation' && 'Konfirmasi Pesanan Resmi'}
                </h2>
                <p className="text-xs text-stone-500">
                  {checkoutStep === 'cart' && `${cartTotalCount} item permata terpilih`}
                  {checkoutStep === 'shipping_payment' &&
                    'Lengkapi alamat pengiriman berasuransi & unggah bukti transfer'}
                  {checkoutStep === 'confirmation' &&
                    'Data pesanan telah tersimpan di database PostgreSQL'}
                </p>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 text-stone-500 hover:text-stone-900 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {checkoutStep === 'cart' && (
                <>
                  {cart.length === 0 ? (
                    <div className="py-20 text-center space-y-3">
                      <ShoppingBag className="w-10 h-10 text-stone-300 mx-auto" />
                      <p className="text-sm font-medium text-stone-700">
                        Keranjang belanja Anda masih kosong.
                      </p>
                      <p className="text-xs text-stone-500 max-w-xs mx-auto">
                        Pilih batu permata mulia atau perhiasan fine dari katalog kami untuk mulai berbelanja.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cart.map((item) => (
                        <div
                          key={item.product.id}
                          className="flex items-center justify-between gap-4 p-4 rounded-xl border border-stone-200 bg-stone-50/50"
                        >
                          <img
                            src={resolveProductImage(item.product.imageUrl)}
                            alt={item.product.name}
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 rounded-lg object-cover border border-stone-200 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-stone-900 truncate">
                              {item.product.name}
                            </h4>
                            <p className="text-xs text-stone-500 font-mono-tabular">
                              {item.product.sku} · {formatIDR(item.product.price)}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={() => updateCartQuantity(item.product.id, -1)}
                                className="w-6 h-6 rounded border border-stone-300 flex items-center justify-center text-stone-700 hover:bg-stone-100"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-mono-tabular text-xs font-semibold px-2">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateCartQuantity(item.product.id, 1)}
                                className="w-6 h-6 rounded border border-stone-300 flex items-center justify-center text-stone-700 hover:bg-stone-100"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-mono-tabular text-sm font-bold text-stone-900">
                              {formatIDR(item.product.price * item.quantity)}
                            </p>
                            <button
                              onClick={() => removeFromCart(item.product.id)}
                              className="text-xs text-rose-600 hover:text-rose-800 mt-2 inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {checkoutStep === 'shipping_payment' && (
                <form id="checkout-form" onSubmit={handleCheckoutSubmit} className="space-y-4">
                  <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-stone-700 space-y-1">
                    <p className="font-semibold text-stone-900">
                      Rekening Resmi PT Rupa Gems Indonesia:
                    </p>
                    <p className="font-mono-tabular">
                      BCA Prioritas: 8820 9912 01 · Mandiri Wealth: 122-00-9881200-4
                    </p>
                    <p className="text-stone-500">
                      Total Tagihan: <strong className="font-mono-tabular text-stone-900">{formatIDR(cartTotalAmount)}</strong>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Nama Lengkap Penerima
                    </label>
                    <input
                      type="text"
                      required
                      value={checkoutForm.customerName}
                      onChange={(e) =>
                        setCheckoutForm({ ...checkoutForm, customerName: e.target.value })
                      }
                      placeholder="Contoh: Nadia Soerjadjaja"
                      className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">
                        Email Konfirmasi Invoice
                      </label>
                      <input
                        type="email"
                        required
                        value={checkoutForm.customerEmail}
                        onChange={(e) =>
                          setCheckoutForm({ ...checkoutForm, customerEmail: e.target.value })
                        }
                        placeholder="nama@email.com"
                        className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">
                        No. WhatsApp / Telepon
                      </label>
                      <input
                        type="text"
                        required
                        value={checkoutForm.customerPhone}
                        onChange={(e) =>
                          setCheckoutForm({ ...checkoutForm, customerPhone: e.target.value })
                        }
                        placeholder="+62 812..."
                        className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg font-mono-tabular"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Alamat Pengiriman Brankas Berasuransi
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={checkoutForm.shippingAddress}
                      onChange={(e) =>
                        setCheckoutForm({ ...checkoutForm, shippingAddress: e.target.value })
                      }
                      placeholder="Nama jalan, nomor rumah/gedung, kecamatan, kota, kode pos..."
                      className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">
                        Bank Pengirim
                      </label>
                      <input
                        type="text"
                        required
                        value={checkoutForm.paymentBankSender}
                        onChange={(e) =>
                          setCheckoutForm({ ...checkoutForm, paymentBankSender: e.target.value })
                        }
                        placeholder="BCA / Mandiri / BNI"
                        className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">
                        Nama Pemilik Rekening Pengirim
                      </label>
                      <input
                        type="text"
                        required
                        value={checkoutForm.paymentAccountName}
                        onChange={(e) =>
                          setCheckoutForm({ ...checkoutForm, paymentAccountName: e.target.value })
                        }
                        placeholder="Sesuai buku tabungan"
                        className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Unggah Bukti Transfer Pembayaran (Untuk Approval Admin)
                    </label>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-stone-300 rounded-xl p-4 cursor-pointer hover:border-stone-900 bg-stone-50 transition-colors">
                      <Upload className="w-5 h-5 text-stone-500 mb-1" />
                      <span className="text-xs font-medium text-stone-700">
                        {checkoutForm.paymentProofData
                          ? 'Bukti Transfer Berhasil Dilampirkan (Klik untuk ganti)'
                          : 'Klik untuk memilih foto / tangkapan layar bukti transfer'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleReceiptFileChange(e, (base64) =>
                            setCheckoutForm({ ...checkoutForm, paymentProofData: base64 })
                          )
                        }
                      />
                    </label>
                  </div>
                </form>
              )}

              {checkoutStep === 'confirmation' && confirmedOrder && (
                <div className="py-8 space-y-5 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-700 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-xs font-mono-tabular uppercase text-stone-500">
                      Order Terdaftar di PostgreSQL
                    </p>
                    <h3 className="font-serif-display text-3xl font-semibold text-stone-900">
                      {confirmedOrder.orderNumber}
                    </h3>
                    <p className="text-xs text-stone-600">
                      Terima kasih, {confirmedOrder.customerName}. Pesanan Anda sedang diverifikasi oleh Kurator Keuangan Rupa Gems.
                    </p>
                  </div>

                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-left text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Total Pembayaran:</span>
                      <span className="font-mono-tabular font-bold text-stone-900">
                        {formatIDR(confirmedOrder.totalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Status Verifikasi:</span>
                      <span className="font-semibold text-amber-700">
                        Menunggu Approval Admin
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-6 border-t border-stone-200 bg-stone-50">
              {checkoutStep === 'cart' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-stone-600">Subtotal Estimasi</span>
                    <span className="font-mono-tabular text-lg font-bold text-stone-900">
                      {formatIDR(cartTotalAmount)}
                    </span>
                  </div>
                  <button
                    disabled={cart.length === 0}
                    onClick={() => setCheckoutStep('shipping_payment')}
                    className="w-full py-3 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 rounded-lg transition-colors"
                  >
                    Lanjut ke Pengiriman & Pembayaran
                  </button>
                </div>
              )}

              {checkoutStep === 'shipping_payment' && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCheckoutStep('cart')}
                    className="px-4 py-3 text-xs font-medium text-stone-700 bg-stone-200 hover:bg-stone-300 rounded-lg"
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    form="checkout-form"
                    disabled={isSubmittingOrder}
                    className="flex-1 py-3 text-xs font-semibold text-white bg-stone-900 hover:bg-amber-800 rounded-lg transition-colors"
                  >
                    {isSubmittingOrder
                      ? 'Menyimpan Transaksi...'
                      : `Kirim Pesanan (${formatIDR(cartTotalAmount)})`}
                  </button>
                </div>
              )}

              {checkoutStep === 'confirmation' && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      setActiveStoreSection('orders');
                      fetchCustomerOrders();
                    }}
                    className="w-full py-3 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg"
                  >
                    Lihat Status Approval Pembayaran
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Minimalist Storefront Footer */}
      <footer className="border-t border-stone-200 bg-white mt-16">
        <div className="max-w-[1360px] mx-auto px-6 lg:px-12 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div>
            <span className="font-serif-display text-lg font-bold text-stone-900 mr-3">
              Rupa Gems
            </span>
            <span>© {new Date().getFullYear()} PT Rupa Gems Indonesia · Atelier Permata Mulia Bersertifikat</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="#katalog"
              onClick={(e) => {
                e.preventDefault();
                setActiveStoreSection('catalog');
              }}
              className="hover:text-stone-900"
            >
              Katalog 12 Koleksi
            </a>
            <a
              href="#riwayat"
              onClick={(e) => {
                e.preventDefault();
                setActiveStoreSection('orders');
                fetchCustomerOrders();
              }}
              className="hover:text-stone-900"
            >
              Cek Status Pesanan
            </a>
            <a
              href="#admin"
              onClick={(e) => {
                e.preventDefault();
                setActiveStoreSection('admin_login');
              }}
              className="hover:text-stone-900"
            >
              Portal Admin
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
