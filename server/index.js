import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { supabaseAdmin } from './supabaseAdmin.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = Number(process.env.PORT || 4000)
const weeklyFee = Number(process.env.WEEKLY_FEE || 50)

app.use(cors())
app.use(express.json())

const clientDistPath = path.join(__dirname, '../client/dist')
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath))
}

function getCurrentWeekIdentifier() {
  const now = new Date()
  const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const dayNum = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum)
  const year = utcDate.getUTCFullYear()
  const yearStart = new Date(Date.UTC(year, 0, 1))
  const week = Math.ceil(((utcDate - yearStart) / 86400000 + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'cricket-fund-server' })
})

app.get('/api/stats/header', async (req, res) => {
  try {
    const requestedWeekIdentifier = String(req.query?.week_identifier || '').trim()
    const weekIdentifier =
      /^\d{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$/.test(requestedWeekIdentifier)
        ? requestedWeekIdentifier
        : getCurrentWeekIdentifier()

    const [allPaymentsResult, activePlayersResult, activePlayerPaymentsResult, expensesResult] = await Promise.all([
      supabaseAdmin.from('payments').select('amount'),
      supabaseAdmin.from('players').select('id').eq('is_active', true),
      supabaseAdmin
        .from('players')
        .select('id, payments!left(amount, week_identifier)')
        .eq('is_active', true),
      supabaseAdmin.from('expenses').select('amount'),
    ])

    if (allPaymentsResult.error || activePlayersResult.error || activePlayerPaymentsResult.error) {
      res.status(500).json({
        ok: false,
        error: 'Failed to load stats header data.',
        details:
          allPaymentsResult.error?.message ||
          activePlayersResult.error?.message ||
          activePlayerPaymentsResult.error?.message ||
          'Unknown data query error.',
      })
      return
    }

    const totalFundCollected = Number(
      (allPaymentsResult.data || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    )

    const totalSpent = Number(
      (expensesResult.data || []).reduce((sum, exp) => sum + Number(exp.amount || 0), 0),
    )

    const netBalance = totalFundCollected - totalSpent

    const totalActivePlayers = (activePlayersResult.data || []).length
    const paidPlayers = (activePlayerPaymentsResult.data || []).filter((player) => {
      const weeklyPayment = (player.payments || []).find(
        (payment) => payment.week_identifier === weekIdentifier,
      )
      return Number(weeklyPayment?.amount || 0) >= weeklyFee
    }).length

    const thisWeekCollected = Number(paidPlayers * weeklyFee)
    const pendingAmount = Math.max(totalActivePlayers * weeklyFee - thisWeekCollected, 0)
    const progressPercent =
      totalActivePlayers > 0 ? Math.round((paidPlayers / totalActivePlayers) * 100) : 0

    res.json({
      ok: true,
      weekIdentifier,
      totalFundCollected,
      totalSpent,
      netBalance,
      thisWeek: {
        playersPaid: paidPlayers,
        totalActivePlayers,
        progressPercent,
        pendingAmount,
      },
    })
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: 'Unexpected error while loading stats header.',
      details: error instanceof Error ? error.message : 'Unknown server error',
    })
  }
})

app.get('/api/payments/summary', async (req, res) => {
  try {
    const requestedWeekIdentifier = String(req.query?.week_identifier || '').trim()
    const weekIdentifier =
      /^\d{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$/.test(requestedWeekIdentifier)
        ? requestedWeekIdentifier
        : getCurrentWeekIdentifier()

    const { data, error } = await supabaseAdmin
      .from('players')
      .select(
        'id, name, is_active, payments!left(id, player_id, amount, payment_date, week_identifier)',
      )
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      res.status(500).json({
        ok: false,
        error: 'Failed to load payment summary.',
        details: error.message,
      })
      return
    }

    const players = (data || []).map((player) => {
      const matchingPayment = (player.payments || []).find(
        (payment) => payment.week_identifier === weekIdentifier,
      )
      const isPaid = Boolean(matchingPayment && Number(matchingPayment.amount || 0) >= weeklyFee)

      return {
        id: player.id,
        name: player.name,
        isPaid,
        amount: isPaid ? Number(matchingPayment.amount) : 0,
        paymentDate: matchingPayment?.payment_date || null,
        weekIdentifier,
      }
    })

    const paidCount = players.filter((player) => player.isPaid).length

    res.json({
      ok: true,
      weekIdentifier,
      summary: {
        totalPlayers: players.length,
        paidPlayers: paidCount,
        pendingPlayers: players.length - paidCount,
        totalCollected: players.reduce((sum, player) => sum + player.amount, 0),
        weeklyFee,
      },
      players,
    })
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: 'Unexpected error while building payment summary.',
      details: error instanceof Error ? error.message : 'Unknown server error',
    })
  }
})

app.post('/api/payments/record', async (req, res) => {
  try {
    const playerId = req.body?.playerId
    const weekIdentifier = String(req.body?.weekIdentifier || getCurrentWeekIdentifier())
    const amount = Number(req.body?.amount || weeklyFee)

    if (!playerId) {
      res.status(400).json({ ok: false, error: 'playerId is required.' })
      return
    }

    if (!/^\d{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$/.test(weekIdentifier)) {
      res.status(400).json({ ok: false, error: 'Invalid weekIdentifier format.' })
      return
    }

    const { data, error } = await supabaseAdmin
      .from('payments')
      .upsert(
        {
          player_id: playerId,
          amount,
          payment_date: new Date().toISOString().slice(0, 10),
          week_identifier: weekIdentifier,
        },
        { onConflict: 'player_id,week_identifier' },
      )
      .select('id, player_id, amount, payment_date, week_identifier')
      .single()

    if (error) {
      res.status(500).json({ ok: false, error: error.message || 'Failed to record payment.' })
      return
    }

    res.status(201).json({
      ok: true,
      message: 'Payment recorded successfully.',
      payment: data,
    })
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: 'Unexpected error while recording payment.',
      details: error instanceof Error ? error.message : 'Unknown server error',
    })
  }
})

app.delete('/api/payments/record', async (req, res) => {
  try {
    const playerId = req.body?.playerId
    const weekIdentifier = String(req.body?.weekIdentifier || getCurrentWeekIdentifier())

    if (!playerId) {
      res.status(400).json({ ok: false, error: 'playerId is required.' })
      return
    }

    const { error } = await supabaseAdmin
      .from('payments')
      .delete()
      .match({ player_id: playerId, week_identifier: weekIdentifier })

    if (error) {
      res.status(500).json({ ok: false, error: error.message || 'Failed to remove payment.' })
      return
    }

    res.json({ ok: true, message: 'Payment unmarked successfully.' })
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Unexpected error.' })
  }
})

app.get('/api/players', async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('players')
    .select('id, name, is_active')
    .order('name', { ascending: true })

  if (error) {
    res.status(500).json({ ok: false, error: error.message || 'Failed to load players.' })
    return
  }

  res.json({
    ok: true,
    players: (data || []).map((player) => ({
      id: player.id,
      name: player.name,
      isActive: player.is_active === true,
    })),
  })
})

app.post('/api/players', async (req, res) => {
  const name = String(req.body?.name || '').trim()

  if (!name) {
    res.status(400).json({ ok: false, error: 'Player name is required.' })
    return
  }

  const { data, error } = await supabaseAdmin
    .from('players')
    .insert({
      name,
      is_active: true,
    })
    .select('id, name, is_active')
    .single()

  if (error) {
    res.status(500).json({ ok: false, error: error.message || 'Failed to add player.' })
    return
  }

  res.status(201).json({
    ok: true,
    player: {
      id: data.id,
      name: data.name,
      isActive: data.is_active === true,
    },
  })
})

app.patch('/api/players/:playerId/active', async (req, res) => {
  const playerId = String(req.params.playerId || '').trim()
  const isActive = req.body?.isActive

  if (!playerId) {
    res.status(400).json({ ok: false, error: 'playerId is required.' })
    return
  }

  if (typeof isActive !== 'boolean') {
    res.status(400).json({ ok: false, error: 'isActive boolean is required.' })
    return
  }

  const { data, error } = await supabaseAdmin
    .from('players')
    .update({ is_active: isActive })
    .eq('id', playerId)
    .select('id, name, is_active')
    .single()

  if (error) {
    res.status(500).json({ ok: false, error: error.message || 'Failed to update player status.' })
    return
  }

  res.json({
    ok: true,
    player: {
      id: data.id,
      name: data.name,
      isActive: data.is_active === true,
    },
  })
})

app.delete('/api/players/:playerId', async (req, res) => {
  const playerId = String(req.params.playerId || '').trim()

  if (!playerId) {
    res.status(400).json({ ok: false, error: 'playerId is required.' })
    return
  }

  const { error } = await supabaseAdmin
    .from('players')
    .delete()
    .eq('id', playerId)

  if (error) {
    res.status(500).json({ ok: false, error: error.message || 'Failed to delete player.' })
    return
  }

  res.json({ ok: true })
})

app.get('/api/public-dashboard', async (req, res) => {
  const weekQuery = req.query.week
  const weekNum = Number(weekQuery)
  const currentYear = new Date().getUTCFullYear()
  const weekIdentifier = Number.isInteger(weekNum) && weekNum > 0
    ? `${currentYear}-W${String(weekNum).padStart(2, '0')}`
    : String(weekQuery || getCurrentWeekIdentifier())

  const [playersResult, paymentsResult] = await Promise.all([
    supabaseAdmin.from('players').select('id, name').eq('is_active', true).order('name', { ascending: true }),
    supabaseAdmin
      .from('payments')
      .select('player_id, amount')
      .eq('week_identifier', weekIdentifier),
  ])

  if (playersResult.error || paymentsResult.error) {
    res.status(500).json({ error: 'Failed to load dashboard data.' })
    return
  }

  const paymentMap = new Map(
    (paymentsResult.data || []).map((payment) => [payment.player_id, Number(payment.amount || 0)]),
  )

  const players = (playersResult.data || []).map((player) => ({
    id: player.id,
    name: player.name,
    isPaid: (paymentMap.get(player.id) || 0) >= weeklyFee,
  }))

  res.json({ players, weeklyFee, weekIdentifier })
})

app.get('/api/admin-dashboard', async (req, res) => {
  const weekQuery = req.query.week
  const weekNum = Number(weekQuery)
  const currentYear = new Date().getUTCFullYear()
  const weekIdentifier = Number.isInteger(weekNum) && weekNum > 0
    ? `${currentYear}-W${String(weekNum).padStart(2, '0')}`
    : String(weekQuery || getCurrentWeekIdentifier())

  const [playersResult, paymentsResult] = await Promise.all([
    supabaseAdmin.from('players').select('id, name, is_active').eq('is_active', true).order('name', { ascending: true }),
    supabaseAdmin
      .from('payments')
      .select('player_id, amount')
      .eq('week_identifier', weekIdentifier),
  ])

  if (playersResult.error || paymentsResult.error) {
    res.status(500).json({ error: 'Failed to load admin data.' })
    return
  }

  const paymentStatusByPlayer = {}
  ;(paymentsResult.data || []).forEach((payment) => {
    paymentStatusByPlayer[payment.player_id] = Number(payment.amount || 0) >= weeklyFee
  })

  res.json({
    players: playersResult.data || [],
    paymentStatusByPlayer,
    weeklyFee,
    weekIdentifier,
  })
})

app.post('/api/admin/players', async (req, res) => {
  const name = String(req.body?.name || '').trim()

  if (!name) {
    res.status(400).json({ error: 'Player name is required.' })
    return
  }

  const { data, error } = await supabaseAdmin
    .from('players')
    .insert({ name, is_active: true })
    .select('id, name, is_active')
    .single()

  if (error) {
    res.status(500).json({ error: error.message || 'Failed to add player.' })
    return
  }

  res.status(201).json({ player: data })
})

app.post('/api/admin/payments/upsert', async (req, res) => {
  const playerId = req.body?.playerId
  const weekParam = req.body?.week || req.body?.weekIdentifier
  const isPaid = req.body?.isPaid === true

  if (!playerId) {
    res.status(400).json({ error: 'Invalid payment payload.' })
    return
  }

  const currentYear = new Date().getUTCFullYear()
  const weekIdentifier = typeof weekParam === 'number'
    ? `${currentYear}-W${String(weekParam).padStart(2, '0')}`
    : String(weekParam || getCurrentWeekIdentifier())

  if (isPaid) {
    const { error } = await supabaseAdmin.from('payments').upsert(
      {
        player_id: playerId,
        amount: weeklyFee,
        payment_date: new Date().toISOString().slice(0, 10),
        week_identifier: weekIdentifier,
      },
      { onConflict: 'player_id,week_identifier' },
    )
    if (error) {
      res.status(500).json({ error: error.message || 'Failed to update payment status.' })
      return
    }
  } else {
    const { error } = await supabaseAdmin.from('payments').delete().match({
      player_id: playerId,
      week_identifier: weekIdentifier,
    })
    if (error) {
      res.status(500).json({ error: error.message || 'Failed to update payment status.' })
      return
    }
  }

  res.json({ ok: true })
})

app.get('/api/transparency', async (req, res) => {
  try {
    const currentWeek = getCurrentWeekIdentifier()
    const selectedMonth = String(req.query.month || '').trim() // format 'YYYY-MM' or empty
    
    const [playersRes, expensesRes] = await Promise.all([
      supabaseAdmin
        .from('players')
        .select('id, name, payments!left(amount, payment_date, week_identifier)')
        .eq('is_active', true)
        .order('name', { ascending: true }),
      supabaseAdmin
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })
    ])

    if (playersRes.error) {
      res.status(500).json({ ok: false, error: 'Failed to load transparency summary.' })
      return
    }

    let allTimeCollected = 0
    let monthlyCollected = 0

    const players = (playersRes.data || []).map(player => {
      const allPayments = player.payments || []
      const hasPaidThisWeek = allPayments.some(p => p.week_identifier === currentWeek && Number(p.amount) >= weeklyFee)
      const totalContributed = allPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
      
      const monthPayments = selectedMonth
        ? allPayments.filter(p => p.payment_date && p.payment_date.startsWith(selectedMonth))
        : allPayments
      const monthlyContributed = monthPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)

      allTimeCollected += totalContributed
      monthlyCollected += monthlyContributed

      return {
        id: player.id,
        name: player.name,
        isPaidThisWeek: hasPaidThisWeek,
        totalContributed,
        monthlyContributed
      }
    })

    const allExpenses = expensesRes.data || []
    const allTimeSpent = allExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)
    
    const filteredExpenses = selectedMonth
      ? allExpenses.filter(e => e.expense_date && e.expense_date.startsWith(selectedMonth))
      : allExpenses
    const monthlySpent = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)

    const monthlyBalance = monthlyCollected - monthlySpent
    const netBalance = allTimeCollected - allTimeSpent

    res.json({
      ok: true,
      currentWeek,
      selectedMonth,
      totalCollected: selectedMonth ? monthlyCollected : allTimeCollected,
      totalSpent: selectedMonth ? monthlySpent : allTimeSpent,
      netBalance: selectedMonth ? monthlyBalance : netBalance,
      allTimeCollected,
      allTimeSpent,
      allTimeBalance: netBalance,
      monthlyCollected,
      monthlySpent,
      monthlyBalance,
      players,
      expenses: filteredExpenses
    })
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Unexpected error' })
  }
})

app.get('/api/expenses', async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false })

    if (error) {
      res.status(500).json({ ok: false, error: error.message || 'Failed to fetch expenses.' })
      return
    }

    const expenses = data || []
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)

    res.json({ ok: true, expenses, totalSpent })
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Unexpected error fetching expenses.' })
  }
})

app.post('/api/expenses', async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim()
    const category = String(req.body?.category || 'Equipment').trim()
    const amount = Number(req.body?.amount || 0)
    const expenseDate = String(req.body?.expenseDate || new Date().toISOString().slice(0, 10))
    const notes = String(req.body?.notes || '').trim()

    if (!title || amount <= 0) {
      res.status(400).json({ ok: false, error: 'Valid title and positive amount are required.' })
      return
    }

    const { data, error } = await supabaseAdmin
      .from('expenses')
      .insert({
        title,
        category,
        amount,
        expense_date: expenseDate,
        notes,
      })
      .select('*')
      .single()

    if (error) {
      res.status(500).json({ ok: false, error: error.message || 'Failed to record expense.' })
      return
    }

    res.status(201).json({ ok: true, expense: data })
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Unexpected error recording expense.' })
  }
})

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const expenseId = String(req.params.id || '').trim()
    if (!expenseId) {
      res.status(400).json({ ok: false, error: 'Expense ID required.' })
      return
    }

    const { error } = await supabaseAdmin
      .from('expenses')
      .delete()
      .eq('id', expenseId)

    if (error) {
      res.status(500).json({ ok: false, error: error.message || 'Failed to delete expense.' })
      return
    }

    res.json({ ok: true, message: 'Expense removed.' })
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Unexpected error deleting expense.' })
  }
})

app.get('/api/players/:playerId/payments', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('id, amount, payment_date, week_identifier')
      .eq('player_id', req.params.playerId)
      .order('payment_date', { ascending: false })

    if (error) {
      res.status(500).json({ ok: false, error: error.message || 'Failed to load history' })
      return
    }
    res.json({ ok: true, payments: data || [] })
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Unexpected error getting history' })
  }
})

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    const indexPath = path.join(clientDistPath, 'index.html')
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath)
    }
  }
  next()
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
