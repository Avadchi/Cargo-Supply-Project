import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Briefcase, Building2, Mail, Pencil, Plus, Trash2, UserRound, Users, Wallet } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useLookups } from '../hooks/useLookups'
import { formatCurrency, formatDate, formatNumber, fullName, numeric, todayISO } from '../lib/utils'
import { PageHeader, SearchInput, EmptyState, Avatar, DetailRow } from '../components/ui/Bits'
import { Modal, Drawer } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Field, FormGrid, SelectInput, TextInput } from '../components/ui/Form'

const blankEmployee = {
  first_name: '',
  last_name: '',
  email: '',
  designation: '',
  salary: '',
  hire_date: todayISO(),
  warehouse_id: '',
  supervisor_id: '',
}

const designations = [
  'Operations Director',
  'Warehouse Manager',
  'Procurement Lead',
  'Procurement Officer',
  'Inventory Analyst',
  'Dispatch Supervisor',
  'Receiving Officer',
  'Logistics Coordinator',
  'Quality Inspector',
  'Customer Success Lead',
  'Data Analyst',
]

export default function Employees() {
  const { db, create, update, remove, nextId } = useData()
  const { warehouseById, employeeById } = useLookups()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blankEmployee)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const employees = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (db.employee || [])
      .map((employee) => ({
        ...employee,
        warehouse: warehouseById.get(String(employee.warehouse_id)),
        supervisor: employeeById.get(String(employee.supervisor_id)),
        reports: (db.employee || []).filter((row) => String(row.supervisor_id) === String(employee.emp_id)),
        managedWarehouses: (db.warehouse || []).filter((row) => String(row.manager_id) === String(employee.emp_id)),
      }))
      .filter((employee) => {
        if (warehouseFilter !== 'all' && String(employee.warehouse_id) !== warehouseFilter) return false
        if (!term) return true
        return [employee.first_name, employee.last_name, employee.email, employee.designation, employee.warehouse?.warehouse_name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      })
      .sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`))
  }, [db.employee, db.warehouse, warehouseById, employeeById, search, warehouseFilter])

  const payroll = (db.employee || []).reduce((sum, employee) => sum + numeric(employee.salary), 0)
  const unassigned = (db.employee || []).filter((employee) => !employee.warehouse_id).length

  const openCreate = () => {
    setEditing(null)
    setForm({ ...blankEmployee, hire_date: todayISO() })
    setErrors({})
    setFormOpen(true)
  }

  const openEdit = (employee) => {
    setEditing(employee)
    setForm({
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      email: employee.email || '',
      designation: employee.designation || '',
      salary: String(employee.salary ?? ''),
      hire_date: employee.hire_date || todayISO(),
      warehouse_id: employee.warehouse_id ? String(employee.warehouse_id) : '',
      supervisor_id: employee.supervisor_id ? String(employee.supervisor_id) : '',
    })
    setErrors({})
    setFormOpen(true)
    setViewing(null)
  }

  const handleSave = async () => {
    const next = {}
    if (!form.first_name.trim()) next.first_name = 'First name is required.'
    if (!form.last_name.trim()) next.last_name = 'Last name is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.'
    const duplicate = (db.employee || []).some((employee) => employee.email?.toLowerCase() === form.email.trim().toLowerCase() && String(employee.emp_id) !== String(editing?.emp_id))
    if (duplicate) next.email = 'Another employee already uses this email.'
    if (!form.designation.trim()) next.designation = 'Designation is required.'
    if (form.salary === '' || numeric(form.salary) < 0) next.salary = 'Enter a valid salary.'
    if (!form.hire_date) next.hire_date = 'Hire date is required.'
    if (editing && String(form.supervisor_id) === String(editing.emp_id)) next.supervisor_id = 'An employee cannot supervise themselves.'
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim().toLowerCase(),
      designation: form.designation.trim(),
      salary: Number(form.salary),
      hire_date: form.hire_date,
      warehouse_id: form.warehouse_id ? Number(form.warehouse_id) : null,
      supervisor_id: form.supervisor_id ? Number(form.supervisor_id) : null,
    }
    try {
      if (editing) {
        await update('employee', { emp_id: editing.emp_id }, payload)
        toast.success('Employee record updated.')
      } else {
        await create('employee', { emp_id: nextId('employee', 'emp_id'), ...payload })
        toast.success('Employee added.')
      }
      setFormOpen(false)
    } catch (error) {
      toast.error(error.message || 'Could not save employee.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    const manages = (db.warehouse || []).some((warehouse) => String(warehouse.manager_id) === String(deleting.emp_id))
    const supervises = (db.employee || []).some((employee) => String(employee.supervisor_id) === String(deleting.emp_id))
    if (manages || supervises) {
      toast.error('This employee manages a warehouse or supervises other employees. Reassign those responsibilities first.')
      setDeleting(null)
      return
    }
    setDeleteLoading(true)
    try {
      await remove('employee', { emp_id: deleting.emp_id })
      toast.success('Employee removed.')
      setDeleting(null)
    } catch (error) {
      toast.error(error.message || 'Could not remove employee.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const viewingEmployee = viewing ? employees.find((row) => String(row.emp_id) === String(viewing.emp_id)) : null

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Network / people"
        title="Employee management"
        description="Maintain the people who run the network — roles, salaries, hire dates, warehouse assignments and reporting lines."
      >
        <button className="btn-primary" onClick={openCreate}><Plus size={15} /> Add employee</button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><Users size={16} /></div><div><p className="mini-label">Headcount</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{(db.employee || []).length}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><Wallet size={16} /></div><div><p className="mini-label">Monthly payroll</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{formatCurrency(payroll, true)}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><Building2 size={16} /></div><div><p className="mini-label">Warehouses staffed</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{new Set((db.employee || []).map((row) => row.warehouse_id).filter(Boolean)).size}</p></div></div>
        <div className="panel flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F3EB] text-ink-600"><UserRound size={16} /></div><div><p className="mini-label">Unassigned</p><p className="mt-1 font-display text-[18px] font-semibold leading-none text-ink-950">{unassigned}</p></div></div>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-line px-4 py-3.5 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search people, roles or email…" className="w-full sm:max-w-xs" />
          <SelectInput className="h-9 w-full text-[12px] sm:w-auto" value={warehouseFilter} onChange={(event) => setWarehouseFilter(event.target.value)}>
            <option value="all">All warehouses</option>
            {(db.warehouse || []).map((warehouse) => <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>{warehouse.warehouse_name}</option>)}
          </SelectInput>
          <span className="ml-auto font-mono text-[10px] text-mist">{employees.length} people</span>
        </div>

        {employees.length === 0 ? (
          <EmptyState icon={Users} title="No employees found" description="Try another search or add a new employee record." action={<button className="btn-primary" onClick={openCreate}><Plus size={14} /> Add employee</button>} />
        ) : (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Designation</th>
                  <th>Warehouse</th>
                  <th>Supervisor</th>
                  <th>Salary</th>
                  <th>Hired</th>
                  <th className="w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.emp_id} className="cursor-pointer" onClick={() => setViewing(employee)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={fullName(employee)} size="sm" tone={employee.emp_id % 3 === 0 ? 'clay' : employee.emp_id % 2 ? 'green' : 'blue'} />
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-ink-900">{fullName(employee)}</p>
                          <p className="mt-0.5 flex items-center gap-1 truncate text-[9.5px] text-mist"><Mail size={9} /> {employee.email}</p>
                        </div>
                      </div>
                    </td>
                    <td><p className="text-[11.5px] text-ink-800">{employee.designation}</p><p className="font-mono text-[9px] text-mist">EMP-{String(employee.emp_id).padStart(3, '0')}</p></td>
                    <td><p className="text-[11px] text-ink-800">{employee.warehouse?.warehouse_name || 'Unassigned'}</p><p className="text-[9px] text-mist">{employee.warehouse?.city || '—'}</p></td>
                    <td><p className="text-[10.5px] text-mist">{employee.supervisor ? fullName(employee.supervisor) : '—'}</p></td>
                    <td><span className="font-mono text-[11px] font-medium text-ink-900">{formatCurrency(employee.salary)}</span></td>
                    <td><span className="text-[10.5px] text-mist">{formatDate(employee.hire_date, 'short')}</span></td>
                    <td>
                      <div className="flex justify-end gap-0.5" onClick={(event) => event.stopPropagation()}>
                        <button className="icon-btn" onClick={() => openEdit(employee)} title="Edit"><Pencil size={13} /></button>
                        <button className="icon-btn hover:bg-[#FBE7E0] hover:text-[#B84A2C]" onClick={() => setDeleting(employee)} title="Delete"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit employee' : 'Add employee'}
        subtitle={editing ? `Updating EMP-${String(editing.emp_id).padStart(3, '0')}` : 'Add a team member to the supply network.'}
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add employee'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <FormGrid>
            <Field label="First name" required error={errors.first_name}>
              <TextInput value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} />
            </Field>
            <Field label="Last name" required error={errors.last_name}>
              <TextInput value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} />
            </Field>
            <Field label="Work email" required error={errors.email} className="sm:col-span-2">
              <TextInput type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@kargo.in" />
            </Field>
            <Field label="Designation" required error={errors.designation}>
              <TextInput list="kargo-designations" value={form.designation} onChange={(event) => setForm({ ...form, designation: event.target.value })} placeholder="Select or type a role" />
              <datalist id="kargo-designations">{designations.map((designation) => <option key={designation} value={designation} />)}</datalist>
            </Field>
            <Field label="Monthly salary (₹)" required error={errors.salary}>
              <TextInput type="number" min="0" value={form.salary} onChange={(event) => setForm({ ...form, salary: event.target.value })} placeholder="0" />
            </Field>
            <Field label="Hire date" required error={errors.hire_date}>
              <TextInput type="date" value={form.hire_date} onChange={(event) => setForm({ ...form, hire_date: event.target.value })} />
            </Field>
            <Field label="Warehouse assignment">
              <SelectInput value={form.warehouse_id} onChange={(event) => setForm({ ...form, warehouse_id: event.target.value })} placeholder="Unassigned" options={(db.warehouse || []).map((warehouse) => ({ value: warehouse.warehouse_id, label: warehouse.warehouse_name }))} />
            </Field>
            <Field label="Supervisor" error={errors.supervisor_id} className="sm:col-span-2">
              <SelectInput
                value={form.supervisor_id}
                onChange={(event) => setForm({ ...form, supervisor_id: event.target.value })}
                placeholder="No supervisor"
                options={(db.employee || []).filter((employee) => String(employee.emp_id) !== String(editing?.emp_id)).map((employee) => ({ value: employee.emp_id, label: `${fullName(employee)} · ${employee.designation}` }))}
              />
            </Field>
          </FormGrid>
        </div>
      </Modal>

      <Drawer
        open={Boolean(viewingEmployee)}
        onClose={() => setViewing(null)}
        title={viewingEmployee ? fullName(viewingEmployee) : 'Employee'}
        subtitle={viewingEmployee ? `${viewingEmployee.designation} · EMP-${String(viewingEmployee.emp_id).padStart(3, '0')}` : ''}
        footer={
          <>
            <button className="btn-danger" onClick={() => setDeleting(viewingEmployee)}><Trash2 size={14} /> Remove</button>
            <button className="btn-secondary" onClick={() => openEdit(viewingEmployee)}><Pencil size={14} /> Edit employee</button>
          </>
        }
      >
        {viewingEmployee && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 rounded-xl border border-line bg-paper p-4">
              <Avatar name={fullName(viewingEmployee)} size="lg" tone="green" />
              <div>
                <p className="font-display text-[16px] font-semibold text-ink-950">{fullName(viewingEmployee)}</p>
                <p className="mt-0.5 text-[11.5px] text-mist">{viewingEmployee.designation}</p>
                <p className="mt-1 flex items-center gap-1 text-[10px] text-ink-600"><Building2 size={10} /> {viewingEmployee.warehouse?.warehouse_name || 'Unassigned'}</p>
              </div>
            </div>
            <div>
              <p className="kicker mb-2">Employment record</p>
              <dl>
                <DetailRow label="Employee ID">EMP-{String(viewingEmployee.emp_id).padStart(3, '0')}</DetailRow>
                <DetailRow label="Email">{viewingEmployee.email}</DetailRow>
                <DetailRow label="Designation">{viewingEmployee.designation}</DetailRow>
                <DetailRow label="Monthly salary">{formatCurrency(viewingEmployee.salary)}</DetailRow>
                <DetailRow label="Hire date">{formatDate(viewingEmployee.hire_date)}</DetailRow>
                <DetailRow label="Warehouse">{viewingEmployee.warehouse?.warehouse_name || 'Unassigned'}</DetailRow>
                <DetailRow label="Supervisor">{viewingEmployee.supervisor ? fullName(viewingEmployee.supervisor) : '—'}</DetailRow>
                <DetailRow label="Manages">{viewingEmployee.managedWarehouses.map((warehouse) => warehouse.warehouse_name).join(', ') || 'No warehouse'}</DetailRow>
              </dl>
            </div>
            <div>
              <p className="kicker mb-2">Direct reports ({viewingEmployee.reports.length})</p>
              <div className="divide-y divide-line rounded-xl border border-line">
                {viewingEmployee.reports.map((report) => (
                  <div key={report.emp_id} className="flex items-center gap-3 px-3 py-2.5">
                    <Avatar name={fullName(report)} size="xs" tone="blue" />
                    <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-ink-900">{fullName(report)}</p><p className="text-[9px] text-mist">{report.designation}</p></div>
                  </div>
                ))}
                {viewingEmployee.reports.length === 0 && <p className="px-4 py-5 text-center text-[11px] text-mist">No direct reports.</p>}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Remove employee?"
        description={`Remove ${deleting ? fullName(deleting) : 'this employee'} from the organisation? Employees managing warehouses or supervising others must be reassigned first.`}
      />
    </div>
  )
}
