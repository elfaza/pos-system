# 🚀 Milestone 6: Polish (1-2 Weeks)

## 🎯 Focus

Polish the café POS so the core MVP feels production-ready across touchscreen operation, responsive layouts, performance, deployment readiness, and release validation.

---

## 🧭 Scope Rules

- MVP remains single-store only.
- MVP remains online-only.
- Roles remain limited to `admin` and `cashier`.
- This milestone improves existing workflows; it does not introduce new business modules.
- Touchscreen improvements must prioritize cashier speed, accuracy, and reduced accidental taps.
- Responsive improvements must preserve all existing role and permission boundaries.
- Performance work must preserve calculation correctness and persisted transaction history.
- Deployment work must make the existing application easier to run safely in production-like environments.
- Testing work must validate critical end-to-end business flows before release.
- Major redesign, native mobile apps, offline sync, multi-store support, and new payment providers are out of scope.

---

## 🧱 WBS 6.0: Polish

---

### 6.1 👆 Touchscreen UI

- **6.1.1 POS Touch Targets**
  - Product tiles, cart controls, quantity buttons, discount controls, payment actions, and kitchen status actions meet practical touch target sizing.
  - Primary cashier actions are easy to tap without precision pointing.
  - Destructive actions remain visually distinct and require confirmation where accidental activation would cause operational harm.
  - Touch controls must not shift layout after tap, loading, or validation state changes.

- **6.1.2 Cashier Workflow Speed**
  - Cashier can add products, adjust quantities, hold orders, restore held orders, cancel eligible orders, and complete cash checkout with minimal navigation.
  - Repeated high-frequency actions avoid unnecessary modals.
  - Payment success and queue number states are readable at register distance.
  - Receipt preview remains accessible without interrupting the next order flow.

- **6.1.3 Kitchen And Queue Touch Use**
  - Kitchen status actions are large enough for touchscreen use.
  - Kitchen cards remain scannable with long item names, notes, and queue numbers.
  - Queue display remains readable from customer-facing distance.
  - Ready and completed states are visually clear without relying on color alone.

---

### 6.2 📱 Responsive Design

- **6.2.1 Supported Viewports**
  - Admin, cashier POS, kitchen display, queue display, order history, receipts, catalog management, settings, and dashboard pages work on common desktop, tablet, and narrow mobile widths.
  - Layouts must not horizontally overflow except where a data table intentionally provides controlled scrolling.
  - Navigation must remain accessible for both admin and cashier roles.
  - Dialogs, drawers, and popovers fit within the viewport and remain dismissible.

- **6.2.2 Content Resilience**
  - Long product names, category names, variant names, user names, order numbers, queue numbers, and notes wrap or truncate intentionally.
  - Money, dates, statuses, and action buttons do not overlap on narrow screens.
  - Tables and report surfaces provide usable mobile alternatives or controlled horizontal scrolling.
  - Empty, loading, error, disabled, and offline states maintain the same responsive quality as populated states.

- **6.2.3 Visual Consistency**
  - Shared spacing, typography, button hierarchy, status colors, and form patterns follow `docs/design-guidelines.md`.
  - Touchscreen and responsive adjustments must use existing component patterns where possible.
  - Visual polish must not obscure operational information such as stock status, payment status, or kitchen status.

---

### 6.3 ⚡ Performance

- **6.3.1 Page Load And Interaction**
  - Initial app load, login, POS product browsing, cart updates, checkout, order history, kitchen display, queue display, and dashboard loading should feel responsive on typical shop hardware.
  - Expensive client components are split or memoized where there is measurable rendering cost.
  - Lists and tables avoid unnecessary rerenders during filtering, search, status updates, and cart changes.
  - Loading states appear quickly and avoid misleading blank screens.

- **6.3.2 API And Database Efficiency**
  - Critical API routes avoid unbounded queries.
  - Report, order history, product, stock, and kitchen endpoints use pagination, limits, filtering, or date ranges where data can grow.
  - Database queries include only fields required by the response.
  - Prisma access patterns avoid avoidable N+1 query behavior in high-use workflows.

- **6.3.3 Asset And Build Health**
  - Static assets are sized appropriately for their display use.
  - Unused code and dependencies are reviewed where they affect bundle size or build reliability.
  - Production build completes without type, lint, or framework warnings that indicate user-facing risk.

---

### 6.4 🚢 Deployment Readiness

- **6.4.1 Environment Configuration**
  - Required environment variables are documented clearly.
  - Missing or invalid critical environment variables fail fast with actionable errors.
  - Production setup keeps secrets out of source control.
  - Local development setup remains unchanged unless a production requirement needs documentation.

- **6.4.2 Database And Migration Readiness**
  - Prisma generation and migrations are documented for production deployment.
  - Seed data remains safe for local/demo use and is not required for production correctness.
  - Migration history is clean enough for a fresh deployment.
  - Database connection assumptions are documented, including PostgreSQL requirement.

- **6.4.3 Runtime Operations**
  - `npm run build` and `npm run start` are valid production commands.
  - Health, startup, or operational checks are documented where available.
  - Deployment notes cover Docker Compose local dependencies and production database expectations.
  - Known production limitations are documented, including online-only and single-store constraints.

---

### 6.5 🧪 Testing And QA

- **6.5.1 Critical Flow Tests**
  - Login and logout work for admin and cashier.
  - Admin can manage users, categories, products, variants, settings, inventory, dashboard, and reports according to completed milestones.
  - Cashier can create cart orders, apply supported discounts, hold and restore orders, complete cash checkout, view receipt, and see queue number.
  - Paid orders deduct tracked stock according to inventory rules.
  - Kitchen and queue workflows move through valid statuses.

