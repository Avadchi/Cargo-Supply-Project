import { addDays, daysAgo } from './utils'

const products = [
  { product_id: 1001, product_name: 'Basmati Rice 25kg', category_id: 1, unit_price: 1850, reorder_level: 100, description: 'Premium long-grain aged basmati rice, 25 kg commercial sack.' },
  { product_id: 1002, product_name: 'Whole Wheat Flour 10kg', category_id: 1, unit_price: 420, reorder_level: 200, description: 'Stone-ground chakki atta in a 10 kg food-grade bag.' },
  { product_id: 1003, product_name: 'Toor Dal 5kg', category_id: 1, unit_price: 640, reorder_level: 150, description: 'Unpolished split pigeon peas, 5 kg vacuum-sealed pack.' },
  { product_id: 1004, product_name: 'Sunflower Oil 5L', category_id: 1, unit_price: 780, reorder_level: 120, description: 'Refined sunflower cooking oil in a 5 litre jerry can.' },
  { product_id: 1005, product_name: 'Assam Tea 1kg', category_id: 2, unit_price: 520, reorder_level: 80, description: 'Single-estate CTC tea, strong body and malty finish.' },
  { product_id: 1006, product_name: 'Arabica Coffee Beans 1kg', category_id: 2, unit_price: 1150, reorder_level: 60, description: 'Medium-roast Chikmagalur arabica, whole bean.' },
  { product_id: 1007, product_name: 'Mineral Water 1L (12 pack)', category_id: 2, unit_price: 240, reorder_level: 180, description: 'Natural mineral water, shrink-wrapped case of twelve.' },
  { product_id: 1008, product_name: 'Sparkling Lemonade 300ml (24)', category_id: 2, unit_price: 720, reorder_level: 90, description: 'Lightly carbonated lemon beverage, tray of 24 bottles.' },
  { product_id: 1009, product_name: 'Full Cream Milk 1L', category_id: 3, unit_price: 68, reorder_level: 400, description: 'Pasteurised full cream milk, chilled distribution.' },
  { product_id: 1010, product_name: 'Greek Yogurt 500g', category_id: 3, unit_price: 180, reorder_level: 120, description: 'Thick strained yogurt, plain, 500 g tub.' },
  { product_id: 1011, product_name: 'Aged Cheddar 200g', category_id: 3, unit_price: 360, reorder_level: 80, description: 'Twelve-month aged cheddar, vacuum packed.' },
  { product_id: 1012, product_name: 'Potato Chips 90g (6 pack)', category_id: 4, unit_price: 180, reorder_level: 250, description: 'Sea-salted kettle chips, six retail packs per sleeve.' },
  { product_id: 1013, product_name: 'Dark Chocolate 100g', category_id: 4, unit_price: 250, reorder_level: 140, description: '70% single-origin cocoa bar, foil wrapped.' },
  { product_id: 1014, product_name: 'Mixed Nuts 500g', category_id: 4, unit_price: 640, reorder_level: 100, description: 'Roasted almonds, cashews and pistachios, resealable jar.' },
  { product_id: 1015, product_name: 'Laundry Detergent 2L', category_id: 5, unit_price: 460, reorder_level: 90, description: 'Concentrated liquid detergent for front and top load.' },
  { product_id: 1016, product_name: 'Dishwash Liquid 750ml', category_id: 5, unit_price: 210, reorder_level: 120, description: 'Lemon-scented grease-cutting dishwashing gel.' },
  { product_id: 1017, product_name: 'Floor Cleaner 1L', category_id: 5, unit_price: 270, reorder_level: 100, description: 'Disinfectant surface cleaner, floral fragrance.' },
  { product_id: 1018, product_name: 'Herbal Shampoo 400ml', category_id: 6, unit_price: 350, reorder_level: 110, description: 'Sulphate-free shampoo with neem and aloe vera.' },
  { product_id: 1019, product_name: 'Face Wash 150ml', category_id: 6, unit_price: 295, reorder_level: 90, description: 'Gentle foaming cleanser for daily use.' },
  { product_id: 1020, product_name: 'Corrugated Boxes (50 pack)', category_id: 7, unit_price: 850, reorder_level: 60, description: 'Five-ply 12 x 10 x 8 inch shipping cartons.' },
  { product_id: 1021, product_name: 'Bubble Wrap Roll 100m', category_id: 7, unit_price: 540, reorder_level: 50, description: 'High-bubble protective wrap, 1 m width.' },
  { product_id: 1022, product_name: 'Stretch Wrap 500mm', category_id: 7, unit_price: 380, reorder_level: 40, description: 'Pallet stretch film, 23 micron, 500 mm roll.' },
]

