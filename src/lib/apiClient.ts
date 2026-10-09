import {
  AdminCategory,
  AdminProduct,
  AdminOrder,
  AdminCustomer,
} from '../components/AdminWorkspace.tsx';

const SAMPLE_RECEIPT_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="620" viewBox="0 0 480 620">
  <rect width="480" height="620" fill="#F8FAFC"/>
  <rect x="24" y="24" width="432" height="572" rx="12" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
  <rect x="24" y="24" width="432" height="90" rx="12" fill="#0F172A"/>
  <text x="52" y="64" fill="#F8FAFC" font-family="sans-serif" font-size="18" font-weight="bold">BUKTI TRANSFER M-BANKING</text>
  <text x="52" y="90" fill="#94A3B8" font-family="monospace" font-size="13">TRANSAKSI BERHASIL · VERIFIED RECEIPT</text>
  <line x1="52" y1="150" x2="428" y2="150" stroke="#E2E8F0" stroke-width="1"/>
  <text x="52" y="185" fill="#64748B" font-family="sans-serif" font-size="13">Tanggal &amp; Waktu</text>
  <text x="428" y="185" fill="#0F172A" font-family="monospace" font-size="13" text-anchor="end">08 Okt 2026 · 14:22 WIB</text>
  <text x="52" y="225" fill="#64748B" font-family="sans-serif" font-size="13">Bank Tujuan</text>
  <text x="428" y="225" fill="#0F172A" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="end">BCA Prioritas — 8820 9912 01</text>
  <text x="52" y="265" fill="#64748B" font-family="sans-serif" font-size="13">Penerima</text>
  <text x="428" y="265" fill="#0F172A" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="end">PT RUPA GEMS INDONESIA</text>
  <line x1="52" y1="295" x2="428" y2="295" stroke="#E2E8F0" stroke-dasharray="4 4"/>
  <text x="52" y="335" fill="#64748B" font-family="sans-serif" font-size="13">Status Transfer</text>
  <text x="428" y="335" fill="#059669" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="end">BERHASIL (SUCCESS)</text>
  <text x="52" y="375" fill="#64748B" font-family="sans-serif" font-size="13">Berita Acara</text>
  <text x="428" y="375" fill="#0F172A" font-family="monospace" font-size="13" text-anchor="end">INV-RUPA-GEMS-ORDER</text>
  <rect x="52" y="420" width="376" height="80" rx="8" fill="#F1F5F9"/>
  <text x="240" y="452" fill="#475569" font-family="sans-serif" font-size="12" text-anchor="middle">Lampiran Bukti Pembayaran Resmi Pelanggan</text>
  <text x="240" y="476" fill="#0F172A" font-family="monospace" font-size="14" font-weight="bold" text-anchor="middle">REF #BCA-99281744019</text>
  <text x="240" y="555" fill="#94A3B8" font-family="sans-serif" font-size="11" text-anchor="middle">Rupa Gems Digital Verification System</text>
</svg>
`)}`;

const INITIAL_CATEGORIES: AdminCategory[] = [
  {
    id: 1,
    name: 'Permata Mulia Lepas',
    slug: 'permata-mulia-lepas',
    description:
      'Koleksi batu permata mulia alami (Loose Precious Gemstones) bersertifikat gemologi internasional GIA & GRS.',
  },
  {
    id: 2,
    name: 'Cincin & Perhiasan Fine',
    slug: 'cincin-perhiasan-fine',
    description:
      'Mahakarya cincin solitaire, anting, dan gelang emas 18K & platina dengan tatahan permata langka.',
  },
  {
    id: 3,
    name: 'Liontin & Warisan Nusantara',
    slug: 'liontin-warisan-nusantara',
    description:
      'Perpaduan batu mulia eksotis Nusantara dan giok imperial dalam balutan desain pusaka modern.',
  },
];

