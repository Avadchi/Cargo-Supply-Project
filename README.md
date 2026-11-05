# Kargo — Supply Chain Control Tower

A full supply-chain management interface built with **React 18 + Vite + Tailwind CSS + Supabase**, covering every table in the supplied ER diagram. The app runs immediately with a complete seeded demo workspace and switches to your live Supabase project once credentials are added.

## Quick start

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

To create a production build:

```bash
npm run build
npm run preview
```

## Connect Supabase

1. Open your Supabase project → **Project Settings → API**.
2. Copy the **Project URL** and **anon public** key.
3. Open `.env` in the project root and paste them:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

4. Stop the dev server and run `npm run dev` again (Vite reads env vars at startup). The sidebar badge and the **Database** page will show **Live** once the connection succeeds.

> The service-role key must never be used in this client-side app.

### Table and column requirements

The app expects the following 16 tables, using singular snake_case names and the primary keys shown:

| Table | Primary key |
| --- | --- |
| `supplier` | `supplier_id` |
| `supplier_phone` | `supplier_id`, `phone_no` |
| `category` | `category_id` |
| `product` | `product_id` |
| `warehouse` | `warehouse_id` |
| `employee` | `emp_id` |
| `supplier_product` | `supplier_id`, `product_id` |
| `purchase_order` | `po_id` |
| `po_item` | `po_id`, `line_no` |
| `customer` | `customer_id` |
| `customer_order` | `order_id` |
| `order_item` | `order_id`, `line_no` |
| `payment` | `payment_id` |
| `transporter` | `transporter_id` |
| `shipment` | `shipment_id` |
| `inventory` | `warehouse_id`, `product_id` |

The UI uses readable field names; `src/lib/schema.js` translates them to the columns that exist in Supabase:

| UI field | Supabase column |
| --- | --- |
| `first_name` + `last_name` | `first_name_last_name` |
| `street` + `city` + `state` | `street_city_state` |
| `lead_time` | `lead_time_days` |
| `ship_date` + `delivery_date` | `ship_date` + `delivery_date`, falling back to `ship_date_delivery_date` |
| `pincode` | `pincode`, falling back to a suffix on `street_city_state` |

Primary keys are `GENERATED ALWAYS AS IDENTITY`, so the app never sends explicit IDs. `create()` returns the inserted row, and dependent rows (order items, PO items, supplier phones) use the generated key.

Two schema fixes are recommended for full functionality (also saved as [`supabase/schema-fixes.sql`](supabase/schema-fixes.sql)):

```sql
alter table supplier alter column pincode type varchar(6);
alter table customer alter column pincode type varchar(6);

alter table shipment add column ship_date date;
alter table shipment add column delivery_date date;
update shipment set ship_date = ship_date_delivery_date;
-- optional once the app no longer needs the old column:
-- alter table shipment drop column ship_date_delivery_date;
```

### Row Level Security

Supabase blocks anonymous access by default. For this academic/demo project, either disable RLS on these tables or add an anon policy to each one:

```sql
alter table supplier enable row level security;
create policy "anon all" on supplier
  for all to anon using (true) with check (true);
-- Repeat for the other 15 tables.
```

The **Database** page in the app contains a copy-ready version of this policy and a live connection test.

## Modules

- **Dashboard** — KPIs, revenue/order charts, status distribution, warehouse utilisation, reorder watchlist, active shipments and procurement pipeline.
- **Customer orders** — multi-line orders, payment status, payment recording, shipment creation and order lifecycle.
- **Inventory** — warehouse-product stock levels, reorder alerts, inline quantity updates and CSV export.
- **Purchase orders** — supplier procurement with line items, approval and automatic stock receiving into the destination warehouse.
- **Payments** — receivables ledger with per-order balances, methods and CSV export.
- **Shipments** — transporter assignment, ship/delivery dates and status tracking; marking a shipment delivered also marks its order delivered.
- **Suppliers** — multiple phone numbers, address, rating, purchase history and supplier-product catalogue links.
- **Products / Categories** — catalogue, pricing, reorder levels, stock-by-warehouse and category rollups.
- **Warehouses / Employees / Customers / Transporters** — facilities, capacity and managers; people and reporting lines; customer history; carrier records.
- **Database** — connection status, schema map, relationship map, environment checklist, RLS policy helper, workspace JSON export and demo reset.

Other features: command palette (`⌘/Ctrl + K`), CSV exports, filters and search across modules, responsive layouts, and a fully seeded demo dataset stored in `localStorage`.

## Demo mode

With no credentials, the app uses demo data and persists changes in the browser under `kargo.demo.workspace.v3`. Use **Database → Reset demo** to restore the original seed, or clear the key from local storage.

## Project structure

```
src/
  components/     layout, shared UI, command palette
  context/        data access (Supabase + demo) and toasts
  hooks/          relationship lookups
  lib/            constants, demo dataset, Supabase client, formatters
  pages/          one page per module
```
