const mockUser = {
  id: 'mock-admin-id',
  email: 'admin@cricket.com',
  user_metadata: { name: 'Admin User' }
}

const mockSession = {
  user: mockUser,
  access_token: 'mock-token-12345',
}

class MockAuth {
  constructor() {
    this.listeners = []
    const savedSession = localStorage.getItem('mock_supabase_session')
    this.session = savedSession ? JSON.parse(savedSession) : null
  }

  async getSession() {
    return { data: { session: this.session }, error: null }
  }

  onAuthStateChange(callback) {
    this.listeners.push(callback)
    callback('SIGNED_IN', this.session)
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners = this.listeners.filter(l => l !== callback)
          }
        }
      }
    }
  }

  async signInWithPassword({ email, password }) {
    if (email === 'admin@cricket.com' && password === 'admin123') {
      this.session = mockSession
      localStorage.setItem('mock_supabase_session', JSON.stringify(mockSession))
      this.listeners.forEach(l => l('SIGNED_IN', this.session))
      return { data: { user: mockUser, session: mockSession }, error: null }
    } else {
      return {
        data: { user: null, session: null },
        error: { message: 'Invalid credentials. Use admin@cricket.com / admin123' }
      }
    }
  }

  async signOut() {
    this.session = null
    localStorage.removeItem('mock_supabase_session')
    this.listeners.forEach(l => l('SIGNED_OUT', null))
    return { error: null }
  }
}

const supabase = {
  auth: new MockAuth()
}

export default supabase

