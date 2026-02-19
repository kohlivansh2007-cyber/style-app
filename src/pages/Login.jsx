import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth'

export default function Login() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (user) {
    navigate('/dashboard')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
    } else {
      navigate('/dashboard')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="max-w-md w-full px-8 py-10 rounded-2xl border border-black/10 bg-white/80 shadow-sm">
        <div className="mb-8 flex flex-col items-center">
          <img
            src="/logo.png"
            alt=""
            className="h-10 w-10 object-contain mb-3"
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
          <p className="text-xs tracking-[0.35em] uppercase text-charcoal/60 mb-2">
            Stylist access
          </p>
          <h1 className="text-2xl font-light tracking-[0.2em] text-black">
            Peak Perfection
          </h1>
          <p className="mt-3 text-sm text-charcoal/70 text-center">
            Private dashboard for the styling team.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-medium tracking-[0.25em] uppercase text-charcoal/80">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm text-black placeholder:text-charcoal/50 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition"
              placeholder="stylist@brand.com"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium tracking-[0.25em] uppercase text-charcoal/80">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg bg-cream border border-black/15 px-4 py-2.5 text-sm text-black placeholder:text-charcoal/50 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-charcoal text-cream text-sm font-medium tracking-[0.2em] uppercase py-3 hover:bg-charcoal/90 disabled:opacity-70 transition"
          >
            {loading ? 'Signing in…' : 'Enter Dashboard'}
          </button>
        </form>

        <div className="mt-6 text-[11px] text-charcoal/50 text-center">
          Supabase email/password auth. Accounts are managed internally.
        </div>
      </div>
    </div>
  )
}
