import { Star } from 'lucide-react';

// 5 αστέρια, γεμάτα έως το rating. Για μέσο όρο (π.χ. 4.5) στρογγυλοποιεί.
export default function StarRow({ rating, size = 14 }) {
    const filled = Math.round(rating);
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
                <Star
                    key={n}
                    size={size}
                    className={n <= filled ? 'fill-blue text-blue' : 'text-slate/25'}
                />
            ))}
        </div>
    );
}