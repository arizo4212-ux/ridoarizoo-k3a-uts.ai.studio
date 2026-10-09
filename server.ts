import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  getCatalogData,
  getOrCreateUser,
  createProductRecord,
  updateProductRecord,
  deleteProductRecord,
  createOrderWithItems,
  uploadOrderPaymentProof,
  reviewOrderPayment,
  getAllOrdersWithItems,
  getAllCustomersWithStats,
  upsertCustomerFromAdmin,
} from './src/db/repository.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for Base64 payment receipt uploads
  app.use(express.json({ limit: '10mb' }));

  // 1. Public Catalog API (12 Products, 3 Categories, Search & Filter)
  app.get('/api/catalog', async (req, res) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const data = await getCatalogData(search, category);
      res.json(data);
    } catch (error: any) {
      console.error('Failed to fetch catalog:', error);
      res.status(500).json({ error: error.message || 'Gagal memuat katalog produk' });
    }
  });

  // 2. Public Order Tracking / Lookup by Order Number or Customer Email
  app.get('/api/orders/lookup', async (req, res) => {
    try {
      const email = typeof req.query.email === 'string' ? req.query.email : undefined;
      const orderNumber = typeof req.query.orderNumber === 'string' ? req.query.orderNumber : undefined;
      const allOrders = await getAllOrdersWithItems(email);
      const filtered = orderNumber
        ? allOrders.filter((o) => o.orderNumber.toLowerCase().includes(orderNumber.toLowerCase()))
        : allOrders;
      res.json({ orders: filtered });
    } catch (error: any) {
      console.error('Failed to lookup orders:', error);
      res.status(500).json({ error: error.message || 'Gagal mencari pesanan' });
    }
  });

  // 3. Customer Checkout (Supports both authenticated Google user & guest checkout synced to DB)
  app.post('/api/orders', async (req, res) => {
    try {
      const {
        uid,
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress,
        paymentMethod,
        paymentBankSender,
        paymentAccountName,
        paymentProofData,
        items,
      } = req.body;

      if (!customerName || !customerEmail || !customerPhone || !shippingAddress || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Mohon lengkapi seluruh data pengiriman dan keranjang belanja.' });
      }

      const effectiveUid = uid || `cust-${customerEmail.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      const order = await createOrderWithItems({
        uid: effectiveUid,
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress,
        paymentMethod: paymentMethod || 'Bank Transfer BCA Prioritas',
        paymentBankSender: paymentBankSender || 'BCA',
        paymentAccountName: paymentAccountName || customerName,
        paymentProofData,
        items,
      });

      res.status(201).json({ order });
    } catch (error: any) {
      console.error('Checkout error:', error);
      res.status(400).json({ error: error.message || 'Gagal membuat pesanan' });
    }
  });

  // 4. Customer Upload Payment Proof for Existing Order
  app.post('/api/orders/:id/payment-proof', async (req, res) => {
    try {
      const orderId = Number(req.params.id);
      const { paymentProofData, paymentBankSender, paymentAccountName } = req.body;
      if (!paymentProofData) {
        return res.status(400).json({ error: 'Bukti pembayaran wajib dilampirkan.' });
      }
      const updated = await uploadOrderPaymentProof(orderId, {
        paymentProofData,
        paymentBankSender: paymentBankSender || 'Bank Transfer',
        paymentAccountName: paymentAccountName || 'Pelanggan',
      });
      res.json({ order: updated });
    } catch (error: any) {
      console.error('Upload payment proof error:', error);
      res.status(500).json({ error: error.message || 'Gagal mengunggah bukti pembayaran' });
    }
  });

  // 5. Admin Credentials Login Verification Endpoint
  app.post('/api/auth/admin-login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (
        email?.trim().toLowerCase() === 'admin@rupagems.id' &&
        password === 'RupaGems2026!'
      ) {
        const adminUser = await getOrCreateUser(
          'admin-rupa-gems',
          'admin@rupagems.id',
          'Kurator Utama Rupa Gems',
          '+62 811-9000-881',
          'Plaza Indonesia Lantai 2, Jakarta Pusat'
        );
        return res.json({
          token: 'rupa-gems-admin-verified-token-2026',
          user: adminUser,
        });
      }
      return res.status(401).json({
        error: 'Kredensial Admin tidak valid. Gunakan email admin@rupagems.id dan kata sandi RupaGems2026!',
      });
    } catch (error: any) {
      console.error('Admin login error:', error);
      res.status(500).json({ error: error.message || 'Gagal memproses login admin' });
    }
  });

  // 6. Sync Firebase Authenticated User to PostgreSQL
  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { phone, address } = req.body || {};
      const dbUser = await getOrCreateUser(
        req.user.uid,
        req.user.email || 'user@rupagems.id',
        req.user.name,
        phone,
        address
      );
      res.json({ user: dbUser });
    } catch (error: any) {
      console.error('Failed to sync user:', error);
      res.status(500).json({ error: error.message || 'Gagal menyinkronkan akun pengguna' });
    }
  });

  // 7. Admin Protected Endpoints (Requires Firebase Auth or Verified Admin Session)
  app.get('/api/admin/overview', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const [catalog, orders, customers] = await Promise.all([
        getCatalogData(),
        getAllOrdersWithItems(),
        getAllCustomersWithStats(),
      ]);

      res.json({
        categories: catalog.categories,
        products: catalog.products,
        orders,
        customers,
      });
    } catch (error: any) {
      console.error('Failed to load admin overview:', error);
      res.status(500).json({ error: error.message || 'Gagal memuat data dashboard admin' });
    }
  });

  app.post('/api/admin/products', requireAuth, async (req: AuthRequest, res) => {
    try {
      const created = await createProductRecord({
        categoryId: Number(req.body.categoryId),
        sku: String(req.body.sku || `RG-NEW-${Date.now().toString().slice(-4)}`),
        name: String(req.body.name),
        description: String(req.body.description || '-'),
        price: Number(req.body.price),
        stock: Number(req.body.stock),
        caratWeight: String(req.body.caratWeight || '1.00 ct'),
        origin: String(req.body.origin || 'Nusantara'),
        clarity: String(req.body.clarity || 'VVS1'),
        certification: String(req.body.certification || 'GRI Lab Certified'),
        imageUrl: String(req.body.imageUrl || 'gem_sapphire'),
      });
      res.status(201).json({ product: created });
    } catch (error: any) {
      console.error('Create product error:', error);
      res.status(500).json({ error: error.message || 'Gagal menambahkan produk' });
    }
  });

  app.put('/api/admin/products/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const productId = Number(req.params.id);
      const updated = await updateProductRecord(productId, {
        ...(req.body.categoryId !== undefined ? { categoryId: Number(req.body.categoryId) } : {}),
        ...(req.body.name !== undefined ? { name: String(req.body.name) } : {}),
        ...(req.body.description !== undefined ? { description: String(req.body.description) } : {}),
        ...(req.body.price !== undefined ? { price: Number(req.body.price) } : {}),
        ...(req.body.stock !== undefined ? { stock: Number(req.body.stock) } : {}),
        ...(req.body.caratWeight !== undefined ? { caratWeight: String(req.body.caratWeight) } : {}),
        ...(req.body.origin !== undefined ? { origin: String(req.body.origin) } : {}),
        ...(req.body.clarity !== undefined ? { clarity: String(req.body.clarity) } : {}),
        ...(req.body.certification !== undefined ? { certification: String(req.body.certification) } : {}),
        ...(req.body.imageUrl !== undefined ? { imageUrl: String(req.body.imageUrl) } : {}),
      });
      res.json({ product: updated });
    } catch (error: any) {
      console.error('Update product error:', error);
      res.status(500).json({ error: error.message || 'Gagal memperbarui produk' });
    }
  });

  app.delete('/api/admin/products/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const productId = Number(req.params.id);
      const deleted = await deleteProductRecord(productId);
      res.json({ product: deleted });
    } catch (error: any) {
      console.error('Delete product error:', error);
      res.status(500).json({ error: error.message || 'Gagal menghapus produk' });
    }
  });

  app.patch('/api/admin/orders/:id/review', requireAuth, async (req: AuthRequest, res) => {
    try {
      const orderId = Number(req.params.id);
      const { paymentStatus, orderStatus, adminNotes } = req.body;
      const updated = await reviewOrderPayment(orderId, {
        paymentStatus,
        orderStatus,
        adminNotes: adminNotes || '',
      });
      res.json({ order: updated });
    } catch (error: any) {
      console.error('Review order payment error:', error);
      res.status(500).json({ error: error.message || 'Gagal memverifikasi pembayaran' });
    }
  });

  app.post('/api/admin/customers', requireAuth, async (req: AuthRequest, res) => {
    try {
      const customer = await upsertCustomerFromAdmin(req.body);
      res.json({ customer });
    } catch (error: any) {
      console.error('Upsert customer error:', error);
      res.status(500).json({ error: error.message || 'Gagal menyimpan data pelanggan' });
    }
  });

  // Vite middleware for development vs production static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Rupa Gems Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
