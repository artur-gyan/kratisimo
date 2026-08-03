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

    // Query 3 — «τα ραντεβού μου» (customer view), νεότερα πρώτα
    List<Appointment> findByCustomerIdOrderByStartsAtDesc(Long customerId);

    // Query 4 — πρόγραμμα υπαλλήλου / admin σε date range
    @Query("SELECT a FROM Appointment a WHERE a.employee.id = :employeeId " +
            "AND a.startsAt BETWEEN :from AND :to ORDER BY a.startsAt")
    List<Appointment> findByEmployeeInRange(@Param("employeeId") Long employeeId,
                                            @Param("from") Instant from,
                                            @Param("to") Instant to);
}