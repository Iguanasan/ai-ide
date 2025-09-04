// src/routes/Login.tsx
import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';

const Login: React.FC = () => {
  const { signInWithPassword, signUpWithPassword, user } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation() as any;

  React.useEffect(() => { if (user) navigate('/', { replace: true }); }, [user, navigate]);

  const disabled = useMemo(() => !email || !password, [email, password]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      if (isLogin) await signInWithPassword(email, password);
      else await signUpWithPassword(email, password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (e: any) {
      setErr(e?.message || 'Authentication failed.');
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 px-4">
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl shadow-lg border border-gray-200 bg-white overflow-hidden">
          <div className="px-6 py-7">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">AI Toolbox</h1>
              <p className="text-gray-500 text-sm">Tools for the AI Enthusiast</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isLogin ? "your.name@business.com" : "email@yourdomain.com"}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  type="password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">{err}</div>}

              <button
                type="submit"
                disabled={disabled}
                className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 text-white py-2.5 font-medium disabled:opacity-40"
              >
                {isLogin ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <div className="mt-4 text-sm text-center">
              {isLogin ? (
                <button className="text-sky-600 hover:underline" onClick={() => setIsLogin(false)}>
                  Need an account? Sign up
                </button>
              ) : (
                <button className="text-sky-600 hover:underline" onClick={() => setIsLogin(true)}>
                  Already have an account? Sign in
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
