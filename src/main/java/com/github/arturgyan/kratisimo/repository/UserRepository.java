package com.github.arturgyan.kratisimo.repository;

import com.github.arturgyan.kratisimo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * Data access για τον User.
 * Δεν χρειάζεται @Repository: το Spring Data φτιάχνει το proxy αυτόματα
 * επειδή το interface επεκτείνει JpaRepository.
 */
public interface UserRepository extends JpaRepository<User, Long> {

    // Optional: ο χρήστης μπορεί να μην υπάρχει. Ο compiler μας υποχρεώνει
    // να χειριστούμε το "δεν βρέθηκε" (orElseThrow) αντί για σιωπηλό null -> NPE.
    Optional<User> findByEmail(String email);

    // existsBy αντί για findByEmail().isPresent(): επιστρέφει COUNT>0 (boolean),
    // δεν φορτώνει ολόκληρο το User (+ το EAGER roles collection) για έναν έλεγχο ύπαρξης.
    boolean existsByEmail(String email);
}