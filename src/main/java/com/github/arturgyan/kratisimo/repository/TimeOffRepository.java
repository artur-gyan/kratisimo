package com.github.arturgyan.kratisimo.repository;

import com.github.arturgyan.kratisimo.entity.TimeOff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface TimeOffRepository extends JpaRepository<TimeOff, Long> {

    @Query("SELECT t FROM TimeOff t WHERE t.employee.id = :employeeId " +
            "AND t.startsAt < :dayEnd AND t.endsAt > :dayStart")
    List<TimeOff> findOverlapping(@Param("employeeId") Long employeeId,
                                  @Param("dayStart") Instant dayStart,
                                  @Param("dayEnd") Instant dayEnd);

    // Νέο: όλες οι άδειες ενός υπαλλήλου, ταξινομημένες (για το list()) — D48 pattern.
    List<TimeOff> findByEmployeeIdOrderByStartsAtAsc(Long employeeId);
}