- **6.5.2 Regression Tests**
  - Cashier cannot access admin-only surfaces.
  - Invalid checkout, payment, inventory, kitchen, and report requests return safe validation errors.
  - Order totals, tax, service charge, discounts, refunds, and stock movements continue to use persisted values and existing money helpers.
  - Long names, empty data, offline state, loading state, and error state do not break layouts.

- **6.5.3 Release Validation Commands**
  - `npm run prisma:generate`
  - `npm test`
  - `npm run lint`
  - `npm run build`
  - Manual QA checklist for touchscreen and responsive workflows.

---

### 6.6 📚 Documentation

- **6.6.1 User-Facing Setup Documentation**
  - README setup instructions match the current application.
  - Demo account credentials remain accurate.
  - Development and production command documentation is accurate.
  - Known MVP limitations are visible.

- **6.6.2 Engineering Documentation**
  - Milestone completion records are updated where relevant.
  - Deployment notes explain environment variables, migration flow, and production startup.
  - QA checklist documents the exact release validation scenarios.
  - Any non-obvious operational constraints are documented near the feature they affect.

---

### 6.7 🔐 Roles & Permissions

| Workflow | Admin | Cashier | Notes |
| --- | --- | --- | --- |
| Use polished POS touchscreen workflow | Yes | Yes | Cashier-focused, admin may also operate POS |
| Use responsive admin pages | Yes | No | Admin-only surfaces remain protected |
| Use responsive kitchen and queue pages | Yes | Yes | Existing Milestone 4 permissions apply |
| View owner dashboard and reports | Yes | No | Existing Milestone 5 permissions apply |
| Run deployment commands | Operator | Operator | Outside app role model |
| Change production environment variables | Operator | Operator | Outside app role model |

Rules:
- UI polish must not expose links, data, or actions to roles that were previously blocked.
- Server-side authorization remains the source of truth for protected operations.
- Deployment documentation must not include real secrets.

---

### 6.8 🧮 Business And Calculation Rules

- Existing checkout, inventory, refund, queue, kitchen, and reporting calculations must not change unless a bug is identified and covered by tests.
- Money values must continue using existing decimal-safe helpers.
- Performance optimizations must not replace persisted server-side totals with client-only approximations.
- Report and dashboard summaries must continue using server-side persisted data.
- UI formatting changes must preserve exact submitted and stored values.

---

### 6.9 🌐 Offline & Connectivity Rules

- MVP remains online-only.
- Existing offline indicators and disabled mutation behavior must be consistent across polished screens.
- Offline UI must not suggest that checkout, kitchen updates, inventory changes, or reporting refreshes were completed.
- Previously loaded data may remain visible while offline if clearly treated as stale.
- Reconnection should allow users to retry failed refreshes or mutations without reloading the whole app when practical.

---

### 6.10 🚫 Explicitly Out of Scope for Milestone 6

- Native iOS or Android application
- Offline order creation or offline sync
- Multi-store support
- Table management
- Customer accounts or loyalty
- New QRIS provider integration
- Split payments
- Advanced analytics beyond completed dashboard scope
- Accounting-grade financial statements
- Hardware integrations such as cash drawer, barcode scanner, receipt printer, or customer display
- Full redesign or brand refresh
- Internationalization
- Accessibility certification audit
- Load testing beyond practical MVP validation

---

## ✅ Milestone Output

After completing this milestone, the system will allow:

- Cashier to operate the POS comfortably on a touchscreen.
- Admin and cashier workflows to remain usable across desktop, tablet, and narrow mobile layouts.
- Core pages and API routes to perform reliably with realistic MVP data sizes.
- The app to be built, configured, migrated, and started in a production-like environment.
- QA to validate the release through documented automated and manual checks.

Goal: production-ready feel.

---

## ✅ Acceptance Criteria

- [ ] POS product grid, cart, checkout, held orders, receipts, kitchen, and queue workflows are touchscreen-friendly.
- [ ] Admin, cashier, kitchen, queue, order history, dashboard, and catalog pages are responsive at supported viewport sizes.
- [ ] Long content does not overlap controls or break critical layouts.
- [ ] Critical API routes avoid unbounded query patterns where data can grow.
- [ ] Production build passes without release-blocking errors.
- [ ] Deployment documentation covers required environment variables, migrations, build, and startup.
- [ ] README reflects current setup, demo accounts, scripts, and known MVP limitations.
- [ ] Admin-only and cashier-only permissions remain enforced in UI and API.
- [ ] Critical checkout, inventory, queue, kitchen, dashboard, and authorization tests pass.
- [ ] Manual QA validates touchscreen, responsive, performance, deployment, and release smoke scenarios.
- [ ] Documentation compliance checked against `docs/pos-system-spec.md`.
- [ ] Documentation compliance checked against this milestone file.
- [ ] UI compliance checked against `docs/design-guidelines.md`.
- [ ] Relevant tests and validation commands pass.
- [ ] QA verifies the integrated result.

---

## 📝 Implementation Notes

- Suggested sequence:
  - Audit existing screens at desktop, tablet, and narrow mobile widths.
  - Fix touchscreen and responsive issues in the highest-frequency workflows first.
  - Profile or inspect slow pages and API routes before optimizing.
  - Harden deployment documentation and environment validation.
  - Expand automated regression coverage for release-critical flows.
  - Run full release validation and record the result.
- Keep polish changes incremental and targeted.
- Prefer existing component patterns over introducing a new design system during the final polish milestone.
- Treat this milestone as release hardening; avoid scope expansion unless it fixes a production-readiness risk.

---

## 📌 Completion Record

- Completed date:
- Final validation commands:
- Known follow-ups:
- Release notes:
