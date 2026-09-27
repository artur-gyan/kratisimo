import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import StarRow from '../components/StarRow';
import { formatReviewDate } from '../utils/formatDate';

export default function ReviewsPage() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // Ένα request: σύνοψη μαγαζιού + 20 πρόσφατες (ShopRatingResponse).
        api.get('/reviews/recent')
            .then(setData)
            .catch(() => setError('Δεν ήταν δυνατή η φόρτωση των κριτικών.'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="max-w-3xl mx-auto px-4 py-12 text-center text-slate/60">Φόρτωση...</div>;
    }

    if (error) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-12">
                <div className="bg-danger-tint text-danger rounded-xl px-4 py-3">{error}</div>
            </div>
        );
    }

    const { averageRating, reviewCount, recentReviews } = data;

    return (
        <div className="max-w-3xl mx-auto px-4 py-10">
            <h1 className="text-3xl font-bold text-slate">Κριτικές</h1>
            <p className="text-slate/60 mt-1 mb-8">Τι λένε οι πελάτες μας.</p>

            {/* Σύνοψη */}
            <div className="bg-white border border-slate/10 rounded-2xl p-6 flex items-center gap-6 mb-8">
                {averageRating === null ? (
                    <p className="text-slate/60">Δεν υπάρχουν ακόμα κριτικές.</p>
                ) : (
                    <>
                        <span className="text-5xl font-bold text-slate">{averageRating.toFixed(1)}</span>
                        <div>
                            <StarRow rating={averageRating} size={20} />
                            <p className="text-slate/60 text-sm mt-1">
                                από {reviewCount} {reviewCount === 1 ? 'κριτική' : 'κριτικές'}
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* Λίστα */}
            <div className="space-y-3">
                {recentReviews.map((r) => (
                    <div key={r.id} className="bg-white border border-slate/10 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-2">
                            <StarRow rating={r.rating} />
                            <span className="text-slate/40 text-xs">{formatReviewDate(r.createdAt)}</span>
                        </div>
                        {r.comment && <p className="text-slate/80">{r.comment}</p>}
                        <p className="text-slate/50 text-sm mt-2">Εξυπηρέτηση: {r.employeeName}</p>
                    </div>
                ))}
            </div>

            {reviewCount > recentReviews.length && (
                <p className="text-slate/40 text-sm text-center mt-6">
                    Εμφανίζονται οι {recentReviews.length} πιο πρόσφατες από {reviewCount} κριτικές.
                </p>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-12">
                <button
                    onClick={() => navigate('/team')}
                    className="w-full sm:w-auto border border-slate/20 text-slate rounded-xl px-6 py-3 font-medium hover:bg-white transition-colors"
                >
                    Δες την ομάδα
                </button>
                <button
                    onClick={() => navigate('/book')}
                    className="w-full sm:w-auto bg-blue text-white rounded-xl px-6 py-3 font-medium hover:bg-blue-soft transition-colors"
                >
                    Κλείσε ραντεβού
                </button>
            </div>
        </div>
    );
}