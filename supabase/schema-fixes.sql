-- Optional schema fixes for the Kargo app.
--
-- The app already adapts to the combined columns (`first_name_last_name`,
-- `street_city_state`, `lead_time_days`) and never sends explicit identity
-- values. These two changes restore full functionality:
--
--   1. `pincode character` is `char(1)`, which cannot hold an Indian 6-digit
--      pincode. Without this fix the app falls back to folding the pincode
--      into `street_city_state`.
--
--   2. `shipment` only has one date column. Without this fix the app stores
--      the ship date in `ship_date_delivery_date` and cannot persist a
--      separate delivery date.
--
-- Run this in the Supabase SQL editor once.

alter table public.supplier
  alter column pincode type varchar(6);

alter table public.customer
  alter column pincode type varchar(6);

alter table public.shipment
  add column if not exists ship_date date,
  add column if not exists delivery_date date;

update public.shipment
set ship_date = ship_date_delivery_date
where ship_date is null
  and ship_date_delivery_date is not null;

-- The app reads both the old and new columns, so the old column can stay.
-- Once every row has been migrated and the app has been redeployed:
-- alter table public.shipment drop column ship_date_delivery_date;
