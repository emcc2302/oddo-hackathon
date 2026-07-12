import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

const DEMO_ACCOUNTS = [
    { role: 'Fleet Manager', email: 'fleet.manager@transitops.io' },
    { role: 'Driver', email: 'driver@transitops.io' },
    { role: 'Safety Officer', email: 'safety.officer@transitops.io' },
    { role: 'Financial Analyst', email: 'analyst@transitops.io' },
];

export default function Login() {
    const { user, login, loading, error } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('TransitOps@123');

    if (user) return <Navigate to="/" replace />;

    const handleSubmit = async (e) => {
        e.preventDefault();
        await login(email, password);
    };

    return (
        <div className="min-h-screen bg-paper dark:bg-ink flex flex-col md:flex-row">
            <div className="absolute top-5 right-5">
                <ThemeToggle />
            </div>

            {/* Left: departure-board hero */}
            <div className="hidden md:flex md:w-1/2 bg-ink dark:bg-ink-raised text-paper flex-col justify-between p-12 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.06]" style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, #F5F3EE 39px, #F5F3EE 40px)'
                }} />
                <div className="relative">
                    <div className="flex items-center gap-2 mb-16">
                        <div className="w-9 h-9 rounded bg-signal-transit flex items-center justify-center font-display font-bold">T</div>
                        <span className="font-display font-semibold text-lg">TransitOps</span>
                    </div>
                    <div className="board-eyebrow text-paper/50 mb-3">Live Fleet Board — Kolkata Depot</div>
                    <div className="space-y-2 font-mono text-sm">
                        {[
                            ['WB-05-AB-1201', 'Kolkata → Durgapur', 'DISPATCHED'],
                            ['WB-07-EF-3321', 'Kolkata → Asansol', 'ON TIME'],
                            ['WB-08-GH-9090', 'In Shop — Oil Change', 'HOLDING'],
                            ['WB-06-CD-7788', 'Kolkata → Howrah', 'BOARDING'],
                        ].map(([reg, route, tag]) => (
                            <div key={reg} className="flex items-center justify-between border-b border-paper/10 py-2.5">
                                <span className="text-paper/70">{reg}</span>
                                <span className="text-paper/50 flex-1 px-4 truncate hidden lg:block">{route}</span>
                                <span className="text-signal-transit">{tag}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <p className="relative text-paper/45 text-sm max-w-sm">
                    One board for vehicles, drivers, dispatch, maintenance, and cost — replacing the spreadsheet stack.
                </p>
            </div>

            {/* Right: login form */}
            <div className="flex-1 flex items-center justify-center p-6 md:p-12">
                <div className="w-full max-w-sm">
                    <div className="md:hidden flex items-center gap-2 mb-10">
                        <div className="w-9 h-9 rounded bg-signal-transit flex items-center justify-center text-white font-display font-bold">T</div>
                        <span className="font-display font-semibold text-lg">TransitOps</span>
                    </div>

                    <h2 className="font-display font-semibold text-2xl mb-1">Sign in to the board</h2>
                    <p className="text-sm text-ink/55 dark:text-paper/55 mb-8">
                        Access vehicles, dispatch, and cost data for your depot.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="board-eyebrow block mb-1.5">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@transitops.io"
                                className="input-field"
                            />
                        </div>
                        <div>
                            <label className="board-eyebrow block mb-1.5">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field"
                            />
                        </div>

                        {error && (
                            <div className="text-sm text-signal-alert bg-signal-alert/10 border border-signal-alert/30 rounded-md px-3 py-2">
                                {error}
                            </div>
                        )}

                        <button type="submit" disabled={loading} className="btn-primary w-full">
                            {loading ? 'Signing in…' : 'Sign in'}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-paper-line dark:border-ink-line">
                        <div className="board-eyebrow mb-2.5">Demo accounts · password TransitOps@123</div>
                        <div className="grid grid-cols-2 gap-1.5">
                            {DEMO_ACCOUNTS.map((acc) => (
                                <button
                                    key={acc.email}
                                    type="button"
                                    onClick={() => setEmail(acc.email)}
                                    className="text-left text-xs px-2.5 py-2 rounded-md border border-paper-line dark:border-ink-line hover:border-signal-transit hover:text-signal-transit transition-colors"
                                >
                                    {acc.role}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}