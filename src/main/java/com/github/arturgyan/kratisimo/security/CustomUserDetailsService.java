package com.github.arturgyan.kratisimo.security;

import com.github.arturgyan.kratisimo.entity.User;
import com.github.arturgyan.kratisimo.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Η γέφυρα Spring Security ↔ βάση.
 * ΜΟΝΗ δουλειά: email → φέρε τον User → τύλιξέ τον σε UserDetails.
 * ΔΕΝ ελέγχει password (αυτό το κάνει ο AuthenticationManager μετά).
 */
@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    // Constructor injection — το Spring περνάει το UserRepository αυτόματα.
    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Το Spring Security καλεί ΑΥΤΗ τη μέθοδο κατά το login.
     * Η παράμετρος λέγεται "username" (σύμβαση του framework) αλλά η τιμή = email.
     */
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new UsernameNotFoundException("Δεν βρέθηκε χρήστης με email: " + email));

        return new CustomUserDetails(user);
    }
}