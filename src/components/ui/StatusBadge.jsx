import { cx } from '../../lib/utils'

export function StatusBadge({ status, className }) {
  const style = {
    Pending: 'bg-[#FFF3D8] text-[#946714]',
    Confirmed: 'bg-[#E7F0FE] text-[#2B5EA8]',
    Processing: 'bg-[#EDE9FE] text-[#6350A8]',
    Packed: 'bg-[#E0F2FE] text-[#176C91]',
    Shipped: 'bg-[#DDF5EA] text-[#1D7557]',
    Delivered: 'bg-[#E2F7D5] text-[#39741D]',
    Cancelled: 'bg-[#FBE7E0] text-[#B84A2C]',
    Returned: 'bg-[#F3E8E2] text-[#8D4F37]',
    Paid: 'bg-[#E2F7D5] text-[#39741D]',
    Partial: 'bg-[#FFF3D8] text-[#946714]',
    Unpaid: 'bg-[#EEF0EB] text-[#68736C]',
    Refunded: 'bg-[#FBE7E0] text-[#B84A2C]',
    Draft: 'bg-[#EEF0EB] text-[#68736C]',
    Approved: 'bg-[#E7F0FE] text-[#2B5EA8]',
    Received: 'bg-[#E2F7D5] text-[#39741D]',
    'In transit': 'bg-[#DDF5EA] text-[#1D7557]',
    'Out for delivery': 'bg-[#E7F0FE] text-[#2B5EA8]',
    Delayed: 'bg-[#FBE7E0] text-[#B84A2C]',
    'In stock': 'bg-[#E2F7D5] text-[#39741D]',
    Low: 'bg-[#FFF3D8] text-[#946714]',
    'Out of stock': 'bg-[#FBE7E0] text-[#B84A2C]',
  }[status] || 'bg-[#EEF0EB] text-[#68736C]'

  const dot = {
    Pending: 'bg-[#D49A2A]',
    Confirmed: 'bg-[#4F83CB]',
    Processing: 'bg-[#7F6BC3]',
    Packed: 'bg-[#3D9BC2]',
    Shipped: 'bg-[#39A37C]',
    Delivered: 'bg-[#66A53A]',
    Cancelled: 'bg-[#D2694C]',
    Returned: 'bg-[#A76A52]',
    Paid: 'bg-[#66A53A]',
    Partial: 'bg-[#D49A2A]',
    Unpaid: 'bg-[#89938C]',
    Refunded: 'bg-[#D2694C]',
    Draft: 'bg-[#89938C]',
    Approved: 'bg-[#4F83CB]',
    Received: 'bg-[#66A53A]',
    'In transit': 'bg-[#39A37C]',
    'Out for delivery': 'bg-[#4F83CB]',
    Delayed: 'bg-[#D2694C]',
    'In stock': 'bg-[#66A53A]',
    Low: 'bg-[#D49A2A]',
    'Out of stock': 'bg-[#D2694C]',
  }[status] || 'bg-[#89938C]'

  return (
    <span className={cx('badge', style, className)}>
      <span className={cx('h-1.5 w-1.5 rounded-full', dot)} />
      {status || 'Unknown'}
    </span>
  )
}
