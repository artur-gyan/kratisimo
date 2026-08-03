package com.github.arturgyan.kratisimo.repository;

import com.github.arturgyan.kratisimo.entity.WorkingHours;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.DayOfWeek;
import java.util.List;

public interface WorkingHoursRepository extends JpaRepository<WorkingHours, Long> {

    List<WorkingHours> findByEmployeeIdAndDayOfWeek(Long employeeId, DayOfWeek dayOfWeek);

    List<WorkingHours> findByEmployeeId(Long employeeId);
}