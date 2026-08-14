package com.github.arturgyan.kratisimo.repository;

import com.github.arturgyan.kratisimo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * Data access για τον User.
 * Δεν χρειάζεται @Repository: το Spring Data φτιάχνει το proxy αυτόματα
 * επειδή το interface επεκτείνει JpaRepository.
 */
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    // Admin customer search (D141): μόνο ρόλος CUSTOMER, match σε όνομα Ή τηλέφωνο.
    // unaccent(lower(...)) = accent + case insensitive → «κω» βρίσκει «Κώστας».
    // nativeQuery: το unaccent() είναι Postgres function, δεν το ξέρει το JPQL.
    // :pattern έρχεται ΗΔΗ ως %text% από το service.
    @Query(value = """
            SELECT DISTINCT u.* FROM users u
            JOIN user_roles ur ON ur.user_id = u.id
            WHERE ur.role = 'CUSTOMER'
              AND (
                    unaccent(lower(u.full_name)) LIKE unaccent(lower(:pattern))
                 OR u.phone LIKE :pattern
              )
            ORDER BY u.full_name ASC
            """, nativeQuery = true)
    List<User> searchCustomers(@Param("pattern") String pattern);

    // Όλοι οι "καθαροί" CUSTOMER (χωρίς ADMIN/EMPLOYEE) — λίστα διαχείρισης πελατών.
    // NOT EXISTS: αποκλείει χρήστες που έχουν ΚΑΙ άλλο ρόλο (ο ιδιοκτήτης ADMIN+CUSTOMER
    // δεν εμφανίζεται εδώ — τον διαχειρίζεσαι αλλού, όχι ως "πελάτη").
    @Query(value = """
            SELECT u.* FROM users u
            JOIN user_roles ur ON ur.user_id = u.id
            WHERE ur.role = 'CUSTOMER'
              AND NOT EXISTS (
                    SELECT 1 FROM user_roles ur2
                    WHERE ur2.user_id = u.id AND ur2.role IN ('ADMIN', 'EMPLOYEE')
              )
            ORDER BY u.full_name ASC
            """, nativeQuery = true)
    List<User> findAllPureCustomers();
}