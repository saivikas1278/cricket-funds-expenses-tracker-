import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock } from 'lucide-react';
import supabase from '../supabaseClient';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    } else {
      navigate('/admin');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh] bg-flatSecondary">
      <div className="bg-white p-10 rounded-2xl border-2 border-slate-200 w-full max-w-md">
        <h2 className="text-3xl font-black text-slate-800 text-center mb-2">Admin Login</h2>
        <p className="text-slate-500 text-center font-medium mb-8">Access the protected dashboard</p>

        {error && (
          <div className="bg-red-50 text-red-600 font-bold p-4 rounded-lg border-2 border-red-200 mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User className="h-6 w-6 text-slate-400 stroke-[2.5]" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Admin Email"
              required
              className="w-full pl-12 pr-4 py-4 text-lg bg-flatBg border-2 border-slate-300 rounded-xl outline-none focus:border-cricketGreen text-slate-800 placeholder-slate-400 font-medium transition-colors"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-6 w-6 text-slate-400 stroke-[2.5]" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full pl-12 pr-4 py-4 text-lg bg-flatBg border-2 border-slate-300 rounded-xl outline-none focus:border-cricketGreen text-slate-800 placeholder-slate-400 font-medium transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-cricketGreen hover:bg-[#225039] text-white rounded-xl text-xl font-bold transition-colors"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
