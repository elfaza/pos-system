# POS System — Product Specification

## 🧩 Overview
This project is a modular Point of Sale (POS) system designed to support multiple business types (starting with a café).

It covers:
- transaction processing
- inventory management
- payment integration (QRIS)
- queue & kitchen workflow
- reporting & analytics

The system is built with a **monolith architecture** for simplicity and scalability in early stages.

---

## 🏗️ Architecture

### Monolith (Recommended)
The system is built as a **single Next.js application** that includes:
- Frontend (UI)
- Backend (API routes)
- Business logic (services)
- Database access

### Structure
Frontend (Next.js UI)
        ↓
API Routes (Next.js)
        ↓
Services (Business Logic)
        ↓
Repositories (Data Access)
        ↓
Database (PostgreSQL)

### Why Monolith
- Faster development
- Easier deployment
- Simpler maintenance
- Suitable for small-to-medium scale systems
- Can be split into microservices later if needed

### MVP Scope
- MVP is built for a single store only
- The data model should avoid assumptions that block future multi-branch support
- Multi-branch features are not implemented in MVP
- Offline mode is not implemented in MVP
- The POS requires an active internet connection to create, hold, pay, refund, or complete orders
- If connection is lost, checkout actions are blocked and the UI shows a reconnect state

---

## ⚙️ Tech Stack

### Frontend
- Next.js
- TypeScript
- Tailwind CSS

### State Management
- Zustand
- TanStack Query (React Query)

### Backend
- Next.js Route Handlers (API)

### Database
- PostgreSQL
- Prisma ORM

### Realtime
- Socket.IO (for queue & kitchen updates)

### Payment
- Midtrans (QRIS support)

### Deployment
- Vercel (frontend + API)
- Supabase / Neon (database)

---

## 🔐 Authentication & User Management
- Login / Logout
- Role-based access (Admin, Cashier)
- Session management
- Activity log

### Roles & Permissions

#### Admin
- Access all modules
- Manage products, categories, variants, pricing, and images
- Manage inventory, stock adjustments, waste tracking, and low stock settings
- View dashboard and reports
- Manage tax, service charge, printer, payment, and store settings
- Manage users and roles
- Approve and process refunds
- View activity logs

#### Cashier
- Access cashier POS page
- Create cart and checkout orders
- Hold and resume orders
- Add item notes
- Apply allowed discounts
- Accept cash and QRIS payments
- Print and reprint receipts
- View basic order/payment history needed for cashier operations
- Cannot delete products, adjust inventory, change settings, manage users, or process refunds without admin permission

---

## 📦 Product Management
- Add / Edit / Delete product
- Categories
- Product variants
- Price & cost
- Product image
- Search product
- Stock availability toggle

---

## 🧾 POS Checkout
- Product grid display
- Add to cart
- Update quantity
- Item notes
- Discounts
- Tax / service charge
- Hold order
- Resume order
- Order summary

### Checkout Rules
- One order uses one payment method only in MVP
- Split payment is excluded from MVP
- Tax and service charge are added at checkout based on settings
- Product catalog prices are stored before tax and service charge by default
- Hold order does not deduct stock
- Paid order deducts stock

---

## 💳 Payment System
- Cash payment
- QRIS payment
- Change calculation
- Refund transaction
- Payment history

### Payment Rules
- Cash and QRIS are supported in MVP
- Split payment is not supported in MVP
- QRIS payment status is confirmed by Midtrans webhook/callback
- Server-side payment status is the source of truth
- Browser/client success response is not enough to mark an order as paid
- If the client disconnects during QRIS payment, the cashier UI must refresh from server state after reconnect
- QRIS payment cannot be started or completed while offline

### Refund Rules
- MVP supports full refund only
- Partial refund is excluded from MVP
- Refund requires admin permission
- Refund reason is required
- Cash payment refund is handled as cash
- QRIS refund is recorded in the system and processed according to Midtrans capability/configuration
- Stock restoration after refund requires admin confirmation
- Refund policy settings should support refund window and stock restoration behavior

---

## 🖨️ Receipt Printing
- Auto print receipt
- Manual reprint
- Kitchen ticket printing
- Receipt numbering

---

## 🔢 Queue Management (Café Module)
- Auto queue number
- Queue display
- Next queue
- Order status (Waiting, Preparing, Ready, Completed)

---

## 🍳 Kitchen Display System (Café Module)
- Real-time order display
- Order notes
- Preparing status
- Ready status
- Sound notification

---

## 📊 Inventory Management
- Ingredient stock
- Auto stock deduction
- Low stock alert
- Stock adjustment
- Waste tracking
- Stock history

### Inventory Rules
- Stock is deducted only after payment is successfully confirmed
- Held orders do not reserve or deduct stock in MVP
- Cancelled unpaid orders do not affect stock
- Refunded paid orders may restore stock only after admin confirmation
- Inventory movements must be recorded in stock history
- Negative stock behavior should be configurable, but default MVP behavior should block checkout if stock is insufficient

---

## 📈 Sales Dashboard
- Daily sales
- Weekly sales
- Monthly sales
- Best-selling items
- Revenue summary
- Payment summary

---

## 🍽️ Table Management
- Table status
- Move table
- Split bill
- Merge bill

---

## 👤 Customer Management
- Customer profile
- Order history
- Loyalty points
- Membership

---

## 🎁 Promotions
- Discount %
- Fixed discount
- Promo code
- Happy hour pricing

---

## 📑 Reports
- Sales report
- Inventory report
- Staff performance
- Refund report

---

## ⚙️ Settings
- Store profile
- Printer setup
- Tax settings
- Payment settings

### Tax & Service Charge Settings
- Tax can be enabled or disabled
- Tax percentage is configurable
- Service charge can be enabled or disabled
- Service charge percentage is configurable
- Default MVP pricing mode is tax-exclusive and service-exclusive

---

## 🔁 Status Definitions

### Order Status
- `draft`: cart/order is being created and is not finalized
- `held`: order is saved for later and stock is not deducted
- `pending_payment`: order is waiting for payment confirmation
- `paid`: payment is confirmed and stock has been deducted
- `cancelled`: unpaid order is cancelled
- `refunded`: paid order has been fully refunded

### Payment Status
- `pending`: payment has been created but not confirmed
- `paid`: payment is successfully confirmed
- `failed`: payment attempt failed
- `expired`: payment was not completed before expiry
- `refunded`: payment has been fully refunded

### Kitchen Status
- `waiting`: order is waiting for kitchen preparation
- `preparing`: kitchen is preparing the order
- `ready`: order is ready for pickup/serving
- `completed`: order has been served or closed

### Queue Status
- `waiting`: customer is waiting in queue
- `preparing`: order is being prepared
- `ready`: order is ready
- `completed`: queue item is finished

---

## ✅ MVP Priority
- Product management
- POS checkout
- Payment (Cash + QRIS)
- Inventory (basic)
- Queue system
- Receipt printing

---

## 🚀 Future Enhancements
- PWA mobile app
- Multi-branch support
- Offline mode
- Advanced analytics
- Barcode scanner integration
- Split payment
- Partial refund
