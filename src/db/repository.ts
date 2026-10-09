import { db } from './index.ts';
import { categories, products, users, orders, orderItems } from './schema.ts';
import { eq, desc, asc, ilike, or, and } from 'drizzle-orm';

// Sample SVG Data URI for sample payment receipts in seeded orders
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

export async function getOrCreateUser(
  uid: string,
  email: string,
  name?: string,
  phone?: string,
  address?: string
) {
  try {
    const displayName = name || email.split('@')[0] || 'Pelanggan Rupa Gems';
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        name: displayName,
        phone: phone || '-',
        address: address || '-',
        role: email === 'admin@rupagems.id' ? 'admin' : 'customer',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(name ? { name } : {}),
          ...(phone ? { phone } : {}),
          ...(address ? { address } : {}),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Gagal menyinkronkan profil pengguna.', { cause: error });
  }
}

export async function ensureSeededData() {
  try {
    const existingCategories = await db.select().from(categories);
    if (existingCategories.length > 0) {
      return;
    }

    console.log('Seeding Rupa Gems initial PostgreSQL data (3 Categories, 12 Products, Customers & Orders)...');

    // 1. Insert 3 Categories
    const insertedCategories = await db
      .insert(categories)
      .values([
        {
          name: 'Permata Mulia Lepas',
          slug: 'permata-mulia-lepas',
          description: 'Koleksi batu permata mulia alami (Loose Precious Gemstones) bersertifikat gemologi internasional GIA & GRS.',
        },
        {
          name: 'Cincin & Perhiasan Fine',
          slug: 'cincin-perhiasan-fine',
          description: 'Mahakarya cincin solitaire, anting, dan gelang emas 18K & platina dengan tatahan permata langka.',
        },
        {
          name: 'Liontin & Warisan Nusantara',
          slug: 'liontin-warisan-nusantara',
          description: 'Perpaduan batu mulia eksotis Nusantara dan giok imperial dalam balutan desain pusaka modern.',
        },
      ])
      .returning();

    const catLoose = insertedCategories[0].id;
    const catRings = insertedCategories[1].id;
    const catHeritage = insertedCategories[2].id;

    // 2. Insert 12 Products across the 3 Categories
    const insertedProducts = await db
      .insert(products)
      .values([
        // Category 1: Permata Mulia Lepas (4 Products)
        {
          categoryId: catLoose,
          sku: 'RG-GEM-001',
          name: 'Royal Blue Ceylon Sapphire Cushion',
          slug: 'royal-blue-ceylon-sapphire-cushion',
          description: 'Safir biru Royal alami asal Ratnapura, Sri Lanka dengan potongan cushion presisi tinggi dan kilau beludru tanpa pemanasan berlebih.',
          price: 28500000,
          stock: 4,
          caratWeight: '3.18 ct',
          origin: 'Ratnapura, Sri Lanka',
          clarity: 'VVS1 · Eye Clean',
          certification: 'GRS Swiss Certified',
          imageUrl: 'gem_sapphire',
          isFeatured: 1,
        },
        {
          categoryId: catLoose,
          sku: 'RG-GEM-002',
          name: 'Pigeon Blood Burmese Ruby Oval',
          slug: 'pigeon-blood-burmese-ruby-oval',
          description: 'Mirah delima Burma warna Pigeon Blood dengan saturasi merah menyala dan fluoresensi alami yang sangat langka.',
          price: 42000000,
          stock: 2,
          caratWeight: '2.05 ct',
          origin: 'Mogok, Myanmar',
          clarity: 'VVS2 · Natural Vivid',
          certification: 'GIA & GRS Dual Report',
          imageUrl: 'gem_ruby',
          isFeatured: 1,
        },
        {
          categoryId: catLoose,
          sku: 'RG-GEM-003',
          name: 'Muzo Colombian Emerald Step-Cut',
          slug: 'muzo-colombian-emerald-step-cut',
          description: 'Zamrud Kolombia tambang Muzo dengan potongan oktagonal klasik, menampilkan rona hijau zamrud yang dalam dan jernih.',
          price: 34800000,
          stock: 3,
          caratWeight: '2.64 ct',
          origin: 'Muzo, Colombia',
          clarity: 'VS1 · Minor Jardin',
          certification: 'GIA Colored Stone Report',
          imageUrl: 'gem_emerald',
          isFeatured: 1,
        },
        {
          categoryId: catLoose,
          sku: 'RG-GEM-004',
          name: 'Golden Canary Yellow Sapphire',
          slug: 'golden-canary-yellow-sapphire',
          description: 'Safir kuning keemasan dengan kejernihan sempurna dan pantulan cahaya brilian yang memancarkan kemewahan hangat.',
          price: 16400000,
          stock: 7,
          caratWeight: '3.80 ct',
          origin: 'Ceylon, Sri Lanka',
          clarity: 'IF · Internally Flawless',
          certification: 'GIA Certified',
          imageUrl: 'gem_sapphire',
          isFeatured: 0,
        },

        // Category 2: Cincin & Perhiasan Fine (4 Products)
        {
          categoryId: catRings,
          sku: 'RG-JWL-005',
          name: 'Padparadscha Lotus 18K Rose Gold Ring',
          slug: 'padparadscha-lotus-18k-rose-gold-ring',
          description: 'Cincin solitaire emas rose 18K bertatahkan safir Padparadscha rona jingga-merah muda teratai dengan berlian pavé F-VVS.',
          price: 38900000,
          stock: 3,
          caratWeight: '2.10 ct + 0.45 ct Dia',
          origin: 'Madagascar / Atelier Jakarta',
          clarity: 'VVS1 · Lotus Sunset Tone',
          certification: 'GRS & Rupa Atelier Cert',
          imageUrl: 'ring_padparadscha',
          isFeatured: 1,
        },
        {
          categoryId: catRings,
          sku: 'RG-JWL-006',
          name: 'Aurelia Halo Diamond & Sapphire Ring',
          slug: 'aurelia-halo-diamond-sapphire-ring',
          description: 'Cincin emas kuning 18K dengan batu utama berlian bundar brilian dan halo berlian mikro yang dikerjakan dengan tangan.',
          price: 31500000,
          stock: 5,
          caratWeight: '1.50 ct Center + 0.60 ct Halo',
          origin: 'Antwerp Cut / Atelier Rupa',
          clarity: 'F Color · VVS1',
          certification: 'GIA Diamond Dossier',
          imageUrl: 'hero_banner',
          isFeatured: 1,
        },
        {
          categoryId: catRings,
          sku: 'RG-JWL-007',
          name: 'Crimson Empress Burmese Ruby Signet',
          slug: 'crimson-empress-burmese-ruby-signet',
          description: 'Cincin signet kontemporer platina 950 dengan tatahan rubi merah darah merpati yang tegas untuk kolektor sejati.',
          price: 46500000,
          stock: 2,
          caratWeight: '2.40 ct Ruby + Pt950',
          origin: 'Mogok / Atelier Rupa',
          clarity: 'VVS2 · Unheated',
          certification: 'GRS Platinum Report',
          imageUrl: 'gem_ruby',
          isFeatured: 0,
        },
        {
          categoryId: catRings,
          sku: 'RG-JWL-008',
          name: 'Verdant Jardin Emerald Eternity Band',
          slug: 'verdant-jardin-emerald-eternity-band',
          description: 'Cincin eternity emas putih 18K dengan deretan zamrud Kolombia potongan emerald-cut yang serasi dalam satu gradasi warna.',
          price: 24200000,
          stock: 6,
          caratWeight: '2.85 ct Total Weight',
          origin: 'Chivor, Colombia',
          clarity: 'VS1 · Matched Suite',
          certification: 'Rupa Gems Gemological Lab',
          imageUrl: 'gem_emerald',
          isFeatured: 0,
        },

        // Category 3: Liontin & Warisan Nusantara (4 Products)
        {
          categoryId: catHeritage,
          sku: 'RG-HRT-009',
          name: 'Imperial Green Jadeite Heirloom Pendant',
          slug: 'imperial-green-jadeite-heirloom-pendant',
          description: 'Liontin giok Type-A Imperial Green cabochon dengan transparansi tinggi, dibingkai berlian alami di atas emas kuning 18K.',
          price: 36000000,
          stock: 3,
          caratWeight: '8.40 ct Cabochon',
          origin: 'Kachin / Kerajinan Nusantara',
          clarity: 'Type-A Translucent Vivid',
          certification: 'NGTC & GRI Lab Jakarta',
          imageUrl: 'pendant_jadeite',
          isFeatured: 1,
        },
        {
          categoryId: catHeritage,
          sku: 'RG-HRT-010',
          name: 'Bacan Palamea Super Kristal Pendant',
          slug: 'bacan-palamea-super-kristal-pendant',
          description: 'Permata kebanggaan kepulauan Maluku Utara, Chrysocolla-in-Chalcedony kualitas kristal biru-hijau tembus cahaya dalam ikatan emas 18K.',
          price: 14500000,
          stock: 8,
          caratWeight: '11.20 ct Cabochon',
          origin: 'Pulau Kasiruta, Halmahera',
          clarity: 'Super Crystal · Bebas Kapur',
          certification: 'GRI Lab Indonesia',
          imageUrl: 'pendant_jadeite',
          isFeatured: 0,
        },
        {
          categoryId: catHeritage,
          sku: 'RG-HRT-011',
          name: 'Kalimaya Black Opal Jarong Banten Suite',
          slug: 'kalimaya-black-opal-jarong-banten-suite',
          description: 'Batu mulia Kalimaya Black Opal asli Maja, Banten dengan permainan spektrum warna pelangi (play-of-color) penuh di seluruh permukaan.',
          price: 19800000,
          stock: 5,
          caratWeight: '4.15 ct Oval Cabochon',
          origin: 'Lebak, Banten, Indonesia',
          clarity: 'Full Harlequin Flash',
          certification: 'SKY Lab & GRI Certified',
          imageUrl: 'gem_sapphire',
          isFeatured: 0,
        },
        {
          categoryId: catHeritage,
          sku: 'RG-HRT-012',
          name: 'South Sea Golden Pearl & Padparadscha Drop',
          slug: 'south-sea-golden-pearl-padparadscha-drop',
          description: 'Liontin mutiara laut selatan keemasan asli perairan Lombok dipadukan dengan safir merah muda alami di bagian mahkota.',
          price: 21900000,
          stock: 6,
          caratWeight: '13.5 mm Pearl + 0.90 ct Sapphire',
          origin: 'Lombok, NTB, Indonesia',
          clarity: 'AAA Mirror Luster',
          certification: 'Rupa Gems Heritage Cert',
          imageUrl: 'ring_padparadscha',
          isFeatured: 0,
        },
      ])
      .returning();

    // 3. Insert Initial Customers & Admin User
    const insertedUsers = await db
      .insert(users)
      .values([
        {
          uid: 'admin-rupa-gems',
          name: 'Kurator Utama Rupa Gems',
          email: 'admin@rupagems.id',
          phone: '+62 811-9000-881',
          address: 'Plaza Indonesia Lantai 2, Jakarta Pusat',
          role: 'admin',
        },
        {
          uid: 'cust-nadia-soerjadjaja',
          name: 'Nadia Soerjadjaja',
          email: 'nadia.soerjadjaja@gmail.com',
          phone: '+62 812-8441-9920',
          address: 'Jl. Widya Chandra IV No. 18, Kebayoran Baru, Jakarta Selatan',
          role: 'customer',
        },
        {
          uid: 'cust-hendrawan-wijaya',
          name: 'Hendrawan Wijaya',
          email: 'hendrawan.w@wijayacorp.co.id',
          phone: '+62 811-3409-221',
          address: 'Pakuwon Indah Villa Bukit Regensi Blok C-12, Surabaya',
          role: 'customer',
        },
        {
          uid: 'cust-clarissa-halim',
          name: 'Clarissa Halim',
          email: 'clarissa.halim@yahoo.com',
          phone: '+62 818-2099-118',
          address: 'Jl. Ir. H. Juanda No. 142, Dago, Bandung',
          role: 'customer',
        },
        {
          uid: 'cust-raden-baskoro',
          name: 'R.M. Baskoro Hadiningrat',
          email: 'baskoro.h@keraton.id',
          phone: '+62 813-2880-4451',
          address: 'Jl. Malioboro No. 54, Daerah Istimewa Yogyakarta',
          role: 'customer',
        },
      ])
      .returning();

    const uNadia = insertedUsers[1];
    const uHendrawan = insertedUsers[2];
    const uClarissa = insertedUsers[3];
    const uBaskoro = insertedUsers[4];

    // 4. Insert Realistic Orders & Order Items for Dashboard Analytics & Payment Proof Approval
    const now = new Date();
    const d1 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const d2 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const d3 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const d4 = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    const insertedOrders = await db
      .insert(orders)
      .values([
        {
          orderNumber: 'INV-RG-20261001',
          userId: uNadia.id,
          customerName: uNadia.name,
          customerEmail: uNadia.email,
          customerPhone: uNadia.phone,
          shippingAddress: uNadia.address,
          totalAmount: 67400000,
          paymentMethod: 'Bank Transfer BCA Prioritas',
          paymentStatus: 'approved',
          orderStatus: 'completed',
          paymentProofData: SAMPLE_RECEIPT_SVG,
          paymentBankSender: 'BCA Prioritas',
          paymentAccountName: 'Nadia Soerjadjaja',
          adminNotes: 'Dana telah diterima penuh di rekening BCA Prioritas PT Rupa Gems Indonesia. Pengiriman via kurir berasuransi Brinks.',
          approvedAt: d1,
          createdAt: d1,
        },
        {
          orderNumber: 'INV-RG-20261002',
          userId: uHendrawan.id,
          customerName: uHendrawan.name,
          customerEmail: uHendrawan.email,
          customerPhone: uHendrawan.phone,
          shippingAddress: uHendrawan.address,
          totalAmount: 42000000,
          paymentMethod: 'Bank Transfer Mandiri',
          paymentStatus: 'approved',
          orderStatus: 'shipped',
          paymentProofData: SAMPLE_RECEIPT_SVG,
          paymentBankSender: 'Bank Mandiri Wealth',
          paymentAccountName: 'Hendrawan Wijaya',
          adminNotes: 'Bukti transfer valid. Sertifikat GRS asli disertakan dalam brankas segel.',
          approvedAt: d2,
          createdAt: d2,
        },
        {
          orderNumber: 'INV-RG-20261003',
          userId: uClarissa.id,
          customerName: uClarissa.name,
          customerEmail: uClarissa.email,
          customerPhone: uClarissa.phone,
          shippingAddress: uClarissa.address,
          totalAmount: 36000000,
          paymentMethod: 'Bank Transfer BCA',
          paymentStatus: 'waiting_verification',
          orderStatus: 'processing',
          paymentProofData: SAMPLE_RECEIPT_SVG,
          paymentBankSender: 'BCA Digital / myBCA',
          paymentAccountName: 'Clarissa Halim',
          adminNotes: 'Menunggu verifikasi mutasi oleh bagian keuangan Rupa Gems.',
          createdAt: d3,
        },
        {
          orderNumber: 'INV-RG-20261004',
          userId: uBaskoro.id,
          customerName: uBaskoro.name,
          customerEmail: uBaskoro.email,
          customerPhone: uBaskoro.phone,
          shippingAddress: uBaskoro.address,
          totalAmount: 34300000,
          paymentMethod: 'Bank Transfer BNI Emerald',
          paymentStatus: 'waiting_verification',
          orderStatus: 'processing',
          paymentProofData: SAMPLE_RECEIPT_SVG,
          paymentBankSender: 'BNI Emerald',
          paymentAccountName: 'R.M. Baskoro Hadiningrat',
          adminNotes: 'Bukti pembayaran baru diunggah oleh pelanggan, siap direview.',
          createdAt: d4,
        },
      ])
      .returning();

    await db.insert(orderItems).values([
      {
        orderId: insertedOrders[0].id,
        productId: insertedProducts[0].id,
        productName: insertedProducts[0].name,
        productSku: insertedProducts[0].sku,
        categoryName: 'Permata Mulia Lepas',
        price: 28500000,
        quantity: 1,
        subtotal: 28500000,
      },
      {
        orderId: insertedOrders[0].id,
        productId: insertedProducts[4].id,
        productName: insertedProducts[4].name,
        productSku: insertedProducts[4].sku,
        categoryName: 'Cincin & Perhiasan Fine',
        price: 38900000,
        quantity: 1,
        subtotal: 38900000,
      },
      {
        orderId: insertedOrders[1].id,
        productId: insertedProducts[1].id,
        productName: insertedProducts[1].name,
        productSku: insertedProducts[1].sku,
        categoryName: 'Permata Mulia Lepas',
        price: 42000000,
        quantity: 1,
        subtotal: 42000000,
      },
      {
        orderId: insertedOrders[2].id,
        productId: insertedProducts[8].id,
        productName: insertedProducts[8].name,
        productSku: insertedProducts[8].sku,
        categoryName: 'Liontin & Warisan Nusantara',
        price: 36000000,
        quantity: 1,
        subtotal: 36000000,
      },
      {
        orderId: insertedOrders[3].id,
        productId: insertedProducts[9].id,
        productName: insertedProducts[9].name,
        productSku: insertedProducts[9].sku,
        categoryName: 'Liontin & Warisan Nusantara',
        price: 14500000,
        quantity: 1,
        subtotal: 14500000,
      },
      {
        orderId: insertedOrders[3].id,
        productId: insertedProducts[10].id,
        productName: insertedProducts[10].name,
        productSku: insertedProducts[10].sku,
        categoryName: 'Liontin & Warisan Nusantara',
        price: 19800000,
        quantity: 1,
        subtotal: 19800000,
      },
    ]);

    console.log('Rupa Gems initial PostgreSQL data seeded successfully.');
  } catch (error) {
    console.error('Database query failed in ensureSeededData:', error);
    throw new Error('Gagal melakukan inisialisasi data katalog Rupa Gems.', { cause: error });
  }
}

