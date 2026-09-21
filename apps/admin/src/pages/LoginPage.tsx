import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, TextInput } from '@era/ui';
import { useAuth } from '../store/auth';
import logo from 'figma:asset/d35bb1cd7b17aae1ece93ea47adf754effd39a17.png';

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const err = await login(email, password);
    setSubmitting(false);
    if (err) setError(err);
    else nav('/', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#001F5B] to-[#8B0A1C] p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <img src={logo} alt="ERA Cambodia" className="mx-auto mb-6 h-28 w-auto drop-shadow-sm" />
        <h1 className="text-center text-lg font-bold text-[var(--era-navy)]">Back Office</h1>
        <p className="mb-6 text-center text-sm text-gray-500">Sign in to continue</p>

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Email</span>
            <TextInput
              className="mt-1"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@eracambodia.com"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Password</span>
            <TextInput
              className="mt-1"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>
          {error && <p className="text-sm text-[var(--era-red)]">{error}</p>}
          <Button className="w-full" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