const INITIAL_PRODUCTS: AdminProduct[] = [
  {
    id: 1,
    categoryId: 1,
    categoryName: 'Permata Mulia Lepas',
    categorySlug: 'permata-mulia-lepas',
    sku: 'RG-GEM-001',
    name: 'Royal Blue Ceylon Sapphire Cushion',
    slug: 'royal-blue-ceylon-sapphire-cushion',
    description:
      'Safir biru Royal alami asal Ratnapura, Sri Lanka dengan potongan cushion presisi tinggi dan kilau beludru tanpa pemanasan berlebih.',
    price: 28500000,
    stock: 4,
    caratWeight: '3.18 ct',
    origin: 'Ratnapura, Sri Lanka',
    clarity: 'VVS1 · Eye Clean',
    certification: 'GRS Swiss Certified',
    imageUrl: 'gem_sapphire',
  },
  {
    id: 2,
    categoryId: 1,
    categoryName: 'Permata Mulia Lepas',
    categorySlug: 'permata-mulia-lepas',
    sku: 'RG-GEM-002',
    name: 'Pigeon Blood Burmese Ruby Oval',
    slug: 'pigeon-blood-burmese-ruby-oval',
    description:
      'Mirah delima Burma warna Pigeon Blood dengan saturasi merah menyala dan fluoresensi alami yang sangat langka.',
    price: 42000000,
    stock: 2,
    caratWeight: '2.05 ct',
    origin: 'Mogok, Myanmar',
    clarity: 'VVS2 · Natural Vivid',
    certification: 'GIA & GRS Dual Report',
    imageUrl: 'gem_ruby',
  },
  {
    id: 3,
    categoryId: 1,
    categoryName: 'Permata Mulia Lepas',
    categorySlug: 'permata-mulia-lepas',
    sku: 'RG-GEM-003',
    name: 'Muzo Colombian Emerald Step-Cut',
    slug: 'muzo-colombian-emerald-step-cut',
    description:
      'Zamrud Kolombia tambang Muzo dengan potongan oktagonal klasik, menampilkan rona hijau zamrud yang dalam dan jernih.',
    price: 34800000,
    stock: 3,
    caratWeight: '2.64 ct',
    origin: 'Muzo, Colombia',
    clarity: 'VS1 · Minor Jardin',
    certification: 'GIA Colored Stone Report',
    imageUrl: 'gem_emerald',
  },
  {
    id: 4,
    categoryId: 1,
    categoryName: 'Permata Mulia Lepas',
    categorySlug: 'permata-mulia-lepas',
    sku: 'RG-GEM-004',
    name: 'Golden Canary Yellow Sapphire',
    slug: 'golden-canary-yellow-sapphire',
    description:
      'Safir kuning keemasan dengan kejernihan sempurna dan pantulan cahaya brilian yang memancarkan kemewahan hangat.',
    price: 16400000,
    stock: 7,
    caratWeight: '3.80 ct',
    origin: 'Ceylon, Sri Lanka',
    clarity: 'IF · Internally Flawless',
    certification: 'GIA Certified',
    imageUrl: 'gem_sapphire',
  },
  {
    id: 5,
    categoryId: 2,
    categoryName: 'Cincin & Perhiasan Fine',
    categorySlug: 'cincin-perhiasan-fine',
    sku: 'RG-JWL-005',
    name: 'Padparadscha Lotus 18K Rose Gold Ring',
    slug: 'padparadscha-lotus-18k-rose-gold-ring',
    description:
      'Cincin solitaire emas rose 18K bertatahkan safir Padparadscha rona jingga-merah muda teratai dengan berlian pavé F-VVS.',
    price: 38900000,
    stock: 3,
    caratWeight: '2.10 ct + 0.45 ct Dia',
    origin: 'Madagascar / Atelier Jakarta',
    clarity: 'VVS1 · Lotus Sunset Tone',
    certification: 'GRS & Rupa Atelier Cert',
    imageUrl: 'ring_padparadscha',
  },
  {
    id: 6,
    categoryId: 2,
    categoryName: 'Cincin & Perhiasan Fine',
    categorySlug: 'cincin-perhiasan-fine',
    sku: 'RG-JWL-006',
    name: 'Aurelia Halo Diamond & Sapphire Ring',
    slug: 'aurelia-halo-diamond-sapphire-ring',
    description:
      'Cincin emas kuning 18K dengan batu utama berlian bundar brilian dan halo berlian mikro yang dikerjakan dengan tangan.',
    price: 31500000,
    stock: 5,
    caratWeight: '1.50 ct Center + 0.60 ct Halo',
    origin: 'Antwerp Cut / Atelier Rupa',
    clarity: 'F Color · VVS1',
    certification: 'GIA Diamond Dossier',
    imageUrl: 'hero_banner',
  },
  {
    id: 7,
    categoryId: 2,
    categoryName: 'Cincin & Perhiasan Fine',
    categorySlug: 'cincin-perhiasan-fine',
    sku: 'RG-JWL-007',
    name: 'Crimson Empress Burmese Ruby Signet',
    slug: 'crimson-empress-burmese-ruby-signet',
    description:
      'Cincin signet kontemporer platina 950 dengan tatahan rubi merah darah merpati yang tegas untuk kolektor sejati.',
    price: 46500000,
    stock: 2,
    caratWeight: '2.40 ct Ruby + Pt950',
    origin: 'Mogok / Atelier Rupa',
    clarity: 'VVS2 · Unheated',
    certification: 'GRS Platinum Report',
    imageUrl: 'gem_ruby',
  },
  {
    id: 8,
    categoryId: 2,
    categoryName: 'Cincin & Perhiasan Fine',
    categorySlug: 'cincin-perhiasan-fine',
    sku: 'RG-JWL-008',
    name: 'Verdant Jardin Emerald Eternity Band',
    slug: 'verdant-jardin-emerald-eternity-band',
    description:
      'Cincin eternity emas putih 18K dengan deretan zamrud Kolombia potongan emerald-cut yang serasi dalam satu gradasi warna.',
    price: 24200000,
    stock: 6,
    caratWeight: '2.85 ct Total Weight',
    origin: 'Chivor, Colombia',
    clarity: 'VS1 · Matched Suite',
    certification: 'Rupa Gems Gemological Lab',
    imageUrl: 'gem_emerald',
  },
  {
    id: 9,
    categoryId: 3,
    categoryName: 'Liontin & Warisan Nusantara',
    categorySlug: 'liontin-warisan-nusantara',
    sku: 'RG-HRT-009',
    name: 'Imperial Green Jadeite Heirloom Pendant',
    slug: 'imperial-green-jadeite-heirloom-pendant',
    description:
      'Liontin giok Type-A Imperial Green cabochon dengan transparansi tinggi, dibingkai berlian alami di atas emas kuning 18K.',
    price: 36000000,
    stock: 3,
    caratWeight: '8.40 ct Cabochon',
    origin: 'Kachin / Kerajinan Nusantara',
    clarity: 'Type-A Translucent Vivid',
    certification: 'NGTC & GRI Lab Jakarta',
    imageUrl: 'pendant_jadeite',
  },
  {
    id: 10,
    categoryId: 3,
    categoryName: 'Liontin & Warisan Nusantara',
    categorySlug: 'liontin-warisan-nusantara',
    sku: 'RG-HRT-010',
    name: 'Bacan Palamea Super Kristal Pendant',
    slug: 'bacan-palamea-super-kristal-pendant',
    description:
      'Permata kebanggaan kepulauan Maluku Utara, Chrysocolla-in-Chalcedony kualitas kristal biru-hijau tembus cahaya dalam ikatan emas 18K.',
    price: 14500000,
    stock: 8,
    caratWeight: '11.20 ct Cabochon',
    origin: 'Pulau Kasiruta, Halmahera',
    clarity: 'Super Crystal · Bebas Kapur',
    certification: 'GRI Lab Indonesia',
    imageUrl: 'pendant_jadeite',
  },
  {
    id: 11,
    categoryId: 3,
    categoryName: 'Liontin & Warisan Nusantara',
    categorySlug: 'liontin-warisan-nusantara',
    sku: 'RG-HRT-011',
    name: 'Kalimaya Black Opal Jarong Banten Suite',
    slug: 'kalimaya-black-opal-jarong-banten-suite',
    description:
      'Batu mulia Kalimaya Black Opal asli Maja, Banten dengan permainan spektrum warna pelangi (play-of-color) penuh di seluruh permukaan.',
    price: 19800000,
    stock: 5,
    caratWeight: '4.15 ct Oval Cabochon',
    origin: 'Lebak, Banten, Indonesia',
    clarity: 'Full Harlequin Flash',
    certification: 'SKY Lab & GRI Certified',
    imageUrl: 'gem_sapphire',
  },
  {
    id: 12,
    categoryId: 3,
    categoryName: 'Liontin & Warisan Nusantara',
    categorySlug: 'liontin-warisan-nusantara',
    sku: 'RG-HRT-012',
    name: 'South Sea Golden Pearl & Padparadscha Drop',
    slug: 'south-sea-golden-pearl-padparadscha-drop',
    description:
      'Liontin mutiara laut selatan keemasan asli perairan Lombok dipadukan dengan safir merah muda alami di bagian mahkota.',
    price: 21900000,
    stock: 6,
    caratWeight: '13.5 mm Pearl + 0.90 ct Sapphire',
    origin: 'Lombok, NTB, Indonesia',
    clarity: 'AAA Mirror Luster',
    certification: 'Rupa Gems Heritage Cert',
    imageUrl: 'ring_padparadscha',
  },
];

