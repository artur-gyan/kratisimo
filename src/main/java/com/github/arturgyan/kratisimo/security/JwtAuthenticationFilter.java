package com.github.arturgyan.kratisimo.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Τρέχει σε ΚΑΘΕ request. Αν υπάρχει έγκυρο JWT, γεμίζει το SecurityContext.
 * ΔΕΝ απορρίπτει ποτέ request — η απόφαση πρόσβασης ανήκει στη SecurityFilterChain.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String HEADER = "Authorization";
    private static final String PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtService jwtService,
                                   CustomUserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader(HEADER);

        // Δεν υπάρχει token → ανώνυμος. Προωθούμε ΧΩΡΙΣ να πειράξουμε το context.
        if (authHeader == null || !authHeader.startsWith(PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(PREFIX.length());

        // Ήδη authenticated σε αυτό το request; Μην το ξανακάνεις.
        if (jwtService.isTokenValid(token)
                && SecurityContextHolder.getContext().getAuthentication() == null) {

            String email = jwtService.extractEmail(token);

            // ΕΠΙΛΟΓΗ Β: φρέσκα δεδομένα από τη βάση σε κάθε request.
            // Πετάει UsernameNotFoundException αν ο χρήστης διαγράφηκε.
            UserDetails userDetails = userDetailsService.loadUserByUsername(email);

            // Ο χρήστης απενεργοποιήθηκε; (user.active = false, D36)
            if (userDetails.isEnabled()) {
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,                    // principal
                                null,                           // credentials — ΠΟΤΕ password εδώ
                                userDetails.getAuthorities());  // ROLE_ADMIN κλπ

                authentication.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }

        filterChain.doFilter(request, response);
    }
}