export async function getCatalogData(searchQuery?: string, categorySlug?: string) {
  try {
    await ensureSeededData();

    const allCategories = await db.select().from(categories).orderBy(asc(categories.id));
    const allProducts = await db
      .select({
        id: products.id,
        categoryId: products.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        sku: products.sku,
        name: products.name,
        slug: products.slug,
        description: products.description,
        price: products.price,
        stock: products.stock,
        caratWeight: products.caratWeight,
        origin: products.origin,
        clarity: products.clarity,
        certification: products.certification,
        imageUrl: products.imageUrl,
        isFeatured: products.isFeatured,
        createdAt: products.createdAt,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(asc(products.id));

    let filtered = allProducts;

    if (categorySlug && categorySlug !== 'all') {
      filtered = filtered.filter((p) => p.categorySlug === categorySlug);
    }

    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.origin.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q) ||
          p.certification.toLowerCase().includes(q)
      );
    }

    return {
      categories: allCategories,
      products: filtered,
      totalCatalogCount: allProducts.length,
    };
  } catch (error) {
    console.error('Database query failed in getCatalogData:', error);
    throw new Error('Gagal memuat katalog produk dari database.', { cause: error });
  }
}

export async function createProductRecord(payload: {
  categoryId: number;
  sku: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  caratWeight: string;
  origin: string;
  clarity: string;
  certification: string;
  imageUrl: string;
}) {
  try {
    const slug =
      payload.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      Date.now().toString().slice(-4);

    const inserted = await db
      .insert(products)
      .values({
        ...payload,
        slug,
        isFeatured: 0,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createProductRecord:', error);
    throw new Error('Gagal menambahkan produk baru ke database.', { cause: error });
  }
}

export async function updateProductRecord(
  productId: number,
  payload: Partial<{
    categoryId: number;
    name: string;
    description: string;
    price: number;
    stock: number;
    caratWeight: string;
    origin: string;
    clarity: string;
    certification: string;
    imageUrl: string;
  }>
) {
  try {
    const updated = await db
      .update(products)
      .set(payload)
      .where(eq(products.id, productId))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Database query failed in updateProductRecord:', error);
    throw new Error('Gagal memperbarui data produk dan stok.', { cause: error });
  }
}

export async function deleteProductRecord(productId: number) {
  try {
    await db.delete(orderItems).where(eq(orderItems.productId, productId));
    const deleted = await db.delete(products).where(eq(products.id, productId)).returning();
    return deleted[0];
  } catch (error) {
    console.error('Database query failed in deleteProductRecord:', error);
    throw new Error('Gagal menghapus produk dari database.', { cause: error });
  }
}

export async function createOrderWithItems(payload: {
  uid: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  paymentMethod: string;
  paymentBankSender: string;
  paymentAccountName: string;
  paymentProofData?: string;
  items: Array<{
    productId: number;
    quantity: number;
  }>;
}) {
  try {
    const userRecord = await getOrCreateUser(
      payload.uid,
      payload.customerEmail,
      payload.customerName,
      payload.customerPhone,
      payload.shippingAddress
    );

    const allCats = await db.select().from(categories);
    const catMap = new Map(allCats.map((c) => [c.id, c.name]));

    let totalAmount = 0;
    const preparedItems: Array<{
      productId: number;
      productName: string;
      productSku: string;
      categoryName: string;
      price: number;
      quantity: number;
      subtotal: number;
      currentStock: number;
    }> = [];

    for (const item of payload.items) {
      const prodRows = await db.select().from(products).where(eq(products.id, item.productId));
      const prod = prodRows[0];
      if (!prod) {
        throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan.`);
      }
      if (prod.stock < item.quantity) {
        throw new Error(`Stok untuk ${prod.name} tidak mencukupi (Tersisa: ${prod.stock}).`);
      }
      const subtotal = prod.price * item.quantity;
      totalAmount += subtotal;
      preparedItems.push({
        productId: prod.id,
        productName: prod.name,
        productSku: prod.sku,
        categoryName: catMap.get(prod.categoryId) || 'Permata Rupa Gems',
        price: prod.price,
        quantity: item.quantity,
        subtotal,
        currentStock: prod.stock,
      });
    }

    const orderNumber = `INV-RG-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const insertedOrderRows = await db
      .insert(orders)
      .values({
        orderNumber,
        userId: userRecord.id,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        customerPhone: payload.customerPhone,
        shippingAddress: payload.shippingAddress,
        totalAmount,
        paymentMethod: payload.paymentMethod,
        paymentStatus: payload.paymentProofData ? 'waiting_verification' : 'pending_upload',
        orderStatus: 'processing',
        paymentProofData: payload.paymentProofData || SAMPLE_RECEIPT_SVG,
        paymentBankSender: payload.paymentBankSender,
        paymentAccountName: payload.paymentAccountName,
        adminNotes: 'Pesanan baru diterima. Menunggu verifikasi bukti pembayaran oleh Admin.',
      })
      .returning();

    const createdOrder = insertedOrderRows[0];

    for (const pItem of preparedItems) {
      await db.insert(orderItems).values({
        orderId: createdOrder.id,
        productId: pItem.productId,
        productName: pItem.productName,
        productSku: pItem.productSku,
        categoryName: pItem.categoryName,
        price: pItem.price,
        quantity: pItem.quantity,
        subtotal: pItem.subtotal,
      });

      // Decrement product stock in real database
      await db
        .update(products)
        .set({ stock: Math.max(0, pItem.currentStock - pItem.quantity) })
        .where(eq(products.id, pItem.productId));
    }

    return createdOrder;
  } catch (error: any) {
    console.error('Database query failed in createOrderWithItems:', error);
    throw new Error(error.message || 'Gagal memproses pesanan di database.', { cause: error });
  }
}

export async function uploadOrderPaymentProof(
  orderId: number,
  payload: {
    paymentProofData: string;
    paymentBankSender: string;
    paymentAccountName: string;
  }
) {
  try {
    const updated = await db
      .update(orders)
      .set({
        paymentProofData: payload.paymentProofData,
        paymentBankSender: payload.paymentBankSender,
        paymentAccountName: payload.paymentAccountName,
        paymentStatus: 'waiting_verification',
      })
      .where(eq(orders.id, orderId))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Database query failed in uploadOrderPaymentProof:', error);
    throw new Error('Gagal mengunggah bukti pembayaran.', { cause: error });
  }
}

export async function reviewOrderPayment(
  orderId: number,
  payload: {
    paymentStatus: 'approved' | 'rejected' | 'waiting_verification';
    orderStatus: 'processing' | 'shipped' | 'completed' | 'cancelled';
    adminNotes: string;
  }
) {
  try {
    const updated = await db
      .update(orders)
      .set({
        paymentStatus: payload.paymentStatus,
        orderStatus: payload.orderStatus,
        adminNotes: payload.adminNotes,
        approvedAt: payload.paymentStatus === 'approved' ? new Date() : null,
      })
      .where(eq(orders.id, orderId))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Database query failed in reviewOrderPayment:', error);
    throw new Error('Gagal memperbarui status persetujuan pembayaran.', { cause: error });
  }
}

export async function getAllOrdersWithItems(userEmailFilter?: string) {
  try {
    await ensureSeededData();
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    const allItems = await db.select().from(orderItems);

    const itemsByOrder = new Map<number, typeof allItems>();
    for (const item of allItems) {
      const list = itemsByOrder.get(item.orderId) || [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    let enriched = allOrders.map((ord) => ({
      ...ord,
      items: itemsByOrder.get(ord.id) || [],
    }));

    if (userEmailFilter) {
      enriched = enriched.filter(
        (o) => o.customerEmail.toLowerCase() === userEmailFilter.toLowerCase()
      );
    }

    return enriched;
  } catch (error) {
    console.error('Database query failed in getAllOrdersWithItems:', error);
    throw new Error('Gagal mengambil riwayat pesanan dari database.', { cause: error });
  }
}

export async function getAllCustomersWithStats() {
  try {
    await ensureSeededData();
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    const allOrders = await db.select().from(orders);

    return allUsers.map((u) => {
      const userOrders = allOrders.filter(
        (o) => o.userId === u.id || o.customerEmail.toLowerCase() === u.email.toLowerCase()
      );
      const totalSpent = userOrders
        .filter((o) => o.paymentStatus === 'approved')
        .reduce((acc, o) => acc + o.totalAmount, 0);
      return {
        ...u,
        orderCount: userOrders.length,
        totalSpent,
        lastOrderDate: userOrders.length > 0 ? userOrders[0].createdAt : u.createdAt,
      };
    });
  } catch (error) {
    console.error('Database query failed in getAllCustomersWithStats:', error);
    throw new Error('Gagal memuat data pelanggan dari database.', { cause: error });
  }
}

export async function upsertCustomerFromAdmin(payload: {
  id?: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  role?: string;
}) {
  try {
    if (payload.id) {
      const updated = await db
        .update(users)
        .set({
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          address: payload.address,
          ...(payload.role ? { role: payload.role } : {}),
        })
        .where(eq(users.id, payload.id))
        .returning();
      return updated[0];
    } else {
      const uid = `cust-manual-${Date.now()}`;
      const inserted = await db
        .insert(users)
        .values({
          uid,
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          address: payload.address,
          role: payload.role || 'customer',
        })
        .returning();
      return inserted[0];
    }
  } catch (error) {
    console.error('Database query failed in upsertCustomerFromAdmin:', error);
    throw new Error('Gagal menyimpan data pelanggan.', { cause: error });
  }
}
