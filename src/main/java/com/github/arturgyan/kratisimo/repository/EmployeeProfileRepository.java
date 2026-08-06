package com.github.arturgyan.kratisimo.repository;

import com.github.arturgyan.kratisimo.entity.EmployeeProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EmployeeProfileRepository extends JpaRepository<EmployeeProfile, Long> {

    // Employees (active) που προσφέρουν ΟΛΕΣ τις ζητούμενες υπηρεσίες.
    // JOIN στο many-to-many + GROUP BY + HAVING COUNT = "όλες", όχι "έστω μία".
    // Προϋπόθεση ορθότητας: τα serviceIds είναι μοναδικά (D77 το εγγυάται) —
    // αλλιώς το COUNT θα φούσκωνε.
    @Query("SELECT e FROM EmployeeProfile e " +
            "JOIN e.services s " +
            "WHERE e.active = true AND s.id IN :serviceIds " +
            "GROUP BY e " +
            "HAVING COUNT(s.id) = :count")
    List<EmployeeProfile> findByOfferingAllServices(
            @Param("serviceIds") List<Long> serviceIds,
            @Param("count") long count);

    List<EmployeeProfile> findByActiveTrue();

    Optional<EmployeeProfile> findByUserId(Long userId);
}