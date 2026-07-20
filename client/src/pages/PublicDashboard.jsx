import React, { useEffect, useState } from 'react'
import { toast, Toaster } from 'react-hot-toast'
import { Search, ChevronDown, ChevronUp, UserCheck, BarChart3, CheckCircle, XCircle, Wallet, ShoppingBag, PiggyBank, Receipt, Calendar } from 'lucide-react'
import PaymentTable from '../components/PaymentTable'
import ExpenseTable from '../components/ExpenseTable'
import { formatISOWeek, getCurrentMonthIdentifier, generateAvailableMonths, formatMonthLabel } from '../utils/dateUtils'

function PublicDashboard() {
  const [players, setPlayers] = useState([])
  const [expenses, setExpenses] = useState([])
  const [totalCollected, setTotalCollected] = useState(0)
  const [totalSpent, setTotalSpent] = useState(0)
  const [netBalance, setNetBalance] = useState(0)
  const [currentWeek, setCurrentWeek] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthIdentifier())
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('contributions')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const availableMonths = generateAvailableMonths(2024)

  // History states
  const [expandedPlayerId, setExpandedPlayerId] = useState(null)
  const [playerHistory, setPlayerHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadTransparencySummary() {
      setLoading(true)
      setError('')

      try {
        const params = selectedMonth ? `?month=${selectedMonth}` : ''
        const response = await fetch(`/api/transparency${params}`)
        if (!response.ok) {
          throw new Error('Unable to fetch transparency summary.')
        }

        const payload = await response.json()
        if (isMounted && payload.ok) {
          if (payload.currentWeek) setCurrentWeek(payload.currentWeek)
          setTotalCollected(payload.totalCollected || 0)
          setTotalSpent(payload.totalSpent || 0)
          setNetBalance(payload.netBalance || 0)
          setExpenses(payload.expenses || [])

          const sorted = (payload.players || []).sort((a, b) => {
            const valA = selectedMonth ? (a.monthlyContributed || 0) : a.totalContributed
            const valB = selectedMonth ? (b.monthlyContributed || 0) : b.totalContributed
            return valB - valA
          })
          setPlayers(sorted)
        }
      } catch (_fetchError) {
        if (isMounted) {
          setError('Could not load transparency board. Server may be offline.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadTransparencySummary()

    return () => {
      isMounted = false
    }
  }, [selectedMonth])

  async function handleTogglePlayerHistory(playerId) {
    if (expandedPlayerId === playerId) {
      setExpandedPlayerId(null)
      return
    }

    setExpandedPlayerId(playerId)
    setLoadingHistory(true)
    setPlayerHistory([])

    try {
      const res = await fetch(`/api/players/${playerId}/payments`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPlayerHistory(data.payments || [])
    } catch (e) {
      toast.error('Failed to load history for this player')
    } finally {
      setLoadingHistory(false)
    }
  }

  const filteredPlayers = players.filter((player) => 
    player.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
  )

  const filteredExpenses = expenses.filter((exp) =>
    exp.title.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
    exp.category.toLowerCase().includes(searchTerm.trim().toLowerCase())
  )

  const monthTitle = selectedMonth ? formatMonthLabel(selectedMonth) : 'All-Time'

  return (
    <section className="bg-flatBg text-slate-800 min-h-screen px-4 sm:px-6 py-8 md:py-16 max-w-5xl mx-auto space-y-8 sm:space-y-12">
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-3 flex items-center gap-3">
             <BarChart3 className="w-10 h-10 text-cricketGreen" />
             Fund & Asset Transparency
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 font-bold">Monthly zero-based accounting ledger for player collections, expenses, and net balance.</p>
        </div>

        {/* Month Selector Dropdown */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
          <div className="bg-white border-2 border-slate-300 rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm w-full sm:w-auto">
            <Calendar className="w-5 h-5 text-cricketGreen shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-black text-slate-800 text-lg outline-none cursor-pointer py-1 w-full"
            >
              <option value="">All-Time Cumulative</option>
              {availableMonths.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} {m.value === getCurrentMonthIdentifier() ? '(Current Month)' : ''}
                </option>
              ))}
            </select>
          </div>

          {currentWeek && (
            <div className="bg-flatSecondary border-2 border-slate-200 px-5 py-2.5 rounded-xl hidden sm:block shrink-0">
               <span className="font-black text-slate-400 uppercase tracking-widest text-xs block">Week</span>
               <span className="text-base font-black text-cricketGreen">{formatISOWeek(currentWeek)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-slate-200 flex flex-col justify-center text-center shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-center gap-2 text-cricketGreen mb-2">
            <Wallet className="w-6 h-6" />
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
              Collected ({monthTitle})
            </h2>
          </div>
          <p className="text-3xl lg:text-4xl font-black text-slate-900">
            Rs. {totalCollected.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] font-bold text-slate-400 mt-2 block">
            {selectedMonth ? 'Resets to Rs. 0 at start of month' : 'All-time total collections'}
          </span>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-red-200 flex flex-col justify-center text-center shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-center gap-2 text-red-600 mb-2">
            <ShoppingBag className="w-6 h-6" />
            <h2 className="text-xs font-black uppercase tracking-widest text-red-400">
              Spent ({monthTitle})
            </h2>
          </div>
          <p className="text-3xl lg:text-4xl font-black text-red-600">
            Rs. {totalSpent.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] font-bold text-slate-400 mt-2 block">
            {selectedMonth ? 'Resets to Rs. 0 at start of month' : 'All-time total expenses'}
          </span>
        </div>

        <div className="bg-cricketGreen text-white p-6 sm:p-8 rounded-2xl border-2 border-[#1E4D38] flex flex-col justify-center text-center shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-center gap-2 text-green-200 mb-2">
            <PiggyBank className="w-6 h-6" />
            <h2 className="text-xs font-black uppercase tracking-widest opacity-80">
              Net Balance ({monthTitle})
            </h2>
          </div>
          <p className="text-3xl lg:text-4xl font-black">
            Rs. {netBalance.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] font-bold text-green-100/70 mt-2 block">
            {selectedMonth ? 'Monthly Collections - Monthly Spent' : 'Available cumulative balance'}
          </span>
        </div>
      </div>

      {/* Ledger View Selector Tabs */}
      <div className="flex border-b-2 border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('contributions')}
          className={`pb-4 px-2 text-lg font-black tracking-tight transition-colors border-b-4 -mb-[2px] flex items-center gap-2 ${
            activeTab === 'contributions'
              ? 'border-cricketGreen text-cricketGreen'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <UserCheck className="w-5 h-5" /> Player Contributions
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-4 px-2 text-lg font-black tracking-tight transition-colors border-b-4 -mb-[2px] flex items-center gap-2 ${
            activeTab === 'expenses'
              ? 'border-cricketGreen text-cricketGreen'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Receipt className="w-5 h-5" /> Asset & Expense Ledger ({expenses.length})
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative w-full max-w-lg">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-6 w-6 text-slate-400 stroke-[2.5]" />
        </div>
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value)
            setExpandedPlayerId(null)
          }}
          placeholder={activeTab === 'contributions' ? "Search player by name..." : "Search expenses or category..."}
          className="w-full pl-12 pr-4 py-4 text-lg font-bold bg-white border-2 border-slate-300 rounded-xl outline-none focus:border-cricketGreen text-slate-800 placeholder-slate-400 transition-colors shadow-sm"
        />
      </div>

      {/* Tab 1: Player Roster Collections */}
      {activeTab === 'contributions' && (
        <div className="space-y-6 min-h-[300px]">
          {loading ? (
            <div className="text-xl text-slate-400 font-bold p-8 text-center bg-flatSecondary rounded-2xl border-2 border-slate-200">Loading open ledger...</div>
          ) : error ? (
            <div className="text-xl text-red-600 font-bold p-8 bg-red-50 border-2 border-red-200 rounded-2xl text-center">
              {error}
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="text-xl text-slate-500 font-bold p-12 border-2 border-slate-200 rounded-2xl text-center bg-flatSecondary">
              No players match the search.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredPlayers.map((player) => {
                const isExpanded = expandedPlayerId === player.id;
                
                return (
                  <div 
                    key={player.id} 
                    className={`bg-white border-2 rounded-2xl overflow-hidden transition-all shadow-sm ${
                      isExpanded ? 'border-cricketGreen ring-4 ring-green-50' : 'border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <div 
                      onClick={() => handleTogglePlayerHistory(player.id)}
                      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 cursor-pointer gap-6 ${
                        isExpanded ? 'bg-[#f8fcf9]' : ''
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-4 w-full sm:w-auto">
                        <div className="w-12 h-12 rounded-full bg-flatSecondary border-2 border-slate-200 flex items-center justify-center shrink-0">
                           <UserCheck className="w-6 h-6 text-slate-500" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-2xl font-black text-slate-800 tracking-tight">{player.name}</h3>
                          
                          <div className="mt-2 flex items-center gap-2">
                             {player.isPaidThisWeek ? (
                               <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#f4fbf7] text-cricketGreen border-2 border-cricketGreen rounded-lg text-xs font-black uppercase tracking-widest">
                                 <CheckCircle className="w-3.5 h-3.5" /> Checked In
                               </span>
                             ) : (
                               <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 border-2 border-red-300 rounded-lg text-xs font-black uppercase tracking-widest">
                                 <XCircle className="w-3.5 h-3.5" /> Unpaid
                               </span>
                             )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t-2 border-slate-100 sm:border-0 pt-4 sm:pt-0 shrink-0">
                        <div className="text-left sm:text-right">
                           <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">
                             {selectedMonth ? `Supplied (${monthTitle})` : 'Total Supplied'}
                           </span>
                           <span className="text-3xl font-black text-slate-900">
                             Rs. {(selectedMonth ? (player.monthlyContributed || 0) : player.totalContributed).toLocaleString('en-IN')}
                           </span>
                        </div>
                        <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all ${
                          isExpanded ? 'bg-cricketGreen border-cricketGreen text-white' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
                        }`}>
                           {isExpanded ? <ChevronUp className="w-6 h-6 stroke-[3]" /> : <ChevronDown className="w-6 h-6 stroke-[3]" />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t-2 border-slate-200 bg-flatSecondary p-4 sm:p-8">
                         <h4 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-2">
                           Payment Blueprint
                         </h4>
                         <PaymentTable history={playerHistory} loading={loadingHistory} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Expenditures & Asset Ledger */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <ExpenseTable expenses={filteredExpenses} loading={loading} />
        </div>
      )}

    </section>
  )
}

export default PublicDashboard
