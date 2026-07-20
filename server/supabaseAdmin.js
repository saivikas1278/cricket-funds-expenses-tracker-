import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

console.log('[supabaseAdmin] Initializing mock Supabase admin client...')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, 'db.json')

function readDb() {
  if (!fs.existsSync(dbPath)) {
    const initialData = {
      players: [
        { id: "1ae62c19-1234-4567-89ab-cdef11111111", name: "Rohit Sharma", is_active: true, created_at: new Date().toISOString() },
        { id: "2ae62c19-1234-4567-89ab-cdef22222222", name: "Virat Kohli", is_active: true, created_at: new Date().toISOString() },
        { id: "3ae62c19-1234-4567-89ab-cdef33333333", name: "KL Rahul", is_active: true, created_at: new Date().toISOString() },
        { id: "4ae62c19-1234-4567-89ab-cdef44444444", name: "Jasprit Bumrah", is_active: true, created_at: new Date().toISOString() },
        { id: "5ae62c19-1234-4567-89ab-cdef55555555", name: "Ravindra Jadeja", is_active: true, created_at: new Date().toISOString() },
        { id: "6ae62c19-1234-4567-89ab-cdef66666666", name: "Mohammed Siraj", is_active: true, created_at: new Date().toISOString() }
      ],
      payments: [],
      expenses: []
    }
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2))
    return initialData
  }
  const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'))
  if (!data.expenses) data.expenses = []
  return data
}

function writeDb(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2))
}

class QueryBuilder {
  constructor(table) {
    this.table = table
    this.db = readDb()
    this.data = JSON.parse(JSON.stringify(this.db[table] || []))
    this.error = null
    this.isSingle = false
    this.isInsert = false
    this.isUpdate = false
    this.isUpsert = false
    this.isDelete = false
    this.payload = null
    this.selectedFields = '*'
  }

  select(fields) {
    this.selectedFields = fields || '*'
    return this
  }

  insert(payload) {
    this.isInsert = true
    this.payload = payload
    return this
  }

  update(payload) {
    this.isUpdate = true
    this.payload = payload
    return this
  }

  upsert(payload, options) {
    this.isUpsert = true
    this.payload = payload
    this.upsertOptions = options
    return this
  }

  delete() {
    this.isDelete = true
    return this
  }

  eq(field, value) {
    if (this.error) return this
    this.data = this.data.filter(item => {
      return item[field] === value
    })
    return this
  }

  match(obj) {
    if (this.error) return this
    this.data = this.data.filter(item => {
      for (const key in obj) {
        if (item[key] !== obj[key]) return false
      }
      return true
    })
    return this
  }

  order(field, { ascending = true } = {}) {
    if (this.error) return this
    this.data.sort((a, b) => {
      const valA = a[field]
      const valB = b[field]
      if (valA < valB) return ascending ? -1 : 1
      if (valA > valB) return ascending ? 1 : -1
      return 0
    })
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  async then(resolve, reject) {
    try {
      const result = await this.execute()
      resolve(result)
    } catch (err) {
      resolve({ data: null, error: err })
    }
  }

  async execute() {
    const db = readDb()
    let currentTableData = db[this.table] || []

    if (this.isInsert) {
      const records = Array.isArray(this.payload) ? this.payload : [this.payload]
      const inserted = []
      for (const rec of records) {
        const newRec = {
          id: rec.id || crypto.randomUUID(),
          created_at: new Date().toISOString(),
          ...rec
        }
        if (this.table === 'players') {
          if (currentTableData.some(p => p.name === newRec.name)) {
            return { data: null, error: { message: `Player with name ${newRec.name} already exists.` } }
          }
        }
        currentTableData.push(newRec)
        inserted.push(newRec)
      }
      db[this.table] = currentTableData
      writeDb(db)
      
      const formatted = Array.isArray(this.payload) 
        ? inserted.map(item => this.formatFields(item))
        : this.formatFields(inserted[0])
      return { data: formatted, error: null }
    }

    if (this.isUpdate) {
      const matchingIds = this.data.map(item => item.id)
      const updated = []
      currentTableData = currentTableData.map(item => {
        if (matchingIds.includes(item.id)) {
          const updatedItem = { ...item, ...this.payload }
          updated.push(updatedItem)
          return updatedItem
        }
        return item
      })
      db[this.table] = currentTableData
      writeDb(db)
      
      const formatted = updated.map(item => this.formatFields(item))
      return { data: this.isSingle ? formatted[0] : formatted, error: null }
    }

    if (this.isUpsert) {
      const rec = this.payload
      const conflictKeys = (this.upsertOptions && this.upsertOptions.onConflict) 
        ? this.upsertOptions.onConflict.split(',').map(s => s.trim()) 
        : ['id']
      
      const index = currentTableData.findIndex(item => {
        return conflictKeys.every(k => item[k] === rec[k])
      })

      let resultRec
      if (index !== -1) {
        currentTableData[index] = { ...currentTableData[index], ...rec }
        resultRec = currentTableData[index]
      } else {
        resultRec = {
          id: rec.id || crypto.randomUUID(),
          created_at: new Date().toISOString(),
          ...rec
        }
        currentTableData.push(resultRec)
      }
      db[this.table] = currentTableData
      writeDb(db)
      
      const formatted = this.formatFields(resultRec)
      return { data: formatted, error: null }
    }

    if (this.isDelete) {
      const matchingIds = this.data.map(item => item.id)
      db[this.table] = currentTableData.filter(item => !matchingIds.includes(item.id))
      writeDb(db)
      return { data: null, error: null }
    }

    // SELECT query
    let result = this.data

    if (this.selectedFields !== '*') {
      result = result.map(item => this.formatFields(item, db))
    }

    if (this.isSingle) {
      return { data: result[0] || null, error: result.length === 0 ? { message: 'Not found' } : null }
    }

    return { data: result, error: null }
  }

  formatFields(item, db = readDb()) {
    if (this.selectedFields === '*') return item
    
    // Parse selectedFields
    const fields = []
    let current = ''
    let depth = 0
    for (let i = 0; i < this.selectedFields.length; i++) {
      const char = this.selectedFields[i]
      if (char === ',' && depth === 0) {
        fields.push(current.trim())
        current = ''
      } else {
        current += char
        if (char === '(') depth++
        if (char === ')') depth--
      }
    }
    if (current.trim()) fields.push(current.trim())

    const mapped = {}
    for (const f of fields) {
      if (f.startsWith('payments')) {
        const paymentsData = db['payments'] || []
        const playerPayments = paymentsData.filter(p => p.player_id === item.id)
        
        const match = f.match(/\(([^)]+)\)/)
        const subfields = match ? match[1].split(',').map(s => s.trim()) : ['*']
        
        mapped.payments = playerPayments.map(p => {
          if (subfields.includes('*')) return p
          const submapped = {}
          for (const sf of subfields) {
            submapped[sf] = p[sf]
          }
          return submapped
        })
      } else {
        mapped[f] = item[f]
      }
    }
    return mapped
  }
}

export const supabaseAdmin = {
  from: (table) => new QueryBuilder(table)
}

