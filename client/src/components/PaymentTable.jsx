import React from 'react';
import { Calendar, Wallet, Hash, XCircle, CheckCircle } from 'lucide-react';
import { formatISOWeek, generateWeekHistory } from '../utils/dateUtils';

const PaymentTable = ({ history, loading }) => {
  if (loading) {
    return (
      <div className="p-8 text-slate-400 font-bold text-center border-2 border-slate-200 border-dashed rounded-xl">
        Querying records...
      </div>
    );
  }

  // Automatic calculation for total using JavaScript reduce over actual paid history
  const totalAmount = history.reduce((sum, hist) => sum + Number(hist.amount || 0), 0);
  
  // Generate a continuous block of ALL weeks from the current week down to their first recorded payment.
  const timelineWeeks = generateWeekHistory(history);

  return (
    <div className="border-2 border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col w-full">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse min-w-[320px]">
          <thead className="bg-[#1E4D38] text-xs uppercase tracking-widest text-green-100">
            <tr>
              <th className="p-4 sm:px-6 whitespace-nowrap">
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4"/> Date</div>
              </th>
              <th className="p-4 sm:px-6 whitespace-nowrap">
                <div className="flex items-center gap-2"><Hash className="w-4 h-4"/> Tracker Week</div>
              </th>
              <th className="p-4 sm:px-6 text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-2"><Wallet className="w-4 h-4"/> Amount</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-100">
            {timelineWeeks.map((weekStr) => {
              // Find if they actually paid this week
              const paymentRecord = history.find(h => h.week_identifier === weekStr);
              const isPaid = !!paymentRecord;

              return (
                <tr key={weekStr} className={`transition-colors ${isPaid ? 'hover:bg-[#f4fbf7]' : 'bg-red-50 hover:bg-red-100'}`}>
                  <td className="p-4 sm:px-6 font-bold text-slate-600 whitespace-nowrap">
                    {isPaid ? (
                       <span className="flex items-center gap-2 text-slate-600"><CheckCircle className="w-4 h-4 text-cricketGreen"/> {paymentRecord.payment_date}</span>
                    ) : (
                       <span className="flex items-center gap-2 text-red-400"><XCircle className="w-4 h-4 text-red-500"/> Missed</span>
                    )}
                  </td>
                  <td className={`p-4 sm:px-6 font-black whitespace-nowrap ${isPaid ? 'text-cricketGreen' : 'text-red-500 line-through opacity-70'}`}>
                    {formatISOWeek(weekStr)}
                  </td>
                  <td className={`p-4 sm:px-6 font-black text-right whitespace-nowrap ${isPaid ? 'text-slate-900' : 'text-red-600'}`}>
                    {isPaid ? `Rs. ${paymentRecord.amount}` : 'Rs. 0'}
                  </td>
                </tr>
              );
            })}
            
            {/* Automatic Totals Row directly inside the reusable flat table */}
            <tr className="bg-flatSecondary border-t-4 border-slate-200">
              <td colSpan={2} className="p-4 sm:px-6 font-black text-slate-500 text-right uppercase tracking-widest text-xs">Total Collected:</td>
              <td className="p-4 sm:px-6 font-black text-cricketGreen text-right text-lg">Rs. {totalAmount}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentTable;