const INITIAL_CUSTOMERS: AdminCustomer[] = [
  {
    id: 1,
    uid: 'admin-rupa-gems',
    name: 'Kurator Utama Rupa Gems',
    email: 'admin@rupagems.id',
    phone: '+62 811-9000-881',
    address: 'Plaza Indonesia Lantai 2, Jakarta Pusat',
    role: 'admin',
    orderCount: 0,
    totalSpent: 0,
    lastOrderDate: new Date().toISOString(),
  },
  {
    id: 2,
    uid: 'cust-nadia-soerjadjaja',
    name: 'Nadia Soerjadjaja',
    email: 'nadia.soerjadjaja@gmail.com',
    phone: '+62 812-8441-9920',
    address: 'Jl. Widya Chandra IV No. 18, Kebayoran Baru, Jakarta Selatan',
    role: 'customer',
    orderCount: 1,
    totalSpent: 67400000,
    lastOrderDate: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 3,
    uid: 'cust-hendrawan-wijaya',
    name: 'Hendrawan Wijaya',
    email: 'hendrawan.w@wijayacorp.co.id',
    phone: '+62 811-3409-221',
    address: 'Pakuwon Indah Villa Bukit Regensi Blok C-12, Surabaya',
    role: 'customer',
    orderCount: 1,
    totalSpent: 42000000,
    lastOrderDate: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 4,
    uid: 'cust-clarissa-halim',
    name: 'Clarissa Halim',
    email: 'clarissa.halim@yahoo.com',
    phone: '+62 818-2099-118',
    address: 'Jl. Ir. H. Juanda No. 142, Dago, Bandung',
    role: 'customer',
    orderCount: 1,
    totalSpent: 0,
    lastOrderDate: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 5,
    uid: 'cust-raden-baskoro',
    name: 'R.M. Baskoro Hadiningrat',
    email: 'baskoro.h@keraton.id',
    phone: '+62 813-2880-4451',
    address: 'Jl. Malioboro No. 54, Daerah Istimewa Yogyakarta',
    role: 'customer',
    orderCount: 1,
    totalSpent: 0,
    lastOrderDate: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
];

const INITIAL_ORDERS: AdminOrder[] = [
  {
    id: 1,
    orderNumber: 'INV-RG-20261001',
    userId: 2,
    customerName: 'Nadia Soerjadjaja',
    customerEmail: 'nadia.soerjadjaja@gmail.com',
    customerPhone: '+62 812-8441-9920',
    shippingAddress: 'Jl. Widya Chandra IV No. 18, Kebayoran Baru, Jakarta Selatan',
    totalAmount: 67400000,
    paymentMethod: 'Bank Transfer BCA Prioritas',
    paymentStatus: 'approved',
    orderStatus: 'completed',
    paymentProofData: SAMPLE_RECEIPT_SVG,
    paymentBankSender: 'BCA Prioritas',
    paymentAccountName: 'Nadia Soerjadjaja',
    adminNotes:
      'Dana telah diterima penuh di rekening BCA Prioritas PT Rupa Gems Indonesia. Pengiriman via kurir berasuransi Brinks.',
    approvedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    items: [
      {
        id: 1,
        productId: 1,
        productName: 'Royal Blue Ceylon Sapphire Cushion',
        productSku: 'RG-GEM-001',
        categoryName: 'Permata Mulia Lepas',
        price: 28500000,
        quantity: 1,
        subtotal: 28500000,
      },
      {
        id: 2,
        productId: 5,
        productName: 'Padparadscha Lotus 18K Rose Gold Ring',
        productSku: 'RG-JWL-005',
        categoryName: 'Cincin & Perhiasan Fine',
        price: 38900000,
        quantity: 1,
        subtotal: 38900000,
      },
    ],
  },
  {
    id: 2,
    orderNumber: 'INV-RG-20261002',
    userId: 3,
    customerName: 'Hendrawan Wijaya',
    customerEmail: 'hendrawan.w@wijayacorp.co.id',
    customerPhone: '+62 811-3409-221',
    shippingAddress: 'Pakuwon Indah Villa Bukit Regensi Blok C-12, Surabaya',
    totalAmount: 42000000,
    paymentMethod: 'Bank Transfer Mandiri',
    paymentStatus: 'approved',
    orderStatus: 'shipped',
    paymentProofData: SAMPLE_RECEIPT_SVG,
    paymentBankSender: 'Bank Mandiri Wealth',
    paymentAccountName: 'Hendrawan Wijaya',
    adminNotes: 'Bukti transfer valid. Sertifikat GRS asli disertakan dalam brankas segel.',
    approvedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    items: [
      {
        id: 3,
        productId: 2,
        productName: 'Pigeon Blood Burmese Ruby Oval',
        productSku: 'RG-GEM-002',
        categoryName: 'Permata Mulia Lepas',
        price: 42000000,
        quantity: 1,
        subtotal: 42000000,
      },
    ],
  },
  {
    id: 3,
    orderNumber: 'INV-RG-20261003',
    userId: 4,
    customerName: 'Clarissa Halim',
    customerEmail: 'clarissa.halim@yahoo.com',
    customerPhone: '+62 818-2099-118',
    shippingAddress: 'Jl. Ir. H. Juanda No. 142, Dago, Bandung',
    totalAmount: 36000000,
    paymentMethod: 'Bank Transfer BCA',
    paymentStatus: 'waiting_verification',
    orderStatus: 'processing',
    paymentProofData: SAMPLE_RECEIPT_SVG,
    paymentBankSender: 'BCA Digital / myBCA',
    paymentAccountName: 'Clarissa Halim',
    adminNotes: 'Menunggu verifikasi mutasi oleh bagian keuangan Rupa Gems.',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    items: [
      {
        id: 4,
        productId: 9,
        productName: 'Imperial Green Jadeite Heirloom Pendant',
        productSku: 'RG-HRT-009',
        categoryName: 'Liontin & Warisan Nusantara',
        price: 36000000,
        quantity: 1,
        subtotal: 36000000,
      },
    ],
  },
  {
    id: 4,
    orderNumber: 'INV-RG-20261004',
    userId: 5,
    customerName: 'R.M. Baskoro Hadiningrat',
    customerEmail: 'baskoro.h@keraton.id',
    customerPhone: '+62 813-2880-4451',
    shippingAddress: 'Jl. Malioboro No. 54, Daerah Istimewa Yogyakarta',
    totalAmount: 34300000,
    paymentMethod: 'Bank Transfer BNI Emerald',
    paymentStatus: 'waiting_verification',
    orderStatus: 'processing',
    paymentProofData: SAMPLE_RECEIPT_SVG,
    paymentBankSender: 'BNI Emerald',
    paymentAccountName: 'R.M. Baskoro Hadiningrat',
    adminNotes: 'Bukti pembayaran baru diunggah oleh pelanggan, siap direview.',
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    items: [
      {
        id: 5,
        productId: 10,
        productName: 'Bacan Palamea Super Kristal Pendant',
        productSku: 'RG-HRT-010',
        categoryName: 'Liontin & Warisan Nusantara',
        price: 14500000,
        quantity: 1,
        subtotal: 14500000,
      },
      {
        id: 6,
        productId: 11,
        productName: 'Kalimaya Black Opal Jarong Banten Suite',
        productSku: 'RG-HRT-011',
        categoryName: 'Liontin & Warisan Nusantara',
        price: 19800000,
        quantity: 1,
        subtotal: 19800000,
      },
    ],
  },
];

// Persistent state for static hosting fallback (when deployed to static Vercel without server.ts)
// Uses window.localStorage + BroadcastChannel so orders placed in one tab immediately appear in Admin Panel in another tab.
const STORAGE_KEYS = {
  PRODUCTS: 'rupa_gems_store_products_v2',
  ORDERS: 'rupa_gems_store_orders_v2',
  CUSTOMERS: 'rupa_gems_store_customers_v2',
};

function readPersisted<T>(key: string, defaultData: T): T {
  if (typeof window === 'undefined') return defaultData;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      window.localStorage.setItem(key, JSON.stringify(defaultData));
      return defaultData;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as unknown as T;
    }
    return defaultData;
  } catch {
    return defaultData;
  }
}

