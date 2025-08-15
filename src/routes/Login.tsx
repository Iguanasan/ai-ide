// src/routes/Login.tsx
import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';

const Login: React.FC = () => {
  const { signInWithPassword, signUpWithPassword, user } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation() as any;

  React.useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      if (isLogin) {
        await signInWithPassword(email, password);
      } else {
        await signUpWithPassword(email, password);
      }
      const dest = location.state?.from?.pathname || '/';
      navigate(dest, { replace: true });
    } catch (e: any) {
      setErr(e?.message || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold mb-4">{isLogin ? 'Sign in' : 'Create account'}</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700">Email</span>
            <input
              className="mt-1 w-full border rounded p-2"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700">Password</span>
            <input
              className="mt-1 w-full border rounded p-2"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {err && <div className="text-sm text-red-600 bg-red-100 p-2 rounded">{err}</div>}
          <button type="submit" className="w-full rounded bg-blue-600 text-white py-2">
            {isLogin ? 'Sign in' : 'Sign up'}
          </button>
        </form>
        <div className="mt-4 text-sm">
          {isLogin ? (
            <button className="text-blue-600 hover:underline" onClick={() => setIsLogin(false)}>
              Need an account? Sign up
            </button>
          ) : (
            <button className="text-blue-600 hover:underline" onClick={() => setIsLogin(true)}>
              Already have an account? Sign in
            </button>
          )}
        </div>
        <div className="mt-6 text-xs text-gray-500">
          <Link to="/">Back to App</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
