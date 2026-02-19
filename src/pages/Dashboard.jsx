import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  useEffect(() => {
    async function fetchClients() {
      if (!user) return
      setLoading(true)
      setError('')

      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .eq('stylist_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) {
        setError('Unable to load clients right now.')
      } else {
        setClients(data || [])
      }

      setLoading(false)
    }

    fetchClients()
  }, [user])

  return (
    <div className="min-h-screen bg-cream text-black">
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-black/8 bg-cream/98 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src="/logo.png"
                alt=""
                className="h-10 w-10 object-contain flex-shrink-0"
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
              <span className="text-base font-medium tracking-[0.12em] text-black antialiased">
                Peak Perfection
              </span>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <div className="text-right text-xs text-charcoal/80">
                  <p className="font-medium text-black">
                    {user.email ?? 'Stylist'}
                  </p>
                  <p className="text-charcoal/60">Signed in</p>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="rounded-lg border border-charcoal/20 px-4 py-2 text-xs tracking-[0.18em] uppercase text-charcoal bg-white/80 hover:bg-charcoal/5 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xs tracking-[0.35em] uppercase text-charcoal/60 mb-2">
                  Overview
                </p>
                <h1 className="text-3xl md:text-4xl font-light tracking-[0.18em] text-black">
                  Stylist Dashboard
                </h1>
                <p className="mt-3 text-sm text-charcoal/70 max-w-xl">
                  Manage your private client portfolio in a focused, minimal
                  workspace.
                </p>
              </div>
              <button
                onClick={() => navigate('/clients/new')}
                className="self-start rounded-lg border border-charcoal/30 bg-charcoal text-cream text-xs font-medium tracking-[0.2em] uppercase px-6 py-3 hover:bg-charcoal/90 transition"
              >
                New Client
              </button>
            </div>

            <section className="border border-black/10 rounded-2xl bg-white/60 px-6 md:px-8 py-7 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm tracking-[0.25em] uppercase text-charcoal">
                    Client List
                  </h2>
                  <p className="mt-1 text-xs text-charcoal/60">
                    Snapshot of current styling clients.
                  </p>
                </div>
                <span className="text-[11px] text-charcoal/50">
                  {clients.length} client{clients.length === 1 ? '' : 's'}
                </span>
              </div>

              {error && (
                <div className="mb-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="py-10 text-center text-xs text-charcoal/50">
                  Loading clients…
                </div>
              ) : clients.length === 0 ? (
                <div className="py-10 text-center text-xs text-charcoal/50">
                  No clients yet. Start by adding a new client.
                </div>
              ) : (
                <ul className="space-y-3">
                  {clients.map((client) => (
                    <li
                      key={client.id}
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        navigate(`/clients/${client.id}/consultation`)
                      }
                      onKeyDown={(e) =>
                        e.key === 'Enter' &&
                        navigate(`/clients/${client.id}/consultation`)
                      }
                      className="group border border-black/10 rounded-2xl bg-white/80 px-4 py-3 flex items-center justify-between hover:border-gold hover:bg-white transition cursor-pointer"
                    >
                      <div>
                        <p className="text-sm font-medium tracking-[0.12em] uppercase text-black">
                          {client.name}
                        </p>
                        <p className="mt-1 text-[11px] text-charcoal/60">
                          {client.gender || client.profession || 'Client'} ·{' '}
                          {client.created_at
                            ? new Date(client.created_at).toLocaleDateString()
                            : ''}
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-charcoal/50">
                        <span className="text-gold group-hover:text-charcoal">
                          Open consultation →
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
