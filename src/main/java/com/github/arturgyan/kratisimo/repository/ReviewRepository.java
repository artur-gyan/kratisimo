package com.github.arturgyan.kratisimo.repository;

import com.github.arturgyan.kratisimo.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Set;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    // ── Για το POST: υπάρχει ήδη review για αυτό το ραντεβού; ──
    // Το @OneToOne + UNIQUE το επιβάλλει στη βάση, αλλά ελέγχουμε ΠΡΙΝ
    // για καθαρό 409 message αντί για άσχημο DataIntegrityViolation (D95 αρχή).
    boolean existsByAppointmentId(Long appointmentId);

    // ── "Τα δικά μου": reviews του συγκεκριμένου customer ──
    // Join μέσα από appointment: review → appointment → customer.
    // 3 "βήματα" στο path αλλά derived method το χειρίζεται (D47: property traversal).
    List<Review> findByAppointmentCustomerIdOrderByCreatedAtDesc(Long customerId);

    // ── "Ανά υπάλληλο": reviews μέσω appointment.employee ──
    // Ασυμμετρία FK: appointment.employee → employee_profiles.
    // Path: review → appointment → employee → id.
    List<Review> findByAppointmentEmployeeIdOrderByCreatedAtDesc(Long employeeId);

    // ── Μέσος όρος υπαλλήλου (aggregation στη βάση, D100) ──
    // JPQL: AVG(rating) όπου appointment.employee.id = X.
    // Επιστρέφει Double (null αν 0 reviews — το χειρίζεται ο service).
    // 4+ conditions/aggregation → @Query, όχι derived (D47).
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.appointment.employee.id = :employeeId")
    Double findAverageRatingByEmployeeId(@Param("employeeId") Long employeeId);

    // ── "Όλα" (admin) ──
    List<Review> findAllByOrderByCreatedAtDesc();

    // ── Για το canReview στο MyAppointments: ποια ραντεβού του customer έχουν ήδη review; ──
    // Επιστρέφει ΜΟΝΟ τα ids (projection) — όχι ολόκληρα Review entities. Ένα query,
    // το αποτέλεσμα μπαίνει σε Set στον service → O(1) lookup ανά ραντεβού (κανένα N+1).
    @Query("SELECT r.appointment.id FROM Review r WHERE r.appointment.customer.id = :customerId")
    Set<Long> findReviewedAppointmentIdsByCustomerId(@Param("customerId") Long customerId);

    // ── Batch: μέσος όρος + count για ΠΟΛΛΟΥΣ υπαλλήλους σε ΕΝΑ query (αποφυγή N+1) ──
    // Το βήμα 2 της κράτησης δείχνει βαθμολογία δίπλα σε N υπαλλήλους. Χωρίς batch,
    // θα καλούσαμε findAverageRatingByEmployeeId N φορές (N+1). Αντ' αυτού:
    // ΕΝΑ query, GROUP BY employee → μία γραμμή ανά υπάλληλο ΠΟΥ ΕΧΕΙ reviews.
    // Κάθε γραμμή: [Long employeeId, Double avg, Long count].
    // Υπάλληλοι ΧΩΡΙΣ review δεν εμφανίζονται (φύση του GROUP BY) → ο service
    // τους αφήνει με null average (D110: null, όχι 0). Ο service το κάνει Map για O(1) lookup.
    @Query("SELECT r.appointment.employee.id, AVG(r.rating), COUNT(r) " +
           "FROM Review r " +
           "WHERE r.appointment.employee.id IN :employeeIds " +
           "GROUP BY r.appointment.employee.id")
    List<Object[]> findAverageRatingsByEmployeeIds(@Param("employeeIds") List<Long> employeeIds);
}