function writePersisted<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('rupa_gems_sync_channel');
      bc.postMessage({ type: 'DATA_UPDATED', key, timestamp: Date.now() });
      bc.close();
    }
  } catch {
    // Ignore quota errors
  }
}

function getFallbackCategories(): AdminCategory[] {
  return [...INITIAL_CATEGORIES];
}

function getFallbackProducts(): AdminProduct[] {
  return readPersisted<AdminProduct[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
}

function setFallbackProducts(next: AdminProduct[]): void {
  writePersisted(STORAGE_KEYS.PRODUCTS, next);
}

function getFallbackOrders(): AdminOrder[] {
  return readPersisted<AdminOrder[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
}

function setFallbackOrders(next: AdminOrder[]): void {
  writePersisted(STORAGE_KEYS.ORDERS, next);
}

function getFallbackCustomers(): AdminCustomer[] {
  const savedUsers = readPersisted<AdminCustomer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  const allOrders = getFallbackOrders();

  const map = new Map<string, AdminCustomer>();
  for (const c of savedUsers) {
    map.set(c.email.toLowerCase(), { ...c });
  }

  for (const o of allOrders) {
    const key = o.customerEmail.toLowerCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        id: o.userId || o.id + 1000,
        uid: `cust-${key.replace(/[^a-z0-9]/g, '-')}`,
        name: o.customerName,
        email: o.customerEmail,
        phone: o.customerPhone,
        address: o.shippingAddress,
        role: 'customer',
        orderCount: 1,
        totalSpent: o.totalAmount,
        lastOrderDate: o.createdAt,
      });
    } else {
      if (o.customerPhone && existing.phone === '-') existing.phone = o.customerPhone;
      if (o.shippingAddress && existing.address === '-') existing.address = o.shippingAddress;
    }
  }

  return Array.from(map.values()).map((c) => {
    const userOrders = allOrders.filter(
      (o) => o.customerEmail.toLowerCase() === c.email.toLowerCase()
    );
    const totalSpent = userOrders
      .filter((o) => o.paymentStatus !== 'rejected')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    return {
      ...c,
      orderCount: userOrders.length,
      totalSpent,
      lastOrderDate: userOrders.length > 0 ? userOrders[0].createdAt : c.lastOrderDate,
    };
  });
}

