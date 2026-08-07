package com.github.arturgyan.kratisimo.config;

import com.github.arturgyan.kratisimo.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // 1. CSRF off — δεν έχουμε sessions/cookies, το JWT δεν κινδυνεύει από CSRF
                .csrf(AbstractHttpConfigurer::disable)

                // 2. Stateless — ο server ΔΕΝ φτιάχνει HttpSession
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // 3. Ποιος βλέπει τι
                .authorizeHttpRequests(auth -> auth
                        // Public: ΜΟΝΟ login/register (whitelist, ΟΧΙ /** wildcard —
                        // αλλιώς κάθε νέο /api/auth/* endpoint γίνεται σιωπηλά public, π.χ. το /me)
                        .requestMatchers("/api/auth/login", "/api/auth/register").permitAll()

                        // Public: ό,τι βλέπει ο ανώνυμος πριν συνδεθεί
                        .requestMatchers("/api/services/**").permitAll()
                        .requestMatchers("/api/availability/**").permitAll()

                        // Public: reviews ανά υπάλληλο (ο πελάτης βλέπει rating ΠΡΙΝ επιλέξει).
                        // ⚠️ Πιο ΕΙΔΙΚΟΣ κανόνας — μπαίνει ΠΡΙΝ από τυχόν μελλοντικό /api/employees/**.
                        // HttpMethod.GET: ΜΟΝΟ ανάγνωση είναι public, τίποτα άλλο σε αυτό το path.
                        .requestMatchers(HttpMethod.GET, "/api/employees/*/reviews").permitAll()

                        // Admin-only (καλύπτει και /api/admin/reviews)
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        // Reviews (POST + /me): authenticated. Πέφτει και στο anyRequest,
                        // αλλά το κάνω ΡΗΤΟ για σαφήνεια — ένας αναγνώστης βλέπει την πρόθεση.
                        .requestMatchers("/api/reviews/**").authenticated()

                        // Οτιδήποτε άλλο (συμπεριλαμβανομένου του /api/auth/me) → έγκυρο token
                        .anyRequest().authenticated())

                // 4. Το δικό μας filter ΠΡΙΝ το username/password filter του Spring
                .addFilterBefore(jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }


    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}