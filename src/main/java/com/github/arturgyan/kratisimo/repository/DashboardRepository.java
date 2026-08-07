package com.github.arturgyan.kratisimo.repository;

import com.github.arturgyan.kratisimo.entity.Appointment;
import com.github.arturgyan.kratisimo.enums.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public interface DashboardRepository extends JpaRepository<Appointment, Long> {

    // ---------- 1. Συνολικά έσοδα (μόνο COMPLETED, στο εύρος) ----------
    // COALESCE → αν κανένα ραντεβού δεν ταιριάζει, γύρνα 0 αντί για NULL
    @Query("""
            SELECT COALESCE(SUM(a.totalPrice), 0)
            FROM Appointment a
            WHERE a.status = :status
              AND a.startsAt >= :from
              AND a.startsAt < :to
            """)
    BigDecimal totalRevenue(@Param("status") AppointmentStatus status,
                            @Param("from") Instant from,
                            @Param("to") Instant to);

    // ---------- 2. Δημοφιλείς υπηρεσίες (μέσω items — group ανά service) ----------
    // Πάει μέσω AppointmentItem γιατί μετράμε ΑΝΑ ΥΠΗΡΕΣΙΑ (child-level aggregation)
    @Query("""
            SELECT s.id AS serviceId,
                   s.name AS serviceName,
                   COUNT(i) AS timesBooked,
                   COALESCE(SUM(i.priceSnapshot), 0) AS revenue
            FROM AppointmentItem i
            JOIN i.appointment a
            JOIN i.service s
            WHERE a.status = :status
              AND a.startsAt >= :from
              AND a.startsAt < :to
            GROUP BY s.id, s.name
            ORDER BY COUNT(i) DESC
            """)
    List<PopularServiceProjection> popularServices(@Param("status") AppointmentStatus status,
                                                   @Param("from") Instant from,
                                                   @Param("to") Instant to);

    // ---------- 3. Στατιστικά ανά υπάλληλο (στο Appointment, ΟΧΙ items — fan-out) ----------
    // Μετράμε ΑΝΑ ΡΑΝΤΕΒΟΥ → parent-level → ΚΑΝΕΝΑ join με items
    @Query("""
            SELECT e.id AS employeeProfileId,
                   u.fullName AS employeeName,
                   COUNT(a) AS appointmentCount,
                   COALESCE(SUM(a.totalPrice), 0) AS revenue
            FROM Appointment a
            JOIN a.employee e
            JOIN e.user u
            WHERE a.status = :status
              AND a.startsAt >= :from
              AND a.startsAt < :to
            GROUP BY e.id, u.fullName
            ORDER BY COUNT(a) DESC
            """)
    List<EmployeeStatProjection> employeeStats(@Param("status") AppointmentStatus status,
                                               @Param("from") Instant from,
                                               @Param("to") Instant to);

    // ---------- 4. Πλήθος ανά status (ΧΩΡΙΣ φίλτρο status — θέλουμε όλα) ----------
    @Query("""
            SELECT a.status AS status, COUNT(a) AS count
            FROM Appointment a
            WHERE a.startsAt >= :from
              AND a.startsAt < :to
            GROUP BY a.status
            """)
    List<StatusCountProjection> appointmentsByStatus(@Param("from") Instant from,
                                                     @Param("to") Instant to);

    // ---------- Projection interfaces ----------
    // Το Spring Data παράγει proxy που διαβάζει τα aliases (AS ...) του query

    interface PopularServiceProjection {
        Long getServiceId();
        String getServiceName();
        long getTimesBooked();
        BigDecimal getRevenue();
    }

    interface EmployeeStatProjection {
        Long getEmployeeProfileId();
        String getEmployeeName();
        long getAppointmentCount();
        BigDecimal getRevenue();
    }

    interface StatusCountProjection {
        AppointmentStatus getStatus();
        long getCount();
    }
}