package com.github.arturgyan.kratisimo.security;

import com.github.arturgyan.kratisimo.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/**
 * Adapter: τυλίγει τον δικό μας User ώστε να τον καταλαβαίνει το Spring Security.
 * Κρατάμε ΟΛΟΚΛΗΡΟ τον User (όχι μόνο email/password) για να έχουμε πρόσβαση
 * σε id/fullName αργότερα μέσα στους controllers.
 */
public class CustomUserDetails implements UserDetails {

    private final User user;

    public CustomUserDetails(User user) {
        this.user = user;
    }

    /** Το «κλειδί» ταυτότητας. ΓΙΑ ΕΜΑΣ = email (δεν έχουμε username πεδίο). */
    @Override
    public String getUsername() {
        return user.getEmail();
    }

    /** Το ΗΔΗ hashαρισμένο password από τη βάση. Ο έλεγχος γίνεται αλλού. */
    @Override
    public String getPassword() {
        return user.getPasswordHash();
    }

    /**
     * Οι ρόλοι, μετατραπμένοι σε GrantedAuthority.
     * Βάζουμε prefix "ROLE_" → μας επιτρέπει να χρησιμοποιούμε hasRole('ADMIN').
     * (Η απόφαση prefix-vs-όχι που ανέφερα νωρίτερα: επιλέγουμε ΕΠΙΛΟΓΗ Α.)
     */
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return user.getRoles().stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role.name()))
                .toList();
    }

    /**
     * Τα 4 boolean flags: το Spring τα ελέγχει πριν επιτρέψει login.
     * Χαρτογραφούμε το ΔΙΚΟ μας user.active στο enabled.
     * Τα υπόλοιπα 3 → true (δεν υλοποιούμε expiry/locking, εκτός scope).
     */
    @Override
    public boolean isEnabled() {
        return user.isActive();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    /** Getter για να φτάνουμε στον User (id, fullName) από τους controllers. */
    public User getUser() {
        return user;
    }
}