const orderSpecs = [
  { order_id: 9001, customer_id: 1, warehouse_id: 1, order_date: daysAgo(1), order_status: 'Processing', items: [[1001, 4], [1004, 6], [1007, 8]] },
  { order_id: 9002, customer_id: 4, warehouse_id: 2, order_date: daysAgo(2), order_status: 'Packed', items: [[1005, 3], [1006, 2], [1014, 4]] },
  { order_id: 9003, customer_id: 2, warehouse_id: 1, order_date: daysAgo(3), order_status: 'Shipped', items: [[1015, 10], [1016, 12], [1017, 8]] },
  { order_id: 9004, customer_id: 7, warehouse_id: 3, order_date: daysAgo(5), order_status: 'Delivered', items: [[1002, 8], [1003, 6], [1009, 24]] },
  { order_id: 9005, customer_id: 3, warehouse_id: 3, order_date: daysAgo(7), order_status: 'Delivered', items: [[1012, 14], [1013, 10]] },
  { order_id: 9006, customer_id: 9, warehouse_id: 2, order_date: daysAgo(9), order_status: 'Delivered', items: [[1018, 8], [1019, 6]] },
  { order_id: 9007, customer_id: 6, warehouse_id: 4, order_date: daysAgo(11), order_status: 'Confirmed', items: [[1007, 16], [1008, 6]] },
  { order_id: 9008, customer_id: 8, warehouse_id: 3, order_date: daysAgo(13), order_status: 'Delivered', items: [[1001, 3], [1004, 4], [1010, 12]] },
  { order_id: 9009, customer_id: 5, warehouse_id: 4, order_date: daysAgo(16), order_status: 'Shipped', items: [[1020, 6], [1021, 8], [1022, 10]] },
  { order_id: 9010, customer_id: 10, warehouse_id: 2, order_date: daysAgo(19), order_status: 'Delivered', items: [[1005, 5], [1013, 8], [1014, 3]] },
  { order_id: 9011, customer_id: 11, warehouse_id: 3, order_date: daysAgo(23), order_status: 'Delivered', items: [[1015, 6], [1018, 4]] },
  { order_id: 9012, customer_id: 12, warehouse_id: 1, order_date: daysAgo(27), order_status: 'Cancelled', items: [[1006, 4], [1010, 10]] },
  { order_id: 9013, customer_id: 1, warehouse_id: 1, order_date: daysAgo(34), order_status: 'Delivered', items: [[1003, 10], [1002, 12], [1009, 30]] },
  { order_id: 9014, customer_id: 4, warehouse_id: 2, order_date: daysAgo(41), order_status: 'Delivered', items: [[1012, 20], [1007, 12]] },
  { order_id: 9015, customer_id: 7, warehouse_id: 3, order_date: daysAgo(48), order_status: 'Delivered', items: [[1020, 10], [1021, 12]] },
  { order_id: 9016, customer_id: 3, warehouse_id: 3, order_date: daysAgo(57), order_status: 'Delivered', items: [[1001, 6], [1004, 8], [1005, 4]] },
  { order_id: 9017, customer_id: 9, warehouse_id: 2, order_date: daysAgo(66), order_status: 'Delivered', items: [[1018, 10], [1019, 8], [1016, 12]] },
  { order_id: 9018, customer_id: 6, warehouse_id: 4, order_date: daysAgo(77), order_status: 'Delivered', items: [[1008, 10], [1007, 20]] },
  { order_id: 9019, customer_id: 2, warehouse_id: 1, order_date: daysAgo(88), order_status: 'Delivered', items: [[1015, 12], [1017, 10]] },
  { order_id: 9020, customer_id: 10, warehouse_id: 2, order_date: daysAgo(97), order_status: 'Delivered', items: [[1006, 5], [1014, 6], [1013, 10]] },
  { order_id: 9021, customer_id: 5, warehouse_id: 4, order_date: daysAgo(108), order_status: 'Delivered', items: [[1002, 15], [1009, 40]] },
  { order_id: 9022, customer_id: 11, warehouse_id: 3, order_date: daysAgo(121), order_status: 'Returned', items: [[1011, 6], [1010, 8]] },
  { order_id: 9023, customer_id: 8, warehouse_id: 3, order_date: daysAgo(136), order_status: 'Delivered', items: [[1001, 5], [1003, 8], [1004, 5]] },
  { order_id: 9024, customer_id: 12, warehouse_id: 1, order_date: daysAgo(149), order_status: 'Delivered', items: [[1020, 8], [1022, 14]] },
]

