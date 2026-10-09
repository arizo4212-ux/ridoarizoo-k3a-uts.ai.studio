import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// 1. Users & Customers Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or Admin identifier
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull().default('-'),
  address: text('address').notNull().default('-'),
  role: text('role').notNull().default('customer'), // 'admin' | 'customer'
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Categories Table (3 Categories)
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Products Table (12 Curated Rupa Gems Products)
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id')
    .references(() => categories.id)
    .notNull(),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  price: integer('price').notNull(), // Price in IDR
  stock: integer('stock').notNull().default(1),
  caratWeight: text('carat_weight').notNull(),
  origin: text('origin').notNull(),
  clarity: text('clarity').notNull(),
  certification: text('certification').notNull(),
  imageUrl: text('image_url').notNull(),
  isFeatured: integer('is_featured').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Orders Table (Includes Payment Proof & Admin Approval Status)
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone').notNull(),
  shippingAddress: text('shipping_address').notNull(),
  totalAmount: integer('total_amount').notNull(),
  paymentMethod: text('payment_method').notNull().default('Bank Transfer BCA'),
  paymentStatus: text('payment_status').notNull().default('waiting_verification'), // 'pending_upload' | 'waiting_verification' | 'approved' | 'rejected'
  orderStatus: text('order_status').notNull().default('processing'), // 'processing' | 'shipped' | 'completed' | 'cancelled'
  paymentProofData: text('payment_proof_data'), // Base64 image or receipt reference
  paymentBankSender: text('payment_bank_sender'),
  paymentAccountName: text('payment_account_name'),
  adminNotes: text('admin_notes'),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. Order Items Table
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id)
    .notNull(),
  productId: integer('product_id')
    .references(() => products.id)
    .notNull(),
  productName: text('product_name').notNull(),
  productSku: text('product_sku').notNull(),
  categoryName: text('category_name').notNull(),
  price: integer('price').notNull(),
  quantity: integer('quantity').notNull(),
  subtotal: integer('subtotal').notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));
