// Φωτογραφία ή αρχικά ονόματος. Κοινό σε Booking / Home / Team.
export default function Avatar({ name, photoUrl, size = 'w-11 h-11', textSize = 'text-base' }) {
    if (photoUrl) {
        return (
            <img
                src={photoUrl}
                alt={name}
                className={`${size} rounded-full object-cover flex-shrink-0`}
            />
        );
    }

    const initials = (name || '')
        .split(' ')
        .filter((w) => w.length > 0)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();

    return (
        <div className={`${size} ${textSize} rounded-full bg-blue-tint text-blue font-semibold flex items-center justify-center flex-shrink-0`}>
            {initials}
        </div>
    );
}