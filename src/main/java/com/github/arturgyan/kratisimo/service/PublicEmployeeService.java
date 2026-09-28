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
     * [α] Υπάλληλοι (active) που προσφέρουν ΟΛΕΣ τις ζητούμενες υπηρεσίες.
     * Χρήση: βήμα 2 της κράτησης. Ίδιο query με το least-loaded (D89).
     */
    @Transactional(readOnly = true)
    public List<PublicEmployeeResponse> findAvailableForServices(List<Long> serviceIds) {

        // Άμυνα: διπλότυπα serviceIds θα φούσκωναν το COUNT του HAVING (D77).
        Set<Long> uniqueIds = new HashSet<>(serviceIds);

        List<EmployeeProfile> employees = employeeProfileRepository
                .findByOfferingAllServices(List.copyOf(uniqueIds), uniqueIds.size());

        return toResponsesWithRatings(employees);
    }

    /**
     * [α'] ΟΛΟΙ οι ενεργοί υπάλληλοι, αλφαβητικά.
     * Χρήση: σελίδα "Η ομάδα μας" + landing. ΔΕΝ φιλτράρει ανά υπηρεσία —
     * σκοπός η παρουσίαση της ομάδας, όχι η κράτηση.
     */
    @Transactional(readOnly = true)
    public List<PublicEmployeeResponse> findAllActive() {
        List<EmployeeProfile> employees =
                employeeProfileRepository.findByActiveTrueOrderByUserFullNameAsc();
        return toResponsesWithRatings(employees);
    }

    /**
     * [β] + [γ] Κοινό κομμάτι: batch ratings (ΕΝΑ query για όλους, D128)
     * + μετατροπή Entity → DTO.
     *
     * Private χωρίς @Transactional: τρέχει ΜΕΣΑ στο transaction της μεθόδου
     * που την καλεί (findAvailableForServices ή findAllActive). Δεν χρειάζεται
     * δικό της transaction → η παγίδα self-invocation (D79) δεν μας αφορά.
     */
    private List<PublicEmployeeResponse> toResponsesWithRatings(List<EmployeeProfile> employees) {

        List<Long> employeeIds = employees.stream()
                .map(EmployeeProfile::getId)
                .toList();

        // Batch query: [id, avg, count] μόνο για όσους ΕΧΟΥΝ reviews → Map για O(1) lookup.
        // Guard: μη τρέξεις IN (:employeeIds) με άδεια λίστα.
        Map<Long, RatingStats> statsById = employeeIds.isEmpty()
                ? Map.of()
                : reviewRepository.findAverageRatingsByEmployeeIds(employeeIds).stream()
                .collect(Collectors.toMap(
                        row -> (Long) row[0],                              // employeeId
                        row -> new RatingStats(
                                (Double) row[1],                          // AVG → Double
                                ((Long) row[2]).intValue())));            // COUNT → int

        // Entity → DTO. Χωρίς reviews → average null, count 0 (D110).
        return employees.stream()
                .map(e -> {
                    RatingStats stats = statsById.get(e.getId());
                    Double avg = (stats != null) ? stats.average() : null;
                    int count = (stats != null) ? stats.count() : 0;

                    return new PublicEmployeeResponse(
                            e.getId(),
                            e.getUser().getFullName(),
                            e.getPhotoUrl(),
                            e.getBio(),          // ΝΕΟ πεδίο
                            avg,
                            count);
                })
                .toList();
    }

    // Εσωτερικό record για [avg, count] στο Map. Ζει μόνο εδώ — δεν είναι DTO.
    private record RatingStats(Double average, int count) {}
}