const orderItems = []
orderSpecs.forEach((order) => {
  order.items.forEach(([productId, quantity], index) => {
    const product = products.find((p) => p.product_id === productId)
    orderItems.push({
      order_id: order.order_id,
      line_no: index + 1,
      product_id: productId,
      quantity,
      unit_price: product.unit_price,
    })
  })
})

const orderTotal = (orderId) =>
  orderItems
    .filter((item) => item.order_id === orderId)
    .reduce((sum, item) => sum + item.quantity * item.unit_price, 0)

const paymentMethods = ['UPI', 'Credit Card', 'Net Banking', 'Debit Card', 'Bank Transfer']
const paymentFraction = {
  Pending: 0,
  Confirmed: 0,
  Processing: 0.45,
  Packed: 0.75,
  Shipped: 0.9,
  Delivered: 1,
  Returned: 0.6,
  Cancelled: 0,
}
const payments = []
let paymentSequence = 0
orderSpecs.forEach((order, index) => {
  const total = orderTotal(order.order_id)
  const fraction = paymentFraction[order.order_status] ?? 0
  if (fraction <= 0) return
  const paid = Math.round(total * fraction)
  if (fraction === 1 && index % 6 === 0 && total > 1000) {
    // A few fully paid orders carry two instalments.
    const first = Math.round(paid * 0.45)
    payments.push({
      payment_id: 7001 + paymentSequence++,
      order_id: order.order_id,
      amount: first,
      payment_method: paymentMethods[index % paymentMethods.length],
      payment_date: order.order_date,
    })
    payments.push({
      payment_id: 7001 + paymentSequence++,
      order_id: order.order_id,
      amount: paid - first,
      payment_method: 'UPI',
      payment_date: addDays(order.order_date, 2),
    })
  } else {
    payments.push({
      payment_id: 7001 + paymentSequence++,
      order_id: order.order_id,
      amount: paid,
      payment_method: paymentMethods[index % paymentMethods.length],
      payment_date: order.order_date,
    })
  }
})

const transporterIds = [301, 302, 303, 304]
const shipments = orderSpecs
  .filter((order) => ['Shipped', 'Delivered', 'Returned'].includes(order.order_status))
  .map((order, index) => ({
    shipment_id: 6001 + index,
    order_id: order.order_id,
    transporter_id: transporterIds[index % transporterIds.length],
    ship_date: addDays(order.order_date, 1),
    delivery_date: ['Delivered', 'Returned'].includes(order.order_status) ? addDays(order.order_date, 3 + (index % 3)) : null,
    shipment_status:
      order.order_status === 'Delivered'
        ? 'Delivered'
        : order.order_status === 'Returned'
          ? 'Returned'
          : 'In transit',
  }))

