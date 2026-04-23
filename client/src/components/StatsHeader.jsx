import { useEffect, useMemo, useState } from 'react'

function StatsHeader({ weekIdentifier }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const effectiveWeek = useMemo(() => weekIdentifier || '', [weekIdentifier])

  useEffect(() => {
    let isMounted = true

    async function loadStats() {
      setLoading(true)
      setError('')

      try {
        const params = effectiveWeek
          ? `?${new URLSearchParams({ week_identifier: effectiveWeek }).toString()}`
          : ''
        const response = await fetch(`/api/stats/header${params}`)

        if (!response.ok) {
          throw new Error('Failed to load stats header.')
        }

        const payload = await response.json()
        if (isMounted) {
          setStats(payload)
        }
      } catch (_error) {
        if (isMounted) {
          setError('Stats unavailable right now.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadStats()

    return () => {
      isMounted = false
    }
  }, [effectiveWeek])

  const progressPercent = stats?.thisWeek?.progressPercent || 0

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-950 p-5 text-slate-100 shadow-xl sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Stats Header</p>
          <h2 className="mt-1 text-xl font-black tracking-wide text-white [font-family:Inter,sans-serif]">
            Weekly Fund Snapshot
          </h2>
        </div>
        <span className="rounded-full border border-[#4A5D4E] bg-[#4A5D4E]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#a9d0b1]">
          {stats?.weekIdentifier || weekIdentifier || 'Current Week'}
        </span>
      </div>

      {loading ? (
        <p className="pt-4 text-sm text-slate-300">Loading stats...</p>
      ) : error ? (
        <p className="pt-4 text-sm font-semibold text-red-300">{error}</p>
      ) : (
        <div className="grid gap-4 pt-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-700 bg-white/5 p-4 backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Total Fund Collected</p>
            <p className="mt-2 text-2xl font-black text-white">Rs. {stats?.totalFundCollected || 0}</p>
          </div>

          <div className="rounded-xl border border-slate-700 bg-white/5 p-4 backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">This Week's Progress</p>
            <p className="mt-2 text-lg font-bold text-white">
              {stats?.thisWeek?.playersPaid || 0} / {stats?.thisWeek?.totalActivePlayers || 0} paid
            </p>
            <div className="mt-3 h-2.5 w-full rounded-full bg-slate-800">
              <div
                className="h-2.5 rounded-full bg-[#4A5D4E] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-semibold text-[#a9d0b1]">{progressPercent}% complete</p>
          </div>

          <div className="rounded-xl border border-slate-700 bg-white/5 p-4 backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Pending Amount</p>
            <p className="mt-2 text-2xl font-black text-[#d96a76]">Rs. {stats?.thisWeek?.pendingAmount || 0}</p>
          </div>
        </div>
      )}
    </section>
  )
}

export default StatsHeader
