import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function Login({ onLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); 
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Please enter both email/username and password');
      setLoading(false);
      return;
    }

    setTimeout(() => {
      const user = { name: email, role: 'User' };
      localStorage.setItem('user', JSON.stringify(user));
      onLogin(user);
      setLoading(false);
    }, 1000);
  };

  const handleEmailLink = () => {
    alert('Email link login feature coming soon!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo & Title */}
        <div className="flex flex-col items-center mb-5">
          <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">CRM</span>
          </div>
          <h1 className="mt-3 text-xl font-semibold text-gray-800">Auto CRM</h1>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/70 p-6">
          <form onSubmit={handleLogin}>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Email */}
            <div className="mb-4 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email or Username"
                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-black outline-none transition"
              />
            </div>

            {/* Password */}
<div className="mb-4 relative">
  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
  
  <input
    type={showPassword ? 'text' : 'password'}
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    placeholder="Password"
    autoComplete="new-password"   // Prevent browser autofill eye
    name="password"                // Optional, ensures browser sees it as new password
    className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-black outline-none transition"
  />

  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 flex items-center justify-center"
  >
    
  </button>
</div>


            <div className="text-right mb-4">
              <a href="#" className="text-xs text-gray-500 hover:text-gray-700">
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="relative my-5">
            <div className="border-t border-gray-200"></div>
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-xs text-gray-400">or</span>
          </div>

          <button
            onClick={handleEmailLink}
            className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition"
          >
            Login with Email Link
          </button>
        </div>
      </div>
    </div>
  );
}
