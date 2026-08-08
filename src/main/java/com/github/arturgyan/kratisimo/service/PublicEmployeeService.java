package com.github.arturgyan.kratisimo.service;

import com.github.arturgyan.kratisimo.dto.PublicEmployeeResponse;
import com.github.arturgyan.kratisimo.entity.EmployeeProfile;
import com.github.arturgyan.kratisimo.repository.EmployeeProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class PublicEmployeeService {

    private final EmployeeProfileRepository employeeProfileRepository;

    public PublicEmployeeService(EmployeeProfileRepository employeeProfileRepository) {
        this.employeeProfileRepository = employeeProfileRepository;
    }

    /**
     * Υπάλληλοι (active) που προσφέρουν ΟΛΕΣ τις ζητούμενες υπηρεσίες.
     * Επαναχρησιμοποιεί το ΙΔΙΟ query που τρέχει το least-loaded (D89):
     * findByOfferingAllServices (JOIN + GROUP BY + HAVING COUNT = size).
     *
     * @Transactional(readOnly=true): μόνο διαβάζουμε. readOnly = hint στον
     * Hibernate (no dirty checking) + στη βάση (πιθανό read replica).
     * Χρειάζεται transaction γιατί διαβάζουμε lazy πεδία (getUser()) — το
     * DTO χτίζεται ΜΕΣΑ στο ανοιχτό session (open-in-view:false, ίδια αρχή D87).
     */
    @Transactional(readOnly = true)
    public List<PublicEmployeeResponse> findAvailableForServices(List<Long> serviceIds) {

        // Άμυνα: διπλότυπα serviceIds θα φούσκωναν το COUNT του HAVING
        // (ίδιος κίνδυνος με D77). Καθαρίζουμε πριν το query.
        Set<Long> uniqueIds = new HashSet<>(serviceIds);

        List<EmployeeProfile> employees = employeeProfileRepository
                .findByOfferingAllServices(
                        List.copyOf(uniqueIds),   // μοναδικά ids
                        uniqueIds.size());        // count = πλήθος μοναδικών

        // Entity → public-safe DTO. Το getUser() είναι lazy (D28) —
        // resolve εδώ μέσα, όσο το session είναι ανοιχτό.
        return employees.stream()
                .map(e -> new PublicEmployeeResponse(
                        e.getId(),
                        e.getUser().getFullName(),
                        e.getPhotoUrl()
                ))
                .toList();
    }
}