const purchaseOrderSpecs = [
  { po_id: 8001, supplier_id: 1, warehouse_id: 1, po_date: daysAgo(2), po_status: 'Pending', items: [[1001, 300, 1620], [1002, 500, 365], [1004, 250, 690]] },
  { po_id: 8002, supplier_id: 2, warehouse_id: 2, po_date: daysAgo(4), po_status: 'Approved', items: [[1005, 200, 450], [1006, 120, 980], [1007, 600, 205]] },
  { po_id: 8003, supplier_id: 3, warehouse_id: 4, po_date: daysAgo(7), po_status: 'Received', items: [[1009, 1200, 58], [1010, 300, 150], [1011, 180, 310]] },
  { po_id: 8004, supplier_id: 4, warehouse_id: 3, po_date: daysAgo(10), po_status: 'Received', items: [[1012, 800, 152], [1013, 400, 215], [1014, 250, 560]] },
  { po_id: 8005, supplier_id: 5, warehouse_id: 1, po_date: daysAgo(15), po_status: 'Received', items: [[1015, 300, 395], [1016, 350, 178], [1017, 300, 230]] },
  { po_id: 8006, supplier_id: 6, warehouse_id: 3, po_date: daysAgo(21), po_status: 'Received', items: [[1020, 200, 710], [1021, 150, 460], [1022, 180, 315]] },
  { po_id: 8007, supplier_id: 7, warehouse_id: 2, po_date: daysAgo(26), po_status: 'Received', items: [[1018, 350, 292], [1019, 300, 248]] },
  { po_id: 8008, supplier_id: 1, warehouse_id: 2, po_date: daysAgo(33), po_status: 'Received', items: [[1001, 500, 1600], [1003, 400, 568]] },
  { po_id: 8009, supplier_id: 2, warehouse_id: 4, po_date: daysAgo(45), po_status: 'Draft', items: [[1008, 240, 615], [1007, 480, 210]] },
  { po_id: 8010, supplier_id: 4, warehouse_id: 1, po_date: daysAgo(58), po_status: 'Received', items: [[1012, 1000, 150], [1014, 300, 555]] },
]

const poItems = []
purchaseOrderSpecs.forEach((po) => {
  po.items.forEach(([productId, quantity, unitCost], index) => {
    poItems.push({ po_id: po.po_id, line_no: index + 1, product_id: productId, quantity, unit_cost: unitCost })
  })
})

const warehouses = [
  { warehouse_id: 1, warehouse_name: 'Vashi Distribution Hub', city: 'Navi Mumbai', capacity: 120000, manager_id: 3 },
  { warehouse_id: 2, warehouse_name: 'Peenya Fulfilment Centre', city: 'Bengaluru', capacity: 85000, manager_id: 6 },
  { warehouse_id: 3, warehouse_name: 'Okhla Cross-Dock', city: 'New Delhi', capacity: 70000, manager_id: 9 },
  { warehouse_id: 4, warehouse_name: 'Hadapsar Warehouse', city: 'Pune', capacity: 75000, manager_id: 12 },
]

const inventory = []
products.forEach((product) => {
  warehouses.forEach((warehouse) => {
    // Leave a few warehouse-product pairs unstocked so the UI can demonstrate
    // creating a brand-new inventory line.
    if ((product.product_id + warehouse.warehouse_id * 3) % 11 === 0) return
    const seed = (product.product_id * 7 + warehouse.warehouse_id * 31) % 17
    let quantity = 1100 + seed * 185
    if ((product.product_id + warehouse.warehouse_id) % 13 === 0) {
      quantity = Math.max(0, Math.floor(product.reorder_level * 0.55))
    } else if ((product.product_id + warehouse.warehouse_id) % 29 === 0) {
      quantity = 0
    }
    inventory.push({
      warehouse_id: warehouse.warehouse_id,
      product_id: product.product_id,
      quantity_on_hand: quantity,
      last_updated: `${daysAgo((product.product_id + warehouse.warehouse_id) % 18)}T09:30:00`,
    })
  })
})

