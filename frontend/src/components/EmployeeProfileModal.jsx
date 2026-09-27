import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api } from '../services/api';
import Avatar from './Avatar';
import RatingBadge from './RatingBadge';
import StarRow from './StarRow';
import { formatReviewDate } from '../utils/formatDate';

// Header (φωτό/όνομα/βαθμός/bio) από το ήδη-γνωστό employee object → εμφανίζεται αμέσως.
// Κριτικές: lazy fetch στο mount (mount == άνοιγμα), κλειδί το employee.id.
export default function EmployeeProfileModal({ employee, onClose }) {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function loadReviews() {
            setLoading(true);
            setError('');
            try {
                const data = await api.get(`/employees/${employee.id}/reviews`);
                setReviews(data.reviews || []);
            } catch {
                setError('Δεν ήταν δυνατή η φόρτωση των κριτικών.');
            } finally {
                setLoading(false);
            }
        }
        loadReviews();
    }, [employee.id]);

    // Κλείσιμο με Escape.
    useEffect(() => {
        function onKey(e) {
            if (e.key === 'Escape') onClose();
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 bg-slate/40 flex items-center justify-center p-4 z-50"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 border-b border-slate/10">
                    <div className="flex items-start gap-4">
                        <Avatar
                            name={employee.fullName}
                            photoUrl={employee.photoUrl}
                            size="w-16 h-16"
                            textSize="text-xl"
                        />
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-semibold text-slate">{employee.fullName}</h2>
                            <RatingBadge average={employee.averageRating} count={employee.reviewCount} />
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate/40 hover:text-slate transition-colors flex-shrink-0"
                            aria-label="Κλείσιμο"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    {employee.bio && (
                        <p className="text-slate/70 text-sm mt-4 leading-relaxed">{employee.bio}</p>
                    )}
                </div>

                {/* Κριτικές */}
                <div className="p-5 overflow-y-auto">
                    {loading && <p className="text-slate/60 text-center py-6">Φόρτωση κριτικών...</p>}

                    {error && (
                        <div className="bg-danger-tint text-danger rounded-xl px-4 py-3">{error}</div>
                    )}

                    {!loading && !error && reviews.length === 0 && (
                        <p className="text-slate/50 text-center py-6">Δεν υπάρχουν κριτικές ακόμα.</p>
                    )}

                    {!loading && !error && reviews.length > 0 && (
                        <div className="space-y-3">
                            {reviews.map((review) => (
                                <div key={review.id} className="bg-page rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <StarRow rating={review.rating} />
                                        <span className="text-slate/40 text-xs">
                                            {formatReviewDate(review.createdAt)}
                                        </span>
                                    </div>
                                    {review.comment && (
                                        <p className="text-slate/80 text-sm">{review.comment}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}