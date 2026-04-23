import { useEffect, useMemo, useState } from 'react'

function PlayerManagement() {
  const [players, setPlayers] = useState([])
  const [newPlayerName, setNewPlayerName] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [noticeMessage, setNoticeMessage] = useState('')
  const [savingByPlayer, setSavingByPlayer] = useState({})

  useEffect(() => {
    async function loadPlayers() {
      setLoading(true)
      setErrorMessage('')

      try {
        const response = await fetch('/api/players')
        if (!response.ok) {
          throw new Error('Unable to load players.')
        }

        const payload = await response.json()
        setPlayers(payload.players || [])
      } catch (error) {
        setErrorMessage(error.message || 'Could not load players right now.')
      } finally {
        setLoading(false)
      }
    }

    loadPlayers()
  }, [])

  async function handleAddPlayer(event) {
    event.preventDefault()
    setErrorMessage('')
    setNoticeMessage('')

    const cleanedName = newPlayerName.trim()
    if (!cleanedName) {
      setErrorMessage('Player name cannot be empty.')
      return
    }

    try {
      const response = await fetch('/api/players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: cleanedName }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to add player.')
      }

      setPlayers((prevPlayers) => {
        const nextPlayers = [...prevPlayers, payload.player]
        nextPlayers.sort((a, b) => a.name.localeCompare(b.name))
        return nextPlayers
      })
      setNewPlayerName('')
      setNoticeMessage('Player added successfully.')
    } catch (error) {
      setErrorMessage(error.message || 'Unable to add player.')
    }
  }

  async function handleToggleActive(playerId, nextIsActive) {
    setErrorMessage('')
    setNoticeMessage('')
    setSavingByPlayer((prev) => ({ ...prev, [playerId]: true }))

    try {
      const response = await fetch(`/api/players/${playerId}/active`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: nextIsActive }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to update player status.')
      }

      setPlayers((prevPlayers) =>
        prevPlayers.map((player) =>
          player.id === playerId ? { ...player, isActive: nextIsActive } : player,
        ),
      )

      setNoticeMessage(
        nextIsActive
          ? 'Player marked active and will appear in upcoming weekly lists.'
          : 'Player marked inactive. Historical payment records are preserved.',
      )
    } catch (error) {
      setErrorMessage(error.message || 'Unable to update player status.')
    } finally {
      setSavingByPlayer((prev) => ({ ...prev, [playerId]: false }))
    }
  }

  const activeCount = useMemo(
    () => players.filter((player) => player.isActive === true).length,
    [players],
  )
  const inactiveCount = players.length - activeCount

  return (
    <section className="space-y-6 bg-slate-950 px-3 py-4 text-slate-100 sm:px-4 sm:py-6">
      <div className="rounded-3xl border border-slate-700 bg-gradient-to-r from-slate-950 via-[#22262f] to-[#4A5D4E] p-6 shadow-2xl sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Admin Section</p>
        <h1 className="mt-2 text-2xl font-black tracking-wide text-white [font-family:Inter,sans-serif] sm:text-4xl">
          Player Management
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-200/90 sm:text-base">
          Toggle active status for players. Inactive players are excluded from future weekly payment
          lists while historical payment data remains unchanged.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-700 bg-white/5 p-5 shadow-card backdrop-blur-md">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Active Players</p>
          <p className="mt-2 text-2xl font-black text-white">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-[#9d1f2f]/50 bg-white/5 p-5 shadow-card backdrop-blur-md">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Inactive Players</p>
          <p className="mt-2 text-2xl font-black text-[#d96a76]">{inactiveCount}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-white/5 p-5 shadow-card backdrop-blur-md sm:p-6">
        <h2 className="text-lg font-black tracking-wide text-white [font-family:Inter,sans-serif]">
          Add Player
        </h2>
        <form onSubmit={handleAddPlayer} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={newPlayerName}
            onChange={(event) => setNewPlayerName(event.target.value)}
            placeholder="Enter player name"
            className="w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-[#4A5D4E] focus:ring-2 focus:ring-[#4A5D4E]/30"
          />
          <button
            type="submit"
            className="rounded-xl border border-[#4A5D4E] bg-[#4A5D4E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#607964]"
          >
            Add Player
          </button>
        </form>
      </div>

      {errorMessage ? (
        <p className="rounded-xl border border-[#9d1f2f] bg-[#9d1f2f]/20 px-4 py-3 text-sm font-medium text-[#efb1ba]">
          {errorMessage}
        </p>
      ) : null}
      {noticeMessage ? (
        <p className="rounded-xl border border-[#4A5D4E] bg-[#4A5D4E]/20 px-4 py-3 text-sm font-medium text-[#a9d0b1]">
          {noticeMessage}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-white/5 shadow-card backdrop-blur-md">
        <div className="border-b border-slate-700 px-4 py-3 sm:px-6">
          <h2 className="text-lg font-black tracking-wide text-white [font-family:Inter,sans-serif]">
            All Players
          </h2>
        </div>

        <div className="divide-y divide-slate-700">
          {loading ? (
            <p className="px-4 py-4 text-sm text-slate-300 sm:px-6">Loading players...</p>
          ) : players.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-300 sm:px-6">No players found yet.</p>
          ) : (
            players.map((player) => {
              const isSaving = savingByPlayer[player.id] === true

              return (
                <div key={player.id} className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
                  <div>
                    <p className="text-sm font-semibold text-white">{player.name}</p>
                    <p className="text-xs text-slate-300">
                      Status: {player.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-100">
                    <input
                      type="checkbox"
                      checked={player.isActive === true}
                      disabled={isSaving}
                      onChange={(event) => handleToggleActive(player.id, event.target.checked)}
                      className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-[#4A5D4E] focus:ring-[#4A5D4E]"
                    />
                    {player.isActive ? 'Active' : 'Inactive'}
                  </label>
                </div>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}

export default PlayerManagement
