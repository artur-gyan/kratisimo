package com.github.arturgyan.kratisimo.repository;

import com.github.arturgyan.kratisimo.entity.EmployeeProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmployeeProfileRepository extends JpaRepository<EmployeeProfile, Long> {

    List<EmployeeProfile> findByActiveTrue();

    Optional<EmployeeProfile> findByUserId(Long userId);
}