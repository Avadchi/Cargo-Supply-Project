export const TABLE_NAMES = [
  'supplier',
  'supplier_phone',
  'category',
  'product',
  'warehouse',
  'employee',
  'supplier_product',
  'purchase_order',
  'po_item',
  'customer',
  'customer_order',
  'order_item',
  'payment',
  'transporter',
  'shipment',
  'inventory',
]

export const PK = {
  supplier: 'supplier_id',
  supplier_phone: ['supplier_id', 'phone_no'],
  category: 'category_id',
  product: 'product_id',
  warehouse: 'warehouse_id',
  employee: 'emp_id',
  supplier_product: ['supplier_id', 'product_id'],
  purchase_order: 'po_id',
  po_item: ['po_id', 'line_no'],
  customer: 'customer_id',
  customer_order: 'order_id',
  order_item: ['order_id', 'line_no'],
  payment: 'payment_id',
  transporter: 'transporter_id',
  shipment: 'shipment_id',
  inventory: ['warehouse_id', 'product_id'],
}

export const ID_COLUMNS = {
  supplier: 'supplier_id',
  category: 'category_id',
  product: 'product_id',
  warehouse: 'warehouse_id',
  employee: 'emp_id',
  purchase_order: 'po_id',
  customer: 'customer_id',
  customer_order: 'order_id',
  payment: 'payment_id',
  transporter: 'transporter_id',
  shipment: 'shipment_id',
}

export const STATUS_STYLES = {
  // Orders
  Pending: 'bg-[#FFF3D8] text-[#9A6A15]',
  Confirmed: 'bg-[#E7F0FE] text-[#2B5EA8]',
  Processing: 'bg-[#EDE9FE] text-[#6350A8]',
  Packed: 'bg-[#E0F2FE] text-[#176C91]',
  Shipped: 'bg-[#DDF5EA] text-[#1D7557]',
  Delivered: 'bg-[#E2F7D5] text-[#39741D]',
  Cancelled: 'bg-[#FBE7E0] text-[#B84A2C]',
  Returned: 'bg-[#F3E8E2] text-[#8D4F37]',
  // Payments
  Paid: 'bg-[#E2F7D5] text-[#39741D]',
  Partial: 'bg-[#FFF3D8] text-[#9A6A15]',
  Refunded: 'bg-[#FBE7E0] text-[#B84A2C]',
  // Purchase orders
  Draft: 'bg-[#EEF0EB] text-[#68736C]',
  Approved: 'bg-[#E7F0FE] text-[#2B5EA8]',
  Received: 'bg-[#E2F7D5] text-[#39741D]',
  // Shipments
  'In transit': 'bg-[#DDF5EA] text-[#1D7557]',
  'Out for delivery': 'bg-[#E7F0FE] text-[#2B5EA8]',
  Delayed: 'bg-[#FBE7E0] text-[#B84A2C]',
  // Stock
  'In stock': 'bg-[#E2F7D5] text-[#39741D]',
  Low: 'bg-[#FFF3D8] text-[#9A6A15]',
  'Out of stock': 'bg-[#FBE7E0] text-[#B84A2C]',
}

export const ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'Delivered', 'Cancelled', 'Returned']
export const PO_STATUSES = ['Draft', 'Pending', 'Approved', 'Received', 'Cancelled']
export const SHIPMENT_STATUSES = ['Pending', 'In transit', 'Out for delivery', 'Delivered', 'Delayed', 'Returned']
export const PAYMENT_METHODS = ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Cash on Delivery', 'Bank Transfer']
export const VEHICLE_TYPES = ['Truck', 'Container Truck', 'Mini Truck', 'Van', 'Two-wheeler', 'Rail Freight']
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry',
]
