import { Gift } from 'lucide-react';

// Κάρτα προόδου επιβράβευσης. Δέχεται το LoyaltyResponse του backend
// (/api/loyalty/me). Αν το πρόγραμμα είναι κλειστό → δεν εμφανίζεται τίποτα.
//
// ΔΥΟ διαφορετικά ποσοστά (D173):
//  - nextRewardPercent → το δώρο που ΗΔΗ κέρδισε (εφαρμόζεται στην επόμενη κράτηση)
//  - discountPercent   → ο τρέχων κανόνας, για την κάρτα που γεμίζει τώρα
// Διαφέρουν μόνο αν ο admin άλλαξε το % αφού κερδήθηκε το δώρο.
export default function LoyaltyCard({ loyalty }) {
    if (!loyalty || !loyalty.enabled) return null;

    const { visitsRequired, discountPercent, progress, availableRewards, nextRewardPercent } = loyalty;
    const remaining = visitsRequired - progress;

    return (
        <div className="bg-white border border-slate/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-tint text-blue flex items-center justify-center">
                    <Gift size={18} />
                </div>
                <h2 className="text-slate font-semibold">Πρόγραμμα επιβράβευσης</h2>
            </div>

            {availableRewards > 0 && (
                <div className="bg-success-tint text-success rounded-xl px-4 py-3 mb-4 text-sm">
                    <p className="font-semibold">
                        🎉 {availableRewards === 1
                        ? `Έχεις διαθέσιμη έκπτωση ${nextRewardPercent}%!`
                        : `Έχεις ${availableRewards} διαθέσιμες εκπτώσεις!`}
                    </p>
                    <p className="mt-0.5">
                        {availableRewards === 1
                            ? 'Εφαρμόζεται αυτόματα στην επόμενη κράτησή σου.'
                            : `Η πρώτη (−${nextRewardPercent}%) εφαρμόζεται αυτόματα στην επόμενη κράτησή σου.`}
                    </p>
                </div>
            )}

            <ProgressSegments total={visitsRequired} filled={progress} />

            <p className="text-slate/60 text-sm mt-3">
                <span className="font-medium text-slate">{progress} / {visitsRequired}</span>
                {' · '}
                Ακόμη {remaining} {remaining === 1 ? 'ολοκληρωμένο ραντεβού' : 'ολοκληρωμένα ραντεβού'}{' '}
                για {availableRewards > 0 ? 'την επόμενη ' : ''}έκπτωση {discountPercent}%
            </p>
        </div>
    );
}

// Μπάρα σε N κομμάτια: γεμάτα όσα η πρόοδος. flex-wrap → δεν σπάει με μεγάλο N.
function ProgressSegments({ total, filled }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: total }, (_, i) => (
                <div
                    key={i}
                    className={`h-2.5 flex-1 min-w-[16px] max-w-[48px] rounded-full ${
                        i < filled ? 'bg-blue' : 'bg-slate/10'
                    }`}
                />
            ))}
        </div>
    );
}
