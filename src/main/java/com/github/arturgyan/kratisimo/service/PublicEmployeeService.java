package com.github.arturgyan.kratisimo.service;

import com.github.arturgyan.kratisimo.dto.PublicEmployeeResponse;
import com.github.arturgyan.kratisimo.entity.EmployeeProfile;
import com.github.arturgyan.kratisimo.repository.EmployeeProfileRepository;
import com.github.arturgyan.kratisimo.repository.ReviewRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class PublicEmployeeService {

    private final EmployeeProfileRepository employeeProfileRepository;
    private final ReviewRepository reviewRepository;

    public PublicEmployeeService(EmployeeProfileRepository employeeProfileRepository,
                                 ReviewRepository reviewRepository) {
        this.employeeProfileRepository = employeeProfileRepository;
        this.reviewRepository = reviewRepository;
    }

    /**
     * Υπάλληλοι (active) που προσφέρουν ΟΛΕΣ τις ζητούμενες υπηρεσίες,
     * μαζί με τη βαθμολογία τους (average + count).
     * Επαναχρησιμοποιεί το ΙΔΙΟ query που τρέχει το least-loaded (D89):
     * findByOfferingAllServices (JOIN + GROUP BY + HAVING COUNT = size).
     *
     * @Transactional(readOnly=true): μόνο διαβάζουμε. Το DTO χτίζεται ΜΕΣΑ στο
     * session (getUser() lazy — D87).
     */
    @Transactional(readOnly = true)
    public List<PublicEmployeeResponse> findAvailableForServices(List<Long> serviceIds) {

        // Άμυνα: διπλότυπα serviceIds θα φούσκωναν το COUNT του HAVING (D77).
        Set<Long> uniqueIds = new HashSet<>(serviceIds);

        List<EmployeeProfile> employees = employeeProfileRepository
                .findByOfferingAllServices(
                        List.copyOf(uniqueIds),
                        uniqueIds.size());

        // ── Batch ratings: ΕΝΑ query για ΟΛΟΥΣ τους υπαλλήλους (αποφυγή N+1) ──
        // Πρώτα μάζεψε τα ids των υπαλλήλων που βρέθηκαν.
        List<Long> employeeIds = employees.stream()
                .map(EmployeeProfile::getId)
                .toList();

        // Το batch query γυρνάει [id, avg, count] μόνο για όσους ΕΧΟΥΝ reviews.
        // Το μετατρέπουμε σε Map<employeeId, [avg, count]> για O(1) lookup στο mapping.
        // Guard: αν κανένας υπάλληλος, μη τρέξεις το IN (:employeeIds) με άδεια λίστα.
        Map<Long, RatingStats> statsById = employeeIds.isEmpty()
                ? Map.of()
                : reviewRepository.findAverageRatingsByEmployeeIds(employeeIds).stream()
                    .collect(Collectors.toMap(
                            row -> (Long) row[0],                              // employeeId
                            row -> new RatingStats(
                                    (Double) row[1],                          // AVG → Double
                                    ((Long) row[2]).intValue())));            // COUNT → Long → int

        // Entity → DTO. Lookup στο Map: αν ο υπάλληλος ΔΕΝ έχει reviews, δεν
        // υπάρχει κλειδί → average null, count 0 (D110: null όχι 0 για τον μέσο όρο).
        return employees.stream()
                .map(e -> {
                    RatingStats stats = statsById.get(e.getId());
                    Double avg = (stats != null) ? stats.average() : null;
                    int count = (stats != null) ? stats.count() : 0;

                    return new PublicEmployeeResponse(
                            e.getId(),
                            e.getUser().getFullName(),
                            e.getPhotoUrl(),
                            avg,
                            count);
                })
                .toList();
    }

    // Εσωτερικό record μόνο για να κρατάμε [avg, count] μαζί στο Map (πιο καθαρό
    // από Object[] ή δύο ξεχωριστά Maps). Ζει μόνο εδώ — δεν είναι DTO.
    private record RatingStats(Double average, int count) {}
}
