import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import Avatar from '../components/Avatar';
import RatingBadge from '../components/RatingBadge';
import EmployeeProfileModal from '../components/EmployeeProfileModal';

export default function TeamPage() {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [profileEmployee, setProfileEmployee] = useState(null);

    useEffect(() => {
        // /employees (ΟΛΟΙ οι ενεργοί) — ΟΧΙ /employees/available (φιλτράρει ανά υπηρεσία).
        api.get('/employees')
            .then(setEmployees)
            .catch(() => setError('Δεν ήταν δυνατή η φόρτωση της ομάδας.'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="max-w-5xl mx-auto px-4 py-10">
            <h1 className="text-3xl font-bold text-slate">Η ομάδα μας</h1>
            <p className="text-slate/60 mt-1 mb-8">
                Γνώρισε τους επαγγελματίες μας και δες τι λένε οι πελάτες τους.
            </p>

            {loading && <p className="text-slate/60 text-center py-12">Φόρτωση...</p>}

            {error && <div className="bg-danger-tint text-danger rounded-xl px-4 py-3">{error}</div>}

            {!loading && !error && employees.length === 0 && (
                <p className="bg-white border border-slate/10 rounded-xl px-4 py-8 text-center text-slate/60">
                    Δεν υπάρχουν διαθέσιμα μέλη ομάδας.
                </p>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {employees.map((emp) => (
                    <div
                        key={emp.id}
                        className="bg-white border border-slate/10 rounded-2xl p-6 flex flex-col items-center text-center hover:shadow-lg transition-shadow"
                    >
                        <Avatar
                            name={emp.fullName}
                            photoUrl={emp.photoUrl}
                            size="w-24 h-24"
                            textSize="text-2xl"
                        />
                        <p className="text-slate font-semibold text-lg mt-4">{emp.fullName}</p>
                        <RatingBadge average={emp.averageRating} count={emp.reviewCount} />

                        {emp.bio && (
                            <p className="text-slate/60 text-sm mt-3 leading-relaxed">{emp.bio}</p>
                        )}

                        <button
                            onClick={() => setProfileEmployee(emp)}
                            className="mt-auto pt-5 inline-flex items-center gap-1.5 text-sm font-medium text-blue hover:underline"
                        >
                            <MessageSquare size={15} /> Κριτικές
                        </button>
                    </div>
                ))}
            </div>

            {!loading && employees.length > 0 && (
                <div className="text-center mt-12">
                    <button
                        onClick={() => navigate('/book')}
                        className="inline-flex items-center gap-2 bg-blue text-white rounded-xl px-6 py-3 font-medium hover:bg-blue-soft transition-colors"
                    >
                        Κλείσε ραντεβού <ArrowRight size={18} />
                    </button>
                </div>
            )}

            {profileEmployee && (
                <EmployeeProfileModal
                    employee={profileEmployee}
                    onClose={() => setProfileEmployee(null)}
                />
            )}
        </div>
    );
}