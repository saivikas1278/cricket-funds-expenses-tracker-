import React from 'react'
import { Calendar, Tag, DollarSign, Trash2, Shield, CircleDot, Flag, Coffee, FileText } from 'lucide-react'

const getCategoryBadge = (category) => {
  switch (category?.toLowerCase()) {
    case 'balls':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border-2 border-amber-300 rounded-lg text-xs font-black uppercase tracking-wider">
          <CircleDot className="w-3.5 h-3.5" /> Balls
        </span>
      )
    case 'ground fee':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border-2 border-emerald-300 rounded-lg text-xs font-black uppercase tracking-wider">
          <Flag className="w-3.5 h-3.5" /> Ground Fee
        </span>
      )
    case 'equipment':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border-2 border-blue-300 rounded-lg text-xs font-black uppercase tracking-wider">
          <Shield className="w-3.5 h-3.5" /> Equipment
        </span>
      )
    case 'refreshments':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 border-2 border-purple-300 rounded-lg text-xs font-black uppercase tracking-wider">
          <Coffee className="w-3.5 h-3.5" /> Refreshments
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 border-2 border-slate-300 rounded-lg text-xs font-black uppercase tracking-wider">
          <Tag className="w-3.5 h-3.5" /> {category || 'General'}
        </span>
      )
  }
}

const ExpenseTable = ({ expenses = [], loading = false, onDelete = null }) => {
  if (loading) {
    return (
      <div className="p-8 text-slate-400 font-bold text-center border-2 border-slate-200 border-dashed rounded-xl bg-white">
        Loading expense records...
      </div>
    )
  }

  if (!expenses || expenses.length === 0) {
    return (
      <div className="p-8 text-slate-400 font-bold text-center border-2 border-slate-200 rounded-xl bg-flatSecondary">
        No expenses logged yet.
      </div>
    )
  }

  const totalSpent = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0)

  return (
    <div className="border-2 border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col w-full">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse min-w-[550px]">
          <thead className="bg-[#1E4D38] text-xs uppercase tracking-widest text-green-100">
            <tr>
              <th className="p-4 sm:px-6 whitespace-nowrap">
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4"/> Date</div>
              </th>
              <th className="p-4 sm:px-6 whitespace-nowrap">Category</th>
              <th className="p-4 sm:px-6 whitespace-nowrap">Item & Details</th>
              <th className="p-4 sm:px-6 text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-2"><DollarSign className="w-4 h-4"/> Amount</div>
              </th>
              {onDelete && <th className="p-4 sm:px-6 text-center whitespace-nowrap">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-100">
            {expenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 sm:px-6 font-bold text-slate-600 whitespace-nowrap">
                  {expense.expense_date}
                </td>
                <td className="p-4 sm:px-6 whitespace-nowrap">
                  {getCategoryBadge(expense.category)}
                </td>
                <td className="p-4 sm:px-6">
                  <div className="font-black text-slate-800 text-base">{expense.title}</div>
                  {expense.notes && (
                    <div className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                      <FileText className="w-3 h-3 shrink-0" /> {expense.notes}
                    </div>
                  )}
                </td>
                <td className="p-4 sm:px-6 font-black text-right whitespace-nowrap text-red-600 text-lg">
                  Rs. {Number(expense.amount).toLocaleString('en-IN')}
                </td>
                {onDelete && (
                  <td className="p-4 sm:px-6 text-center whitespace-nowrap">
                    <button
                      onClick={() => onDelete(expense.id, expense.title)}
                      className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg border-2 border-red-200 transition-colors"
                      title="Delete expense"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}

            <tr className="bg-flatSecondary border-t-4 border-slate-200">
              <td colSpan={3} className="p-4 sm:px-6 font-black text-slate-600 text-right uppercase tracking-widest text-xs">
                Total Expenses:
              </td>
              <td className="p-4 sm:px-6 font-black text-red-700 text-right text-xl whitespace-nowrap">
                Rs. {totalSpent.toLocaleString('en-IN')}
              </td>
              {onDelete && <td></td>}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ExpenseTable
