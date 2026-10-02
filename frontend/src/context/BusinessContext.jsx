import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getBusinessInfo } from '../services/businessService';

// Global business info (όνομα/διεύθυνση/τηλέφωνο μαγαζιού).
// Μία πηγή για Navbar / landing / footer / τίτλο καρτέλας (D159).
// Public endpoint, κανένα token.
const BusinessContext = createContext(null);

export function BusinessProvider({ children }) {
    const [business, setBusiness] = useState(null);
    const [loading, setLoading] = useState(true);

    // Ξαναδιαβάζει τα στοιχεία από τον server.
    // Καλείται: (1) στο app mount, (2) από τη σελίδα Ρυθμίσεων μετά από αποθήκευση
    // → Navbar/footer/τίτλος ενημερώνονται ΑΜΕΣΩΣ, χωρίς refresh σελίδας.
    // useCallback: σταθερή αναφορά συνάρτησης → ασφαλής ως dependency στο useEffect.
    const refresh = useCallback(async () => {
        try {
            const info = await getBusinessInfo();
            setBusiness(info);
        } catch {
            // Αποτυχία: κρατάμε ό,τι είχαμε. Στο mount = null → fallback "Kratisimo".
            // (Ένα αποτυχημένο refresh δεν πρέπει να «σβήσει» το όνομα που ήδη φαίνεται.)
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    // name με fallback ώστε το Navbar να μη δείχνει ποτέ κενό.
    const name = business?.name || 'Kratisimo';

    // Τίτλος καρτέλας browser = όνομα μαγαζιού (ακολουθεί κάθε αλλαγή του ονόματος).
    useEffect(() => {
        document.title = name;
    }, [name]);

    const value = {
        business,
        loading,
        name,
        refresh,
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
