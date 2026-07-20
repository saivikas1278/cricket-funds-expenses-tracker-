import React, { useEffect, useMemo, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, CheckCircle, Circle, UserPlus, LogOut, ArrowRightCircle, Trash2, X, CalendarDays, ChevronLeft, PlusCircle, ShoppingBag, PiggyBank, Wallet, Receipt } from 'lucide-react';
import supabase from '../supabaseClient';
import PaymentTable from '../components/PaymentTable';
import ExpenseTable from '../components/ExpenseTable';
import { getCurrentWeekIdentifier, formatMonthWeek } from '../utils/dateUtils';

const WEEKLY_FEE = 50;

function normalizeSummary(payload, activeWeek) {
  const players = Array.isArray(payload?.players) ? payload.players : [];
  return players.map((player) => ({
    id: player.id,
    name: player.name || 'Unknown Player',
    isPaid: player.isPaid === true,
    amount: Number(player.amount || 0),
    weekIdentifier: player.weekIdentifier || activeWeek,
  }));
}

function AdminDashboard() {
  const [activeDate, setActiveDate] = useState(new Date());
  
  const weekIdentifier = useMemo(() => getCurrentWeekIdentifier(activeDate), [activeDate]);
  const displayTitle = useMemo(() => formatMonthWeek(activeDate), [activeDate]);
  
  const [players, setPlayers] = useState([]);
  const [globalStats, setGlobalStats] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingByPlayer, setSubmittingByPlayer] = useState({});
  const [newPlayerName, setNewPlayerName] = useState('');
  
  // Expense Form State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Balls');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [expenseNotes, setExpenseNotes] = useState('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [selectedHistoryPlayer, setSelectedHistoryPlayer] = useState(null);
  const [playerHistory, setPlayerHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const navigate = useNavigate();

  const handlePrevWeek = () => setActiveDate(d => new Date(d.getTime() - 7 * 86400000));
  const handleNextWeek = () => setActiveDate(d => new Date(d.getTime() + 7 * 86400000));

  const loadData = async (targetWeek) => {
    setLoading(true);
    try {
      const [summaryRes, statsRes, expensesRes] = await Promise.all([
        fetch(`/api/payments/summary?week_identifier=${targetWeek}`),
        fetch(`/api/stats/header?week_identifier=${targetWeek}`),
        fetch(`/api/expenses`)
      ]);
      
      if (summaryRes.ok) {
        const payload = await summaryRes.json();
        setPlayers(normalizeSummary(payload, targetWeek));
      }
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setGlobalStats(stats);
      }
      if (expensesRes.ok) {
        const expData = await expensesRes.json();
        setExpenses(expData.expenses || []);
      }
    } catch (_error) {
      toast.error('Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(weekIdentifier);
  }, [weekIdentifier]);

  useEffect(() => {
    let isMounted = true;
    async function loadHistory() {
      if (!selectedHistoryPlayer) return;
      setLoadingHistory(true);
      try {
        const res = await fetch(`/api/players/${selectedHistoryPlayer.id}/payments`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (isMounted) setPlayerHistory(data.payments || []);
      } catch (e) {
        toast.error('Failed to load player history');
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    }
    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [selectedHistoryPlayer]);

  async function handlePaymentStatusChange(player, newIsPaid) {
    if (submittingByPlayer[player.id]) return;
    
    if (player.isPaid === newIsPaid) return;

    setSubmittingByPlayer((prev) => ({ ...prev, [player.id]: true }));

    try {
      if (newIsPaid) {
          const response = await fetch('/api/payments/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId: player.id,
              weekIdentifier,
              amount: WEEKLY_FEE,
            }),
          });
          if (!response.ok) throw new Error('Failed to record payment.');
      } else {
          const response = await fetch('/api/payments/record', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId: player.id,
              weekIdentifier,
            }),
          });
          if (!response.ok) throw new Error('Failed to remove payment.');
      }

      setPlayers((prevPlayers) =>
        prevPlayers.map((entry) =>
          entry.id === player.id
            ? { ...entry, isPaid: newIsPaid, amount: newIsPaid ? WEEKLY_FEE : 0 }
            : entry
        )
      );
      
      if (globalStats) {
        const diff = newIsPaid ? WEEKLY_FEE : -WEEKLY_FEE;
        setGlobalStats(prev => ({
          ...prev,
          totalFundCollected: (prev.totalFundCollected || 0) + diff,
          netBalance: (prev.netBalance || 0) + diff,
          thisWeek: {
            ...prev.thisWeek,
            playersPaid: prev.thisWeek.playersPaid + (newIsPaid ? 1 : -1),
            pendingAmount: Math.max(0, prev.thisWeek.pendingAmount + (newIsPaid ? -WEEKLY_FEE : WEEKLY_FEE))
          }
        }));
      }

      toast.success(newIsPaid ? `${player.name} checked in.` : `${player.name} payment reverted.`);
    } catch (error) {
      toast.error(error.message || 'Could not change status.');
    } finally {
      setSubmittingByPlayer((prev) => ({ ...prev, [player.id]: false }));
    }
  }

  async function handleAddPlayer(e) {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlayerName.trim() })
      });
      if (!res.ok) throw new Error();
      toast.success(`Player ${newPlayerName} added to database.`);
      setNewPlayerName('');
      loadData(weekIdentifier);
    } catch (err) {
      toast.error('Failed to add player');
    }
  }

  async function handleAddExpense(e) {
    e.preventDefault();
    if (!expenseTitle.trim() || !expenseAmount || Number(expenseAmount) <= 0) {
      toast.error('Please provide a valid title and positive amount.');
      return;
    }

    setIsSubmittingExpense(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: expenseTitle.trim(),
          category: expenseCategory,
          amount: Number(expenseAmount),
          expenseDate,
          notes: expenseNotes.trim()
        })
      });

      if (!res.ok) throw new Error('Failed to record expense.');

      toast.success('Expense recorded successfully!');
      setExpenseTitle('');
      setExpenseAmount('');
      setExpenseNotes('');
      setIsExpenseModalOpen(false);
      loadData(weekIdentifier);
    } catch (err) {
      toast.error(err.message || 'Could not add expense.');
    } finally {
      setIsSubmittingExpense(false);
    }
  }

  async function handleDeleteExpense(expenseId, title) {
    if (!window.confirm(`Delete expense "${title}"?`)) return;

    try {
      const res = await fetch(`/api/expenses/${expenseId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Expense deleted.');
      loadData(weekIdentifier);
    } catch (err) {
      toast.error('Could not delete expense.');
    }
  }

  async function handleRemovePlayer(playerId, playerName) {
    if(!window.confirm(`Remove ${playerName}? This will permanently delete their history.`)) return;
    
    try {
      const res = await fetch(`/api/players/${playerId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success(`${playerName} permanently deleted.`);
      loadData(weekIdentifier);
    } catch (err) {
      toast.error('Could not remove player.');
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      toast.error('Could not log out.');
    }
  };

  const filteredHistoryPlayers = players.filter(p => 
    p.name.toLowerCase().includes(historySearchTerm.toLowerCase())
  );

  return (
    <div className="bg-flatBg text-slate-800 pb-20 pt-8 sm:pt-12 min-h-screen">
      <Toaster position="top-right" toastOptions={{ duration: 2800 }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
        
        {/* Top Floating Control Row */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
           {/* Date/Week Slider Component */}
           <div className="flex items-center gap-2 w-full xl:w-auto">
             <div className="hidden sm:flex bg-[#1E4D38] p-3 rounded-lg border-2 border-[#1E4D38]"><CalendarDays className="text-white w-6 h-6"/></div>
             <div className="flex items-center bg-white border-2 border-slate-300 rounded-lg overflow-hidden w-full xl:w-auto shadow-sm">
                <button 
                  onClick={handlePrevWeek} 
                  className="p-3 bg-slate-50 hover:bg-slate-200 transition-colors border-r-2 border-slate-300 active:bg-slate-300 shrink-0"
                >
                  <ChevronLeft className="w-6 h-6 text-slate-700" />
                </button>
                <div className="px-2 sm:px-5 py-3 text-base sm:text-lg font-black text-slate-800 text-center flex-1 sm:flex-none sm:min-w-[210px] whitespace-nowrap">
                  {displayTitle}
                </div>
                <button 
                  onClick={handleNextWeek} 
                  className="p-3 bg-slate-50 hover:bg-slate-200 transition-colors border-l-2 border-slate-300 active:bg-slate-300 shrink-0"
                >
                  <ChevronRight className="w-6 h-6 text-slate-700" />
                </button>
             </div>
           </div>

           <div className="flex flex-wrap gap-3 w-full sm:w-auto mt-4 sm:mt-0">
             <button 
               onClick={() => setIsExpenseModalOpen(true)}
               className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 border-2 border-emerald-700 text-white font-bold px-6 py-3 rounded-lg transition-colors shadow-sm"
             >
               <PlusCircle className="w-5 h-5"/> Log Expense
             </button>

             <button 
               onClick={() => setIsRemoveModalOpen(true)}
               className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-100 hover:bg-red-200 border-2 border-red-300 text-red-800 font-bold px-6 py-3 rounded-lg transition-colors"
             >
               <Trash2 className="w-5 h-5"/> Remove Roster
             </button>

             <button 
                onClick={handleLogout}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 border-2 border-slate-900 text-white font-bold px-6 py-3 rounded-lg transition-colors"
             >
                <LogOut className="w-5 h-5" /> Logout
             </button>
           </div>
        </div>

        {/* Global Statistics Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-2xl border-2 border-slate-200 shadow-none flex flex-col justify-center text-center">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center justify-center gap-2">
              <Wallet className="w-4 h-4 text-cricketGreen" /> Total Collected
            </h2>
            <p className="text-4xl lg:text-5xl font-black text-slate-800">
              Rs. {globalStats ? Number(globalStats.totalFundCollected).toLocaleString('en-IN') : '...'}
            </p>
          </div>
          <div className="bg-white p-8 rounded-2xl border-2 border-red-200 shadow-none flex flex-col justify-center text-center">
            <h2 className="text-sm font-black uppercase tracking-widest text-red-400 mb-2 flex items-center justify-center gap-2">
              <ShoppingBag className="w-4 h-4 text-red-600" /> Total Spent
            </h2>
            <p className="text-4xl lg:text-5xl font-black text-red-600">
              Rs. {globalStats ? Number(globalStats.totalSpent).toLocaleString('en-IN') : '...'}
            </p>
          </div>
          <div className="bg-cricketGreen text-white p-8 rounded-2xl border-2 border-[#1E4D38] flex flex-col justify-center text-center">
            <h2 className="text-sm font-black uppercase tracking-widest opacity-80 mb-2 flex items-center justify-center gap-2">
              <PiggyBank className="w-4 h-4 text-green-200" /> Available Balance
            </h2>
            <p className="text-4xl lg:text-5xl font-black">
              Rs. {globalStats ? Number(globalStats.netBalance).toLocaleString('en-IN') : '...'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 border-t-2 border-slate-200 pt-10">
          {/* LEFT COLUMN: Master Checklist */}
          <section className="space-y-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Checklist</h2>
              <p className="text-slate-500 font-bold uppercase tracking-widest">For {displayTitle}</p>
            </div>
            
            {loading ? (
              <div className="p-10 text-xl font-bold text-slate-400 bg-flatSecondary rounded-2xl border-2 border-slate-200 text-center">Loading Data...</div>
            ) : players.length === 0 ? (
              <div className="p-10 text-xl font-bold text-slate-400 bg-flatSecondary rounded-2xl border-2 border-slate-200 text-center">No active players.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {players.map((player) => {
                  const isPaid = player.isPaid;
                  return (
                    <div
                      key={player.id}
                      className={`w-full p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border-2 transition-all gap-4 bg-white border-slate-300 text-slate-800 ${submittingByPlayer[player.id] ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <div className="flex flex-col w-full sm:w-auto">
                        <span className="text-2xl font-black tracking-tight truncate">{player.name}</span>
                        <span className={`text-sm tracking-widest font-bold uppercase mt-1 ${isPaid ? 'text-cricketGreen' : 'text-slate-400'}`}>
                          {submittingByPlayer[player.id] ? 'Updating...' : (isPaid ? `PAID - Rs. ${WEEKLY_FEE}` : 'PENDING')}
                        </span>
                      </div>
                      
                      <div className="w-full sm:w-auto shrink-0 flex items-center bg-flatSecondary border-2 border-slate-200 rounded-lg p-1 gap-1">
                         <button 
                            onClick={() => handlePaymentStatusChange(player, true)}
                            className={`flex-1 sm:flex-none px-4 sm:px-5 py-3 sm:py-2 rounded-md font-black tracking-widest text-sm transition-colors uppercase ${
                               isPaid ? 'bg-cricketGreen text-white shadow-sm border-2 border-transparent' : 'text-slate-500 hover:bg-slate-200 border-2 border-transparent'
                            }`}
                         >
                           Yes
                         </button>
                         <button 
                            onClick={() => handlePaymentStatusChange(player, false)}
                            className={`flex-1 sm:flex-none px-4 sm:px-5 py-3 sm:py-2 rounded-md font-black tracking-widest text-sm transition-colors uppercase ${
                               !isPaid ? 'bg-red-500 text-white shadow-sm border-2 border-transparent' : 'text-slate-500 hover:bg-slate-200 border-2 border-transparent'
                            }`}
                         >
                           No
                         </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <section className="bg-flatSecondary p-6 sm:p-8 rounded-2xl border-2 border-slate-200 mt-6 md:mt-10 overflow-hidden">
              <h2 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                 <UserPlus className="w-6 h-6"/> Register Player
              </h2>
              <form onSubmit={handleAddPlayer} className="flex flex-col sm:flex-row gap-4 w-full">
                <input 
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Enter new player name..."
                  className="flex-1 bg-white border-2 border-slate-300 p-4 rounded-xl font-bold text-base outline-none focus:border-slate-800 text-slate-900 placeholder-slate-400 transition-colors w-full"
                />
                <button 
                  type="submit"
                  className="w-full sm:w-auto bg-slate-800 text-white font-black text-base px-6 py-4 rounded-xl hover:bg-slate-950 transition-colors shrink-0 flex justify-center items-center gap-2"
                >
                  <ArrowRightCircle className="w-5 h-5"/> Add
                </button>
              </form>
            </section>
          </section>

          {/* RIGHT COLUMN: Expense Ledger & Player History */}
          <section className="space-y-8">
            {/* Expense Management Ledger */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
                  <Receipt className="w-7 h-7 text-emerald-700" /> Expense Ledger
                </h2>
                <button
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="text-sm font-black bg-emerald-50 text-emerald-700 border-2 border-emerald-300 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" /> Add Expense
                </button>
              </div>

              <ExpenseTable expenses={expenses} loading={loading} onDelete={handleDeleteExpense} />
            </div>

            {/* Search Player History */}
            <div className="space-y-4 border-t-2 border-slate-200 pt-6">
              <h2 className="text-2xl font-black text-slate-900">Player History Search</h2>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-6 w-6 text-slate-400 stroke-[2.5]" />
                </div>
                <input 
                  type="text"
                  value={historySearchTerm}
                  onChange={(e) => {
                     setHistorySearchTerm(e.target.value);
                     setSelectedHistoryPlayer(null);
                  }}
                  placeholder="Search admin roster by name..."
                  className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-300 rounded-xl outline-none focus:border-cricketGreen text-slate-900 placeholder-slate-400 font-bold text-lg transition-colors"
                />
              </div>

              {!selectedHistoryPlayer && historySearchTerm.trim() && (
                <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  {filteredHistoryPlayers.length === 0 ? (
                    <div className="p-6 text-slate-400 font-bold text-center">No matches found.</div>
                  ) : (
                    filteredHistoryPlayers.map(p => (
                      <div 
                        key={`search-${p.id}`} 
                        className="p-5 border-b-2 border-slate-100 last:border-b-0 hover:bg-flatSecondary cursor-pointer flex justify-between items-center transition-colors group"
                        onClick={() => setSelectedHistoryPlayer(p)}
                      >
                        <span className="font-black text-lg text-slate-800">{p.name}</span>
                        <span className="flex items-center gap-1 text-sm font-bold text-slate-400 group-hover:text-cricketGreen uppercase tracking-widest transition-colors">
                          Select <ChevronRight className="w-4 h-4"/>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {selectedHistoryPlayer && (
                <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-flatSecondary p-6 border-b-2 border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">{selectedHistoryPlayer.name}</h3>
                      <p className="text-slate-500 font-medium text-sm mt-1">Full payment log</p>
                    </div>
                    <button 
                      onClick={() => setSelectedHistoryPlayer(null)}
                      className="w-full sm:w-auto text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest border-2 border-slate-300 rounded-lg px-4 py-2 bg-white"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="p-4 sm:p-6 bg-[#f8fafc]">
                     <PaymentTable history={playerHistory} loading={loadingHistory} />
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Modal: Add Expense */}
        {isExpenseModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border-2 border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="p-6 border-b-2 border-slate-100 flex justify-between items-center bg-emerald-50">
                <h2 className="text-2xl font-black text-emerald-900 flex items-center gap-2">
                  <PlusCircle className="w-6 h-6 text-emerald-700"/> Log Club Expense
                </h2>
                <button 
                   onClick={() => setIsExpenseModalOpen(false)}
                   className="p-2 bg-white border-2 border-emerald-200 text-emerald-800 rounded-xl hover:bg-emerald-100 transition-colors"
                >
                   <X className="w-5 h-5"/>
                </button>
              </div>

              <form onSubmit={handleAddExpense} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Item Title / Description</label>
                  <input
                    type="text"
                    required
                    value={expenseTitle}
                    onChange={(e) => setExpenseTitle(e.target.value)}
                    placeholder="e.g. SG Leather Balls (Box of 12)"
                    className="w-full bg-flatBg border-2 border-slate-300 p-3 rounded-xl font-bold outline-none focus:border-emerald-600 text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Category</label>
                    <select
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                      className="w-full bg-flatBg border-2 border-slate-300 p-3 rounded-xl font-bold outline-none focus:border-emerald-600 text-slate-800"
                    >
                      <option value="Balls">Balls</option>
                      <option value="Ground Fee">Ground Fee</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Refreshments">Refreshments</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Amount (Rs.)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      placeholder="e.g. 3600"
                      className="w-full bg-flatBg border-2 border-slate-300 p-3 rounded-xl font-bold outline-none focus:border-emerald-600 text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Expense Date</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full bg-flatBg border-2 border-slate-300 p-3 rounded-xl font-bold outline-none focus:border-emerald-600 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Notes (Optional)</label>
                  <input
                    type="text"
                    value={expenseNotes}
                    onChange={(e) => setExpenseNotes(e.target.value)}
                    placeholder="e.g. Purchased for T20 match at Green Park"
                    className="w-full bg-flatBg border-2 border-slate-300 p-3 rounded-xl font-bold outline-none focus:border-emerald-600 text-slate-800"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsExpenseModalOpen(false)}
                    className="px-5 py-3 rounded-xl font-bold border-2 border-slate-300 text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingExpense}
                    className="px-6 py-3 rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                  >
                    {isSubmittingExpense ? 'Saving...' : 'Record Expense'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Remove Player Overlay */}
        {isRemoveModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border-2 border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
              <div className="p-6 border-b-2 border-slate-100 flex justify-between items-center bg-red-50 rounded-t-2xl">
                <h2 className="text-2xl font-black text-red-800 flex items-center gap-2">
                  <Trash2 className="w-6 h-6"/> Remove Player
                </h2>
                <button 
                   onClick={() => setIsRemoveModalOpen(false)}
                   className="p-2 bg-white border-2 border-red-200 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                >
                   <X className="w-5 h-5"/>
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                 <p className="text-slate-500 font-bold mb-6">Warning: Deleting a player permanently destroys their entire payment history.</p>
                 <div className="space-y-3">
                   {players.map(p => (
                     <div key={`rm-${p.id}`} className="flex items-center justify-between p-4 border-2 border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
                       <span className="font-black text-lg text-slate-800">{p.name}</span>
                       <button 
                         onClick={() => handleRemovePlayer(p.id, p.name)}
                         className="px-4 py-2 bg-red-50 text-red-600 font-bold border-2 border-red-200 rounded-lg hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors shrink-0"
                       >
                         Delete
                       </button>
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default AdminDashboard;