function setFallbackCustomers(next: AdminCustomer[]): void {
  writePersisted(STORAGE_KEYS.CUSTOMERS, next);
}

/**
 * Helper to parse JSON safely. If the host (e.g., static Vercel deployment) returns
 * an HTML 404 page ("The page could not be found...") instead of JSON from server.ts,
 * it throws a specific FallbackTriggerError so we can seamlessly serve the store data.
 */
class StaticHostFallbackError extends Error {
  constructor() {
    super('Static host detected');
  }
}

async function fetchJsonOrThrowFallback(url: string, options?: RequestInit): Promise<any> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new StaticHostFallbackError();
    }
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Terjadi kesalahan pada permintaan.');
    }
    return data;
  } catch (err: any) {
    if (
      err instanceof StaticHostFallbackError ||
      err instanceof SyntaxError ||
      (typeof err?.message === 'string' &&
        (err.message.includes('Unexpected token') ||
          err.message.includes('Failed to fetch') ||
          err.message.includes('NetworkError')))
    ) {
      throw new StaticHostFallbackError();
    }
    throw err;
  }
}

export const apiService = {
  async getCatalog(): Promise<{ categories: AdminCategory[]; products: AdminProduct[] }> {
    try {
      return await fetchJsonOrThrowFallback('/api/catalog');
    } catch (err) {
      if (err instanceof StaticHostFallbackError) {
        return {
          categories: getFallbackCategories(),
          products: getFallbackProducts(),
        };
      }
      throw err;
    }
  },

  async lookupOrders(query?: string): Promise<{ orders: AdminOrder[] }> {
    try {
      const params = new URLSearchParams();
      if (query && query.trim() !== '') {
        if (query.includes('@')) {
          params.set('email', query.trim());
        } else {
          params.set('orderNumber', query.trim());
        }
      }
      return await fetchJsonOrThrowFallback(`/api/orders/lookup?${params.toString()}`);
    } catch (err) {
      if (err instanceof StaticHostFallbackError) {
        const allOrders = getFallbackOrders();
        const q = (query || '').trim().toLowerCase();
        const filtered = q
          ? allOrders.filter(
              (o) =>
                o.orderNumber.toLowerCase().includes(q) ||
                o.customerEmail.toLowerCase().includes(q) ||
                o.customerName.toLowerCase().includes(q)
            )
          : allOrders;
        return { orders: [...filtered] };
      }
      throw err;
    }
  },

  async createOrder(payload: any): Promise<{ order: AdminOrder }> {
    try {
      const result = await fetchJsonOrThrowFallback('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('rupa_gems_sync_channel');
        bc.postMessage({ type: 'ORDER_CREATED', timestamp: Date.now() });
        bc.close();
      }
      return result;
    } catch (err) {
      if (err instanceof StaticHostFallbackError) {
        const currentProducts = getFallbackProducts();
        const currentOrders = getFallbackOrders();
        const currentCustomers = getFallbackCustomers();

        let totalAmount = 0;
        const orderItemsList: AdminOrder['items'] = [];

        const updatedProducts = currentProducts.map((prod) => {
          const item = (payload.items || []).find((i: any) => i.productId === prod.id);
          if (!item) return prod;
          const subtotal = prod.price * item.quantity;
          totalAmount += subtotal;
          orderItemsList.push({
            id: Date.now() + Math.floor(Math.random() * 1000),
            productId: prod.id,
            productName: prod.name,
            productSku: prod.sku,
            categoryName: prod.categoryName,
            price: prod.price,
            quantity: item.quantity,
            subtotal,
          });
          return {
            ...prod,
            stock: Math.max(0, prod.stock - item.quantity),
          };
        });

        setFallbackProducts(updatedProducts);

        const newOrder: AdminOrder = {
          id: currentOrders.length + 1 + Math.floor(Math.random() * 1000),
          orderNumber: `INV-RG-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
          userId: currentCustomers.length + 1,
          customerName: payload.customerName,
          customerEmail: payload.customerEmail,
          customerPhone: payload.customerPhone,
          shippingAddress: payload.shippingAddress,
          totalAmount,
          paymentMethod: payload.paymentMethod || 'Bank Transfer BCA Prioritas',
          paymentStatus: 'waiting_verification',
          orderStatus: 'processing',
          paymentProofData: payload.paymentProofData || SAMPLE_RECEIPT_SVG,
          paymentBankSender: payload.paymentBankSender || 'BCA Prioritas',
          paymentAccountName: payload.paymentAccountName || payload.customerName,
          adminNotes: 'Pesanan baru diterima. Menunggu verifikasi bukti pembayaran oleh Admin.',
          createdAt: new Date().toISOString(),
          items: orderItemsList,
        };

        const nextOrders = [newOrder, ...currentOrders];
        setFallbackOrders(nextOrders);

        const existingCust = currentCustomers.find(
          (c) => c.email.toLowerCase() === payload.customerEmail.toLowerCase()
        );
        if (existingCust) {
          setFallbackCustomers(
            currentCustomers.map((c) =>
              c.email.toLowerCase() === payload.customerEmail.toLowerCase()
                ? {
                    ...c,
                    name: payload.customerName || c.name,
                    phone: payload.customerPhone || c.phone,
                    address: payload.shippingAddress || c.address,
                    orderCount: c.orderCount + 1,
                    totalSpent: c.totalSpent + totalAmount,
                    lastOrderDate: newOrder.createdAt,
                  }
                : c
            )
          );
        } else {
          setFallbackCustomers([
            {
              id: currentCustomers.length + 1 + Math.floor(Math.random() * 1000),
              uid: payload.uid || `cust-${Date.now()}`,
              name: payload.customerName,
              email: payload.customerEmail,
              phone: payload.customerPhone,
              address: payload.shippingAddress,
              role: 'customer',
              orderCount: 1,
              totalSpent: totalAmount,
              lastOrderDate: newOrder.createdAt,
            },
            ...currentCustomers,
          ]);
        }

        return { order: newOrder };
      }
      throw err;
    }
  },

  async uploadPaymentProof(orderId: number, payload: any): Promise<{ order: AdminOrder }> {
    try {
      const result = await fetchJsonOrThrowFallback(`/api/orders/${orderId}/payment-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('rupa_gems_sync_channel');
        bc.postMessage({ type: 'PROOF_UPLOADED', timestamp: Date.now() });
        bc.close();
      }
      return result;
    } catch (err) {
      if (err instanceof StaticHostFallbackError) {
        const currentOrders = getFallbackOrders();
        const nextOrders = currentOrders.map((o) =>
          o.id === orderId
            ? {
                ...o,
                paymentProofData: payload.paymentProofData,
                paymentBankSender: payload.paymentBankSender,
                paymentAccountName: payload.paymentAccountName,
                paymentStatus: 'waiting_verification',
              }
            : o
        );
        setFallbackOrders(nextOrders);
        const updated = nextOrders.find((o) => o.id === orderId)!;
        return { order: updated };
      }
      throw err;
    }
  },

  async adminLogin(email: string, password: string): Promise<{ token: string; user: any }> {
    try {
      return await fetchJsonOrThrowFallback('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    } catch (err) {
      if (err instanceof StaticHostFallbackError) {
        if (
          email.trim().toLowerCase() === 'admin@rupagems.id' &&
          password === 'RupaGems2026!'
        ) {
          return {
            token: 'rupa-gems-admin-verified-token-2026',
            user: getFallbackCustomers()[0],
          };
        }
        throw new Error(
          'Kredensial Admin tidak valid. Gunakan email admin@rupagems.id dan kata sandi RupaGems2026!'
        );
      }
      throw err;
    }
  },

  async getAdminOverview(authHeaders: Record<string, string>): Promise<{
    categories: AdminCategory[];
    products: AdminProduct[];
    orders: AdminOrder[];
    customers: AdminCustomer[];
  }> {
    try {
      return await fetchJsonOrThrowFallback('/api/admin/overview', {
        headers: authHeaders,
      });
    } catch (err) {
      if (err instanceof StaticHostFallbackError) {
        return {
          categories: getFallbackCategories(),
          products: getFallbackProducts(),
          orders: getFallbackOrders(),
          customers: getFallbackCustomers(),
        };
      }
      throw err;
    }
  },

  async saveProduct(
    editingId: number | null,
    payload: any,
    authHeaders: Record<string, string>
  ): Promise<void> {
    const url = editingId ? `/api/admin/products/${editingId}` : '/api/admin/products';
    const method = editingId ? 'PUT' : 'POST';
    try {
      await fetchJsonOrThrowFallback(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      if (err instanceof StaticHostFallbackError) {
        const cats = getFallbackCategories();
        const prods = getFallbackProducts();
        const cat = cats.find((c) => c.id === Number(payload.categoryId)) || cats[0];
        if (editingId) {
          setFallbackProducts(
            prods.map((p) =>
              p.id === editingId
                ? {
                    ...p,
                    ...payload,
                    categoryId: cat.id,
                    categoryName: cat.name,
                    categorySlug: cat.slug,
                    price: Number(payload.price ?? p.price),
                    stock: Number(payload.stock ?? p.stock),
                  }
                : p
            )
          );
        } else {
          const newProd: AdminProduct = {
            id: Date.now(),
            categoryId: cat.id,
            categoryName: cat.name,
            categorySlug: cat.slug,
            sku: payload.sku || `RG-NEW-${prods.length + 1}`,
            name: payload.name,
            slug: payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            description: payload.description,
            price: Number(payload.price),
            stock: Number(payload.stock),
            caratWeight: payload.caratWeight,
            origin: payload.origin,
            clarity: payload.clarity,
            certification: payload.certification,
            imageUrl: payload.imageUrl || 'gem_sapphire',
          };
          setFallbackProducts([...prods, newProd]);
        }
        return;
      }
      throw err;
    }
  },

  async deleteProduct(productId: number, authHeaders: Record<string, string>): Promise<void> {
    try {
      await fetchJsonOrThrowFallback(`/api/admin/products/${productId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
    } catch (err) {
      if (err instanceof StaticHostFallbackError) {
        setFallbackProducts(getFallbackProducts().filter((p) => p.id !== productId));
        return;
      }
      throw err;
    }
  },

  async reviewOrder(
    orderId: number,
    payload: {
      paymentStatus: 'approved' | 'rejected' | 'waiting_verification';
      orderStatus: 'processing' | 'shipped' | 'completed' | 'cancelled';
      adminNotes: string;
    },
    authHeaders: Record<string, string>
  ): Promise<void> {
    try {
      await fetchJsonOrThrowFallback(`/api/admin/orders/${orderId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      if (err instanceof StaticHostFallbackError) {
        const nextOrders = getFallbackOrders().map((o) =>
          o.id === orderId
            ? {
                ...o,
                paymentStatus: payload.paymentStatus,
                orderStatus: payload.orderStatus,
                adminNotes: payload.adminNotes,
                approvedAt:
                  payload.paymentStatus === 'approved' ? new Date().toISOString() : null,
              }
            : o
        );
        setFallbackOrders(nextOrders);
        return;
      }
      throw err;
    }
  },

  async saveCustomer(payload: any, authHeaders: Record<string, string>): Promise<void> {
    try {
      await fetchJsonOrThrowFallback('/api/admin/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      if (err instanceof StaticHostFallbackError) {
        const current = getFallbackCustomers();
        if (payload.id) {
          setFallbackCustomers(
            current.map((c) => (c.id === payload.id ? { ...c, ...payload } : c))
          );
        } else {
          setFallbackCustomers([
            {
              id: Date.now(),
              uid: `cust-${Date.now()}`,
              name: payload.name,
              email: payload.email,
              phone: payload.phone,
              address: payload.address,
              role: 'customer',
              orderCount: 0,
              totalSpent: 0,
              lastOrderDate: new Date().toISOString(),
            },
            ...current,
          ]);
        }
        return;
      }
      throw err;
    }
  },
};
