package com.github.arturgyan.kratisimo.repository;

import com.github.arturgyan.kratisimo.entity.Appointment;
import com.github.arturgyan.kratisimo.enums.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    // Query 1 — τα ραντεβού μιας μέρας που πιάνουν χρόνο (Availability Engine)
    @Query("SELECT a FROM Appointment a WHERE a.employee.id = :employeeId " +
            "AND a.startsAt < :dayEnd AND a.endsAt > :dayStart " +
            "AND a.status IN :statuses")
    List<Appointment> findOverlapping(@Param("employeeId") Long employeeId,
                                      @Param("dayStart") Instant dayStart,
                                      @Param("dayEnd") Instant dayEnd,
                                      @Param("statuses") List<AppointmentStatus> statuses);

    // Query 2 — overlap check στο booking (race condition, D19)
    @Query("SELECT CASE WHEN COUNT(a) > 0 THEN true ELSE false END " +
            "FROM Appointment a WHERE a.employee.id = :employeeId " +
            "AND a.startsAt < :endsAt AND a.endsAt > :startsAt " +
            "AND a.status IN :statuses")
    boolean existsOverlapping(@Param("employeeId") Long employeeId,
                              @Param("startsAt") Instant startsAt,
                              @Param("endsAt") Instant endsAt,
                              @Param("statuses") List<AppointmentStatus> statuses);

    // Query 2β — overlap check ΕΞΑΙΡΩΝΤΑΣ ένα appointment (reschedule, D145).
    // Το ίδιο το ραντεβού που μετακινείς υπάρχει ήδη στη βάση· χωρίς το
    // a.id <> :excludeId θα «συγκρουόταν με τον εαυτό του» → κάθε reschedule 409.
    @Query("SELECT CASE WHEN COUNT(a) > 0 THEN true ELSE false END " +
            "FROM Appointment a WHERE a.employee.id = :employeeId " +
            "AND a.id <> :excludeId " +
            "AND a.startsAt < :endsAt AND a.endsAt > :startsAt " +
            "AND a.status IN :statuses")
    boolean existsOverlappingExcluding(@Param("employeeId") Long employeeId,
                                       @Param("excludeId") Long excludeId,
                                       @Param("startsAt") Instant startsAt,
                                       @Param("endsAt") Instant endsAt,
                                       @Param("statuses") List<AppointmentStatus> statuses);

    // Query 3 — «τα ραντεβού μου» (customer view), νεότερα πρώτα
    List<Appointment> findByCustomerIdOrderByStartsAtDesc(Long customerId);

    // Query 4 — πρόγραμμα υπαλλήλου / admin σε date range
    @Query("SELECT a FROM Appointment a WHERE a.employee.id = :employeeId " +
            "AND a.startsAt BETWEEN :from AND :to ORDER BY a.startsAt")
    List<Appointment> findByEmployeeInRange(@Param("employeeId") Long employeeId,
                                            @Param("from") Instant from,
                                            @Param("to") Instant to);

    @Query("""
        SELECT a FROM Appointment a
        WHERE a.startsAt >= :from AND a.startsAt < :to
        ORDER BY a.startsAt ASC
        """)
    List<Appointment> findByStartsAtRange(@Param("from") Instant from,
                                          @Param("to") Instant to);

    @Query("""
        SELECT a FROM Appointment a
        WHERE a.status = :status
          AND a.startsAt >= :from AND a.startsAt < :to
        ORDER BY a.startsAt ASC
        """)
    List<Appointment> findByStatusInRange(@Param("status") AppointmentStatus status,
                                          @Param("from") Instant from,
                                          @Param("to") Instant to);

    // ── Loyalty (D173): σφραγίδες ανά πελάτη, για ΕΝΑΝ ή ΠΟΛΛΟΥΣ σε ΕΝΑ query (D128) ──
    // Χωρίς φίλτρο status: το CHECK loyalty_stamp_only_completed_customer (V8)
    // εγγυάται ότι σφραγίδα έχουν ΜΟΝΟ COMPLETED ραντεβού εγγεγραμμένων πελατών.
    //
    // Γιατί ΞΕΧΩΡΙΣΤΟ query από τα δώρα (LoyaltyRewardRepository) και όχι JOIN:
    // JOIN δύο "πολλά" πλευρών = fan-out (7 σφραγίδες × 2 δώρα = 14 γραμμές)
    // → λάθος COUNT/SUM (ίδιο πρόβλημα με D101/D165). Δύο μικρά aggregates = σωστά.
    @Query("""
            SELECT a.customer.id AS customerId, COUNT(a) AS stamps
            FROM Appointment a
            WHERE a.loyaltyStamp = true AND a.customer.id IN :customerIds
            GROUP BY a.customer.id
            """)
    List<StampCountProjection> countStampsByCustomer(@Param("customerIds") List<Long> customerIds);

    // ── ΝΕΟ (D175): ίδιο, για ΟΛΟΥΣ όσους έχουν έστω μία σφραγίδα ──
    // Για την αλλαγή ρυθμίσεων: ποιοι μπορεί να φτάνουν πλέον τον (μειωμένο) στόχο.
    // Πελάτες χωρίς σφραγίδα δεν επιστρέφονται → δεν μπορούν να κερδίσουν τίποτα.
    @Query("""
            SELECT a.customer.id AS customerId, COUNT(a) AS stamps
            FROM Appointment a
            WHERE a.loyaltyStamp = true
            GROUP BY a.customer.id
            """)
    List<StampCountProjection> countStampsForAllCustomers();

    interface StampCountProjection {
        Long getCustomerId();
        long getStamps();
    }

    // ΑΦΑΙΡΕΘΗΚΕ (D173): findLoyaltyCounts + LoyaltyCountsProjection (derived μοντέλο D168).
}
