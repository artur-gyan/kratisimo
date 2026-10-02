import { MapPin, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';

// Google Maps search URL (επίσημο "Maps URLs" format, δεν θέλει API key).
function mapsUrl(address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// tel: link → στο κινητό ανοίγει απευθείας κλήση. Τα κενά αφαιρούνται.
function telUrl(phone) {
    return `tel:${phone.replace(/\s+/g, '')}`;
}

/**
 * Global footer.
 * - Πελάτης / επισκέπτης: στοιχεία μαγαζιού (όνομα, διεύθυνση → χάρτης, τηλέφωνο → κλήση)
 *   από το business_settings μέσω BusinessContext.
 * - Admin / υπάλληλος: μόνο "Powered by" — τα στοιχεία του δικού τους μαγαζιού
 *   δεν τους προσφέρουν τίποτα (ίδια λογική με το Navbar, D159).
 * - "Powered by Kratisimo" = platform brand, πάντα (D159).
 */
export default function Footer() {
    const { user } = useAuth();
    const { business, name } = useBusiness();

    const isStaff = user?.roles.includes('ADMIN') || user?.roles.includes('EMPLOYEE');
    const address = business?.address;
    const phone = business?.phone;

    // business === null → το fetch απέτυχε ή δεν έχει γυρίσει ακόμα → μόνο "Powered by".
    const showContact = !isStaff && business !== null;

    return (
        <footer className="bg-white border-t border-slate/10 mt-8">
            {showContact && (
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                    <p className="text-slate font-semibold text-lg">{name}</p>

                    {(address || phone) && (
                        <ul className="space-y-2.5 text-sm">
                            {address && (
                                <li>
                                    <a
                                        href={mapsUrl(address)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-start gap-2.5 text-slate/70 hover:text-blue transition-colors"
                                    >
                                        <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                                        <span>{address}</span>
                                    </a>
                                </li>
                            )}
                            {phone && (
                                <li>
                                    <a
                                        href={telUrl(phone)}
                                        className="flex items-center gap-2.5 text-slate/70 hover:text-blue transition-colors"
                                    >
                                        <Phone size={16} className="flex-shrink-0" />
                                        <span>{phone}</span>
                                    </a>
                                </li>
                            )}
                        </ul>
                    )}
                </div>
            )}

            <div className={`text-center py-5 text-slate/40 text-sm ${showContact ? 'border-t border-slate/10' : ''}`}>
                Powered by Kratisimo
            </div>
        </footer>
    );
}
