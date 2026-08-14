import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';

export default function Navbar() {
    const { user, logout } = useAuth();
    const { name } = useBusiness();
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);

    function handleLogout() {
        setOpen(false);
        logout();
        navigate('/');
    }

    const isAdmin = user?.roles.includes('ADMIN');
    const isEmployee = user?.roles.includes('EMPLOYEE') && !isAdmin;
    const isPureCustomer = user && !isAdmin && !isEmployee;
    const firstName = user?.fullName.split(' ')[0];

    // ── Links ανά ρόλο, οριζόμενα ΜΙΑ φορά (όχι διπλά desktop/mobile) ──
    // { to, label, primary? } — primary = το CTA κουμπί (Κράτηση/Σύνδεση).
    let links = [];
    if (!user) {
        links = [
            { to: '/', label: 'Αρχική' },
            { to: '/login', label: 'Σύνδεση', primary: true },
        ];
    } else if (isPureCustomer) {
        links = [
            { to: '/', label: 'Αρχική' },
            { to: '/appointments', label: 'Τα ραντεβού μου' },
            { to: '/book', label: 'Κράτηση', primary: true },
        ];
    } else if (isEmployee) {
        links = [
            { to: '/employee', label: 'Το πρόγραμμά μου' },
            { to: '/appointments', label: 'Τα ραντεβού μου' },
            { to: '/book', label: 'Κράτηση', primary: true },
        ];
    } else if (isAdmin) {
        links = [
            { to: '/admin/appointments', label: 'Ραντεβού' },
            { to: '/admin/catalog', label: 'Υπηρεσίες' },
            { to: '/admin/employees', label: 'Υπάλληλοι' },
            { to: '/admin/customers', label: 'Πελάτες' },
            { to: '/admin/dashboard', label: 'Στατιστικά' },
            { to: '/admin/settings', label: 'Ρυθμίσεις' },
        ];
        if (user.roles.includes('EMPLOYEE')) {
            links.push({ to: '/employee', label: 'Το πρόγραμμά μου' });
        }
    }

    const isActive = (to) => location.pathname === to;

    // Ένα link — desktop ή mobile (διαφορετικό styling μέσω `mobile` flag).
    function NavItem({ link, mobile }) {
        if (link.primary) {
            return (
                <Link
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className={`bg-blue text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-soft transition-colors ${mobile ? 'block text-center' : ''}`}
                >
                    {link.label}
                </Link>
            );
        }
        return (
            <Link
                to={link.to}
                onClick={() => setOpen(false)}
                className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                    isActive(link.to)
                        ? 'text-blue bg-blue-tint'
                        : 'text-slate/70 hover:bg-page hover:text-slate'
                } ${mobile ? 'block' : ''}`}
            >
                {link.label}
            </Link>
        );
    }

    return (
        <nav className="bg-white border-b border-slate/10 px-4 sm:px-6 py-3 relative">
            <div className="max-w-5xl mx-auto flex items-center justify-between">

                {/* Λογότυπο = όνομα μαγαζιού */}
                <Link
                    to="/"
                    onClick={() => setOpen(false)}
                    className="text-xl font-semibold text-slate tracking-tight truncate max-w-[60%] md:max-w-none"
                >
                    {name}
                </Link>

                {/* ── DESKTOP (≥ md) ── */}
                <div className="hidden md:flex items-center gap-2 lg:gap-3">
                    {links.map((link) => (
                        <NavItem key={link.to} link={link} mobile={false} />
                    ))}
                    {user && (
                        <>
                            <span className="h-6 w-px bg-slate/15 mx-1" />
                            <span className="text-slate text-sm font-medium">{firstName}</span>
                            <button
                                onClick={handleLogout}
                                className="text-slate/70 text-sm font-medium border border-slate/20 rounded-lg px-3 py-1.5 hover:bg-danger-tint hover:text-danger hover:border-danger/30 transition-colors"
                            >
                                Έξοδος
                            </button>
                        </>
                    )}
                </div>

                {/* ── MOBILE: hamburger (< md) ── */}
                <button
                    onClick={() => setOpen((o) => !o)}
                    className="md:hidden p-2 rounded-lg text-slate/70 hover:bg-page transition-colors"
                    aria-label="Μενού"
                >
                    {open ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {/* ── MOBILE dropdown ── */}
            {open && (
                <div className="md:hidden absolute left-0 right-0 top-full bg-white border-b border-slate/10 shadow-lg z-50">
                    <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-1">
                        {links.map((link) => (
                            <NavItem key={link.to} link={link} mobile={true} />
                        ))}
                        {user && (
                            <>
                                <div className="h-px bg-slate/10 my-2" />
                                <span className="text-slate/60 text-sm px-3 py-1">
                                    Συνδεδεμένος ως {firstName}
                                </span>
                                <button
                                    onClick={handleLogout}
                                    className="text-left text-slate/70 text-sm font-medium border border-slate/20 rounded-lg px-3 py-2 hover:bg-danger-tint hover:text-danger hover:border-danger/30 transition-colors"
                                >
                                    Έξοδος
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}