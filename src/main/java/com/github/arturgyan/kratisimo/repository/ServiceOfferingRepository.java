package com.github.arturgyan.kratisimo.repository;

import com.github.arturgyan.kratisimo.entity.ServiceOffering;
import com.github.arturgyan.kratisimo.enums.TargetAudience;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

/**
 * Data access για τις υπηρεσίες (ServiceOffering).
 * Όλα τα queries φιλτράρουν active=true: ο πελάτης δεν βλέπει
 * soft-deleted υπηρεσίες (D20). Ταξινόμηση αλφαβητικά κατά name.
 */
public interface ServiceOfferingRepository extends JpaRepository<ServiceOffering, Long> {

    // Όλες οι ενεργές υπηρεσίες, αλφαβητικά.
    List<ServiceOffering> findByActiveTrueOrderByNameAsc();

    // Ενεργές υπηρεσίες μιας κατηγορίας (Booking Flow βήμα 1, ομαδοποίηση ανά κατηγορία).
    // CategoryId -> query στο FK column, χωρίς JOIN στο service_categories.
    List<ServiceOffering> findByCategoryIdAndActiveTrueOrderByNameAsc(Long categoryId);

    // Φιλτράρισμα κατά κοινό. In (όχι =) γιατί "ανδρικές" = MEN + UNISEX (D13).
    List<ServiceOffering> findByTargetAudienceInAndActiveTrueOrderByNameAsc(List<TargetAudience> audiences);

    List<ServiceOffering> findAllByOrderByNameAsc();
    // Μόνο active, αλφαβητικά. Derived query (D47: 1 condition → derived, όχι @Query).
    // Ο πελάτης ΔΕΝ πρέπει να βλέπει soft-deleted υπηρεσίες (D20).

}