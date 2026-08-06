package com.github.arturgyan.kratisimo.repository;

import com.github.arturgyan.kratisimo.entity.ServiceCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ServiceCategoryRepository extends JpaRepository<ServiceCategory, Long> {

    List<ServiceCategory> findByActiveTrueOrderByDisplayOrderAsc();

    // Derived query (D47, ≤3 conditions). Το Spring παράγει το SQL από το όνομα.
    // IgnoreCase → "Κουρέματα" και "κουρέματα" θεωρούνται διπλότυπα.
    boolean existsByNameIgnoreCase(String name);
}