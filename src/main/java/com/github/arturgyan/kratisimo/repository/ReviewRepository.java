package com.github.arturgyan.kratisimo.repository;

import com.github.arturgyan.kratisimo.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

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
}