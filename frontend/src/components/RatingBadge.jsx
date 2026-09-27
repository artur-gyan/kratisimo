import { Star } from 'lucide-react';

// average = null όταν 0 κριτικές (D110) → "Χωρίς κριτικές", ΟΧΙ "0 ★".
export default function RatingBadge({ average, count }) {
    if (average === null || average === undefined) {
        return <p className="text-slate/40 text-sm mt-0.5">Χωρίς κριτικές</p>;
    }
    return (
        <p className="text-slate/60 text-sm flex items-center gap-1 mt-0.5">
            <Star size={13} className="fill-blue text-blue" />
            <span className="font-medium text-slate">{average.toFixed(1)}</span>
            <span>({count})</span>
        </p>
    );
}