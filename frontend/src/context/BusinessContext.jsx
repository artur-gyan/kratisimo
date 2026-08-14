import { createContext, useContext, useState, useEffect } from 'react';
import { getBusinessInfo } from '../services/businessService';

// Global business info (όνομα/διεύθυνση/τηλέφωνο μαγαζιού).
// Φορτώνεται ΜΙΑ φορά στο app mount — Navbar/landing/footer το διαβάζουν
// χωρίς επαναλαμβανόμενα fetch. Public endpoint, κανένα token.
const BusinessContext = createContext(null);

export function BusinessProvider({ children }) {
    const [business, setBusiness] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const info = await getBusinessInfo();
                setBusiness(info);
            } catch {
                // Fallback: αν αποτύχει, το UI δείχνει "Kratisimo" (default).
                setBusiness(null);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    // name με fallback ώστε το Navbar να μη δείχνει ποτέ κενό.
    const value = {
        business,
        loading,
        name: business?.name || 'Kratisimo',
    };

    return (
        <BusinessContext.Provider value={value}>
            {children}
        </BusinessContext.Provider>
    );
}

export function useBusiness() {
    const context = useContext(BusinessContext);
    if (context === null) {
        throw new Error('useBusiness must be used within a BusinessProvider');
    }
    return context;
}