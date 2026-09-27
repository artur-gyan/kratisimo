// Τιμή ραντεβού με/χωρίς έκπτωση επιβράβευσης (κοινό component).
// Δέχεται οποιοδήποτε appointment DTO έχει totalPrice, discountPercent,
// discountAmount, status (AdminAppointmentResponse ή MyAppointmentResponse).
//
// Υποσύνολο = totalPrice + discountAmount (invariant του backend) →
// δεν χρειάζεται ξεχωριστό πεδίο από τον server.
//
// size:   'md' (default) | 'sm' (συμπαγές, π.χ. λίστα ιστορικού)
// layout: 'row' (default, οριζόντια) | 'stack' (κάθετα, στοιχισμένο δεξιά)
export default function DiscountedPrice({ appointment, size = 'md', layout = 'row' }) {
    const total = Number(appointment.totalPrice) || 0;
    const percent = appointment.discountPercent || 0;

    const totalCls = size === 'sm'
        ? 'text-slate text-sm font-medium'
        : 'text-slate font-semibold';
    const struckCls = size === 'sm'
        ? 'text-slate/40 line-through text-xs'
        : 'text-slate/40 line-through text-sm';

    // Χωρίς έκπτωση → μόνο η τιμή.
    if (percent === 0) {
        return <span className={totalCls}>{total.toFixed(2)} €</span>;
    }

    const subtotal = total + (Number(appointment.discountAmount) || 0);
    const cancelled = appointment.status === 'CANCELLED';

    const wrapperCls = layout === 'stack'
        ? 'flex flex-col items-end gap-1'
        : 'flex items-center gap-2 flex-wrap';

    return (
        <div className={wrapperCls}>
            <div className="flex items-baseline gap-2">
                <span className={struckCls}>{subtotal.toFixed(2)} €</span>
                <span className={totalCls}>{total.toFixed(2)} €</span>
            </div>
            <span
                className={`text-xs font-medium rounded-lg px-2 py-0.5 ${
                    cancelled ? 'bg-slate/10 text-slate/60' : 'bg-success-tint text-success'
                }`}
            >
                {cancelled
                    ? `−${percent}% · η επιβράβευση επιστράφηκε`
                    : `−${percent}% επιβράβευση`}
            </span>
        </div>
    );
}