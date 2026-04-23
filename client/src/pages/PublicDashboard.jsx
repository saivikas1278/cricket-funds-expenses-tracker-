import React, { useEffect, useState } from 'react'
import { toast, Toaster } from 'react-hot-toast'
import { Search, ChevronDown, ChevronUp, UserCheck, BarChart3, CheckCircle, XCircle } from 'lucide-react'
import PaymentTable from '../components/PaymentTable'
import { formatISOWeek } from '../utils/dateUtils'

function PublicDashboard() {
  const [players, setPlayers] = useState([])
  const [currentWeek, setCurrentWeek] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
        const response = await fetch(`/api/transparency`)
        if (!response.ok) {
          throw new Error('Unable to fetch transparency summary.')
        }

        const payload = await response.json()
        if (isMounted && payload.ok) {
          if (payload.currentWeek) setCurrentWeek(payload.currentWeek)
          // Automatic calculations/sorting by highest contribution utilizing Javascript arrays
          const sorted = (payload.players || []).sort((a, b) => b.totalContributed - a.totalContributed)
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
  }, [])

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

  return (
    <section className="bg-flatBg text-slate-800 min-h-screen px-4 sm:px-6 py-12 md:py-24 max-w-5xl mx-auto space-y-12 sm:space-y-16">
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-3 flex items-center gap-3">
             <BarChart3 className="w-10 h-10 text-cricketGreen" />
             Fund Transparency
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 font-bold">Read-only public ledger. View all-time contributions natively.</p>
        </div>
        {currentWeek && (
          <div className="bg-flatSecondary border-2 border-slate-200 px-6 py-3 rounded-xl">
             <span className="font-black text-slate-400 uppercase tracking-widest text-sm block mb-1">Active Tracking</span>
             <span className="text-xl font-black text-cricketGreen">{formatISOWeek(currentWeek)}</span>
          </div>
        )}
      </div>

      {/* Responsive Search Component */}
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
          placeholder="Search for your name..."
          className="w-full pl-12 pr-4 py-5 text-xl font-bold bg-white border-2 border-slate-300 rounded-xl outline-none focus:border-cricketGreen text-slate-800 placeholder-slate-400 transition-colors shadow-sm"
        />
      </div>

      {/* Transparency Roster Collection */}
      <div className="space-y-6 sm:space-y-8 min-h-[300px]">
        {loading ? (
          <div className="text-xl sm:text-2xl text-slate-400 font-bold p-8 text-center bg-flatSecondary rounded-2xl border-2 border-slate-200">Loading open ledger...</div>
        ) : error ? (
          <div className="text-xl text-red-600 font-bold p-8 bg-red-50 border-2 border-red-200 rounded-2xl text-center">
            {error}
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="text-xl sm:text-2xl text-slate-500 font-bold p-12 border-2 border-slate-200 rounded-2xl text-center bg-flatSecondary">
            No players match the registry.
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
                    className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 sm:p-8 cursor-pointer gap-6 ${
                      isExpanded ? 'bg-[#f8fcf9]' : ''
                    }`}
                  >
                    {/* Left: Player Profile & Current Week Status */}
                    <div className="flex items-start sm:items-center gap-4 w-full sm:w-auto">
                      <div className="w-12 h-12 rounded-full bg-flatSecondary border-2 border-slate-200 flex items-center justify-center shrink-0">
                         <UserCheck className="w-6 h-6 text-slate-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">{player.name}</h3>
                        
                        {/* Weekly Status Indicator Tag */}
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
                    
                    {/* Right: Contributions & Expansion Chevron */}
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t-2 border-slate-100 sm:border-0 pt-4 sm:pt-0 shrink-0">
                      <div className="text-left sm:text-right">
                         <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">Total Supplied</span>
                         <span className="text-3xl font-black text-slate-900">Rs. {player.totalContributed}</span>
                      </div>
                      <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all ${
                        isExpanded ? 'bg-cricketGreen border-cricketGreen text-white' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
                      }`}>
                         {isExpanded ? <ChevronUp className="w-6 h-6 stroke-[3]" /> : <ChevronDown className="w-6 h-6 stroke-[3]" />}
                      </div>
                    </div>
                  </div>

                  {/* Render the reusable PaymentTable immediately below */}
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

    </section>
  )
}

export default PublicDashboard