export function buildDemoData() {
  return {
    supplier: [
      { supplier_id: 1, supplier_name: 'Meridian Agro Supplies', email: 'orders@meridianagro.in', street: '14 APMC Market Road', city: 'Nashik', state: 'Maharashtra', pincode: '422010', rating: 4.8, reg_date: '2021-03-14' },
      { supplier_id: 2, supplier_name: 'Sahyadri Beverages Co.', email: 'supply@sahyadribev.in', street: '8 MIDC Industrial Area', city: 'Pune', state: 'Maharashtra', pincode: '411026', rating: 4.5, reg_date: '2021-08-22' },
      { supplier_id: 3, supplier_name: 'Sahyadri Dairy Collective', email: 'dispatch@sahyadridairy.in', street: '42 Milk Colony', city: 'Bengaluru', state: 'Karnataka', pincode: '560022', rating: 4.9, reg_date: '2020-11-09' },
      { supplier_id: 4, supplier_name: 'Crunchline Foods Pvt. Ltd.', email: 'hello@crunchline.in', street: '27 Sector 63', city: 'Noida', state: 'Uttar Pradesh', pincode: '201301', rating: 4.2, reg_date: '2022-01-18' },
      { supplier_id: 5, supplier_name: 'PureHome Essentials', email: 'b2b@purehome.in', street: '11 GIDC Estate', city: 'Ahmedabad', state: 'Gujarat', pincode: '382445', rating: 4.6, reg_date: '2021-05-30' },
      { supplier_id: 6, supplier_name: 'PackRight Industrial', email: 'sales@packright.in', street: '5 Packaging Park', city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641021', rating: 4.3, reg_date: '2022-06-11' },
      { supplier_id: 7, supplier_name: 'Aravalli Naturals', email: 'trade@aravallinaturals.in', street: '19 Mansarovar Link Road', city: 'Jaipur', state: 'Rajasthan', pincode: '302020', rating: 4.7, reg_date: '2023-02-05' },
    ],
    supplier_phone: [
      { supplier_id: 1, phone_no: '+91 98220 14580' },
      { supplier_id: 1, phone_no: '+91 253 259 4401' },
      { supplier_id: 2, phone_no: '+91 98230 88412' },
      { supplier_id: 3, phone_no: '+91 80 2846 2200' },
      { supplier_id: 3, phone_no: '+91 98450 77210' },
      { supplier_id: 4, phone_no: '+91 98110 62840' },
      { supplier_id: 5, phone_no: '+91 98250 44031' },
      { supplier_id: 5, phone_no: '+91 79 4021 8830' },
      { supplier_id: 6, phone_no: '+91 422 421 7780' },
      { supplier_id: 7, phone_no: '+91 94140 33210' },
    ],
    category: [
      { category_id: 1, category_name: 'Grains & Staples', description: 'Rice, flour, pulses, oils and everyday cooking staples.' },
      { category_id: 2, category_name: 'Beverages', description: 'Tea, coffee, water and carbonated drinks.' },
      { category_id: 3, category_name: 'Dairy & Chilled', description: 'Temperature-controlled milk, yogurt and cheese.' },
      { category_id: 4, category_name: 'Snacks & Confectionery', description: 'Chips, chocolates and dry-fruit mixes.' },
      { category_id: 5, category_name: 'Home Care', description: 'Laundry, dishwashing and surface cleaning products.' },
      { category_id: 6, category_name: 'Personal Care', description: 'Shampoo, face wash and daily hygiene products.' },
      { category_id: 7, category_name: 'Packaging', description: 'Shipping cartons, protective wrap and pallet film.' },
    ],
    product: products,
    warehouse: warehouses,
    employee: [
      { emp_id: 1, first_name: 'Rajesh', last_name: 'Menon', email: 'rajesh.menon@kargo.in', designation: 'Operations Director', salary: 185000, hire_date: '2019-04-01', warehouse_id: null, supervisor_id: null },
      { emp_id: 2, first_name: 'Priya', last_name: 'Nair', email: 'priya.nair@kargo.in', designation: 'Procurement Lead', salary: 122000, hire_date: '2020-01-13', warehouse_id: 1, supervisor_id: 1 },
      { emp_id: 3, first_name: 'Arjun', last_name: 'Shah', email: 'arjun.shah@kargo.in', designation: 'Warehouse Manager', salary: 98000, hire_date: '2020-07-06', warehouse_id: 1, supervisor_id: 1 },
      { emp_id: 4, first_name: 'Neha', last_name: 'Kulkarni', email: 'neha.kulkarni@kargo.in', designation: 'Inventory Analyst', salary: 76000, hire_date: '2022-02-21', warehouse_id: 1, supervisor_id: 3 },
      { emp_id: 5, first_name: 'Vikram', last_name: 'Singh', email: 'vikram.singh@kargo.in', designation: 'Procurement Officer', salary: 72000, hire_date: '2021-09-15', warehouse_id: 3, supervisor_id: 2 },
      { emp_id: 6, first_name: 'Meera', last_name: 'Iyer', email: 'meera.iyer@kargo.in', designation: 'Warehouse Manager', salary: 95000, hire_date: '2020-03-02', warehouse_id: 2, supervisor_id: 1 },
      { emp_id: 7, first_name: 'Aditya', last_name: 'Rao', email: 'aditya.rao@kargo.in', designation: 'Dispatch Supervisor', salary: 58000, hire_date: '2022-06-20', warehouse_id: 2, supervisor_id: 6 },
      { emp_id: 8, first_name: 'Sana', last_name: 'Sheikh', email: 'sana.sheikh@kargo.in', designation: 'Customer Success Lead', salary: 68000, hire_date: '2021-11-08', warehouse_id: 2, supervisor_id: 1 },
      { emp_id: 9, first_name: 'Kabir', last_name: 'Malhotra', email: 'kabir.malhotra@kargo.in', designation: 'Warehouse Manager', salary: 92000, hire_date: '2021-01-25', warehouse_id: 3, supervisor_id: 1 },
      { emp_id: 10, first_name: 'Divya', last_name: 'Pillai', email: 'divya.pillai@kargo.in', designation: 'Receiving Officer', salary: 52000, hire_date: '2023-04-11', warehouse_id: 3, supervisor_id: 9 },
      { emp_id: 11, first_name: 'Rohan', last_name: 'Desai', email: 'rohan.desai@kargo.in', designation: 'Logistics Coordinator', salary: 61000, hire_date: '2022-08-01', warehouse_id: 4, supervisor_id: 12 },
      { emp_id: 12, first_name: 'Ananya', last_name: 'Bose', email: 'ananya.bose@kargo.in', designation: 'Warehouse Manager', salary: 89000, hire_date: '2021-07-19', warehouse_id: 4, supervisor_id: 1 },
      { emp_id: 13, first_name: 'Farhan', last_name: 'Qureshi', email: 'farhan.qureshi@kargo.in', designation: 'Quality Inspector', salary: 47000, hire_date: '2023-10-09', warehouse_id: 4, supervisor_id: 12 },
      { emp_id: 14, first_name: 'Ishita', last_name: 'Jain', email: 'ishita.jain@kargo.in', designation: 'Data Analyst', salary: 65000, hire_date: '2023-01-16', warehouse_id: 1, supervisor_id: 3 },
    ],
    supplier_product: [
      { supplier_id: 1, product_id: 1001, supply_price: 1620, lead_time: 4 },
      { supplier_id: 1, product_id: 1002, supply_price: 365, lead_time: 3 },
      { supplier_id: 1, product_id: 1003, supply_price: 568, lead_time: 4 },
      { supplier_id: 1, product_id: 1004, supply_price: 690, lead_time: 5 },
      { supplier_id: 2, product_id: 1005, supply_price: 450, lead_time: 3 },
      { supplier_id: 2, product_id: 1006, supply_price: 980, lead_time: 6 },
      { supplier_id: 2, product_id: 1007, supply_price: 205, lead_time: 2 },
      { supplier_id: 2, product_id: 1008, supply_price: 615, lead_time: 3 },
      { supplier_id: 3, product_id: 1009, supply_price: 58, lead_time: 1 },
      { supplier_id: 3, product_id: 1010, supply_price: 150, lead_time: 1 },
      { supplier_id: 3, product_id: 1011, supply_price: 310, lead_time: 2 },
      { supplier_id: 4, product_id: 1012, supply_price: 152, lead_time: 3 },
      { supplier_id: 4, product_id: 1013, supply_price: 215, lead_time: 4 },
      { supplier_id: 4, product_id: 1014, supply_price: 560, lead_time: 3 },
      { supplier_id: 5, product_id: 1015, supply_price: 395, lead_time: 4 },
      { supplier_id: 5, product_id: 1016, supply_price: 178, lead_time: 4 },
      { supplier_id: 5, product_id: 1017, supply_price: 230, lead_time: 5 },
      { supplier_id: 6, product_id: 1020, supply_price: 710, lead_time: 5 },
      { supplier_id: 6, product_id: 1021, supply_price: 460, lead_time: 4 },
      { supplier_id: 6, product_id: 1022, supply_price: 315, lead_time: 4 },
      { supplier_id: 7, product_id: 1018, supply_price: 292, lead_time: 3 },
      { supplier_id: 7, product_id: 1019, supply_price: 248, lead_time: 3 },
    ],
    purchase_order: purchaseOrderSpecs.map(({ items, ...po }) => po),
    po_item: poItems,
    customer: [
      { customer_id: 1, first_name: 'Aarav', last_name: 'Sharma', email: 'aarav.sharma@gmail.com', phone: '+91 98201 44521', street: '22 Palm Grove', city: 'Mumbai', state: 'Maharashtra', pincode: '400058' },
      { customer_id: 2, first_name: 'Diya', last_name: 'Patel', email: 'diya.patel@outlook.com', phone: '+91 98795 22014', street: '7 Satellite Road', city: 'Ahmedabad', state: 'Gujarat', pincode: '380015' },
      { customer_id: 3, first_name: 'Rohan', last_name: 'Gupta', email: 'rohan.gupta@gmail.com', phone: '+91 98108 77320', street: 'B-14 Greater Kailash', city: 'New Delhi', state: 'Delhi', pincode: '110048' },
      { customer_id: 4, first_name: 'Ananya', last_name: 'Reddy', email: 'ananya.reddy@gmail.com', phone: '+91 99490 31852', street: '18 Jubilee Hills', city: 'Hyderabad', state: 'Telangana', pincode: '500033' },
      { customer_id: 5, first_name: 'Kabir', last_name: 'Mehta', email: 'kabir.mehta@gmail.com', phone: '+91 98220 66781', street: '9 Koregaon Park', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
      { customer_id: 6, first_name: 'Isha', last_name: 'Nair', email: 'isha.nair@gmail.com', phone: '+91 98470 20844', street: '31 Marine Drive', city: 'Kochi', state: 'Kerala', pincode: '682031' },
      { customer_id: 7, first_name: 'Vivaan', last_name: 'Joshi', email: 'vivaan.joshi@gmail.com', phone: '+91 94140 55810', street: '4 C-Scheme', city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
      { customer_id: 8, first_name: 'Sara', last_name: 'Khan', email: 'sara.khan@gmail.com', phone: '+91 99350 21467', street: '12 Gomti Nagar', city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226010' },
      { customer_id: 9, first_name: 'Aditi', last_name: 'Verma', email: 'aditi.verma@gmail.com', phone: '+91 98450 77109', street: '5 Indiranagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560038' },
      { customer_id: 10, first_name: 'Arjun', last_name: 'Chatterjee', email: 'arjun.chatterjee@gmail.com', phone: '+91 98300 46712', street: '28 Salt Lake', city: 'Kolkata', state: 'West Bengal', pincode: '700091' },
      { customer_id: 11, first_name: 'Myra', last_name: 'Kapoor', email: 'myra.kapoor@gmail.com', phone: '+91 98760 32280', street: '16 Sector 17', city: 'Chandigarh', state: 'Punjab', pincode: '160017' },
      { customer_id: 12, first_name: 'Dhruv', last_name: 'Malhotra', email: 'dhruv.malhotra@gmail.com', phone: '+91 98110 21254', street: 'C-22 Sector 50', city: 'Noida', state: 'Uttar Pradesh', pincode: '201301' },
    ],
    customer_order: orderSpecs.map(({ items, ...order }) => order),
    order_item: orderItems,
    payment: payments,
    transporter: [
      { transporter_id: 301, transporter_name: 'BlueRoute Logistics', phone: '+91 98201 88220', vehicle_type: 'Container Truck' },
      { transporter_id: 302, transporter_name: 'SwiftLine Freight', phone: '+91 98450 44120', vehicle_type: 'Truck' },
      { transporter_id: 303, transporter_name: 'Metro Courier Services', phone: '+91 98110 77820', vehicle_type: 'Van' },
      { transporter_id: 304, transporter_name: 'WestCoast Cargo', phone: '+91 98230 66211', vehicle_type: 'Mini Truck' },
    ],
    shipment: shipments,
    inventory,
  }
}
