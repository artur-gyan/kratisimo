package com.github.arturgyan.kratisimo.service;

import com.github.arturgyan.kratisimo.dto.AuthResponse;
import com.github.arturgyan.kratisimo.dto.LoginRequest;
import com.github.arturgyan.kratisimo.dto.MeResponse;
import com.github.arturgyan.kratisimo.dto.RegisterRequest;
import com.github.arturgyan.kratisimo.entity.User;
import com.github.arturgyan.kratisimo.enums.Role;
import com.github.arturgyan.kratisimo.repository.UserRepository;
import com.github.arturgyan.kratisimo.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Set;

/**
 * Business logic του authentication. Ο controller χειρίζεται HTTP,
 * ΕΔΩ ζει το "τι σημαίνει register/login".
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
    }

    /**
     * Εγγραφή: έλεγχος διπλού email → hash κωδικού → save → token.
     */
    public AuthResponse register(RegisterRequest request) {

        // Έλεγχος ΠΡΙΝ το save: το email UNIQUE constraint θα έσκαγε στη βάση,
        // αλλά ο έλεγχος εδώ δίνει καθαρό μήνυμα αντί για DB exception.
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already registered");
        }

        User user = new User();
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password())); // hash ΕΔΩ
        user.setFullName(request.fullName());
        user.setPhone(request.phone());
        user.setActive(true);
        user.setRoles(Set.of(Role.CUSTOMER)); // κάθε νέα εγγραφή = CUSTOMER

        userRepository.save(user);

        String token = jwtService.generateToken(user.getEmail());
        return new AuthResponse(token, user.getEmail(), user.getFullName());
    }

    /**
     * Login: επαλήθευση credentials μέσω AuthenticationManager → token.
     */
    public AuthResponse login(LoginRequest request) {

        // Ο AuthenticationManager κάνει ΟΛΗ τη δουλειά:
        // φέρνει τον χρήστη (UserDetailsService) + συγκρίνει password (PasswordEncoder).
        // Αν αποτύχει → πετάει AuthenticationException (→ 401 στον controller).
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.email(),
                        request.password()));

        // Φτάνουμε εδώ ΜΟΝΟ αν το authenticate πέτυχε. Το orElseThrow καλύπτει
        // το οριακό race: authenticated αλλά ο χρήστης διαγράφηκε στο μεσοδιάστημα.
        // IllegalStateException → 500 με ΚΑΤΑΝΟΗΤΟ μήνυμα (όχι το αόριστο catch-all).
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalStateException(
                        "User authenticated but not found: " + request.email()));

        String token = jwtService.generateToken(user.getEmail());
        return new AuthResponse(token, user.getEmail(), user.getFullName());
    }
    public MeResponse getCurrentUser(User user) {
        return new MeResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRoles()
        );
    }
}