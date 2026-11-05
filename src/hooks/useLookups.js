import { useMemo } from 'react'
import { useData } from '../context/DataContext'
import { fullName } from '../lib/utils'

export function byId(rows, key) {
  return new Map((rows || []).map((row) => [String(row[key]), row]))
}

export function useLookups() {
  const { db } = useData()

  return useMemo(() => {
    const supplierById = byId(db.supplier, 'supplier_id')
    const productById = byId(db.product, 'product_id')
    const categoryById = byId(db.category, 'category_id')
    const warehouseById = byId(db.warehouse, 'warehouse_id')
    const employeeById = byId(db.employee, 'emp_id')
    const customerById = byId(db.customer, 'customer_id')
    const transporterById = byId(db.transporter, 'transporter_id')
    const orderById = byId(db.customer_order, 'order_id')
    const poById = byId(db.purchase_order, 'po_id')

    const phonesBySupplier = (db.supplier_phone || []).reduce((map, row) => {
      const key = String(row.supplier_id)
      if (!map[key]) map[key] = []
      map[key].push(row.phone_no)
      return map
    }, {})

    const productsBySupplier = (db.supplier_product || []).reduce((map, row) => {
      const key = String(row.supplier_id)
      if (!map[key]) map[key] = []
      map[key].push({ ...row, product: productById.get(String(row.product_id)) })
      return map
    }, {})

    const itemsByOrder = (db.order_item || []).reduce((map, row) => {
      const key = String(row.order_id)
      if (!map[key]) map[key] = []
      map[key].push({ ...row, product: productById.get(String(row.product_id)) })
      return map
    }, {})

    const itemsByPo = (db.po_item || []).reduce((map, row) => {
      const key = String(row.po_id)
      if (!map[key]) map[key] = []
      map[key].push({ ...row, product: productById.get(String(row.product_id)) })
      return map
    }, {})

    const paymentsByOrder = (db.payment || []).reduce((map, row) => {
      const key = String(row.order_id)
      if (!map[key]) map[key] = []
      map[key].push(row)
      return map
    }, {})

    const shipmentByOrder = (db.shipment || []).reduce((map, row) => {
      map[String(row.order_id)] = row
      return map
    }, {})

    const inventoryByProduct = (db.inventory || []).reduce((map, row) => {
      const key = String(row.product_id)
      if (!map[key]) map[key] = []
      map[key].push(row)
      return map
    }, {})

    const employeesByWarehouse = (db.employee || []).reduce((map, row) => {
      if (row.warehouse_id == null) return map
      const key = String(row.warehouse_id)
      if (!map[key]) map[key] = []
      map[key].push(row)
      return map
    }, {})

    const supplierName = (id) => supplierById.get(String(id))?.supplier_name || 'Unknown supplier'
    const productName = (id) => productById.get(String(id))?.product_name || 'Unknown product'
    const categoryName = (id) => categoryById.get(String(id))?.category_name || 'Uncategorised'
    const warehouseName = (id) => warehouseById.get(String(id))?.warehouse_name || 'Unassigned'
    const customerName = (id) => {
      const customer = customerById.get(String(id))
      return customer ? fullName(customer) : 'Unknown customer'
    }
    const employeeName = (id) => {
      const employee = employeeById.get(String(id))
      return employee ? fullName(employee) : '—'
    }
    const transporterName = (id) => transporterById.get(String(id))?.transporter_name || 'Unassigned'
    const orderLabel = (id) => `#${id}`

    return {
      supplierById,
      productById,
      categoryById,
      warehouseById,
      employeeById,
      customerById,
      transporterById,
      orderById,
      poById,
      phonesBySupplier,
      productsBySupplier,
      itemsByOrder,
      itemsByPo,
      paymentsByOrder,
      shipmentByOrder,
      inventoryByProduct,
      employeesByWarehouse,
      supplierName,
      productName,
      categoryName,
      warehouseName,
      customerName,
      employeeName,
      transporterName,
      orderLabel,
    }
  }, [db])
}
