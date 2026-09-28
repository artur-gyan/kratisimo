package com.github.arturgyan.kratisimo.dto;

/**
 * Κατάσταση επιβράβευσης ενός πελάτη (D168 → D173).
 *
 * enabled, visitsRequired, discountPercent
 *     → ο ΤΡΕΧΩΝ κανόνας: ισχύει για την κάρτα που γεμίζει τώρα.
 * completedVisits
 *     → σφραγίδες: ραντεβού που ολοκληρώθηκαν ΕΝΩ το πρόγραμμα ήταν ενεργό.
 *       (Το όνομα κρατήθηκε για να μη σπάσει το frontend.)
 * progress
 *     → σφραγίδες της τρέχουσας κάρτας (0 … visitsRequired).
 * availableRewards
 *     → ελεύθερα δώρα. 0 όταν το πρόγραμμα είναι ανενεργό («παγωμένα», D173 κανόνας 7).
 * nextRewardPercent  ── ΝΕΟ (D173)
 *     → το % του δώρου που θα εφαρμοστεί στην ΕΠΟΜΕΝΗ κράτηση (0 = κανένα).
 *       Μπορεί να ΔΙΑΦΕΡΕΙ από το discountPercent: αν ο admin άλλαξε το % αφού
 *       κερδήθηκε το δώρο, το δώρο κρατά το δικό του (κανόνας 6).
 */
public record LoyaltyResponse(
        boolean enabled,
        int visitsRequired,
        int discountPercent,
        long completedVisits,
        int progress,
        long availableRewards,
        int nextRewardPercent
) {
}
