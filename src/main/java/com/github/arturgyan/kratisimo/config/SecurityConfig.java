package com.github.arturgyan.kratisimo.config;

import com.github.arturgyan.kratisimo.security.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
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
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

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

                // CORS: χρησιμοποιεί το CorsConfigurationSource bean αν υπάρχει (prod).
                // Σε dev ΔΕΝ ορίζεται bean → default (κανένα cross-origin, το Vite proxy
                // κάνει same-origin ούτως ή άλλως).
                .cors(cors -> {})

                // 2. Stateless — ο server ΔΕΝ φτιάχνει HttpSession
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // 3. Ποιος βλέπει τι
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/login", "/api/auth/register").permitAll()

                        .requestMatchers("/api/services/**").permitAll()
                        .requestMatchers("/api/business-info").permitAll()
                        .requestMatchers("/api/availability/**").permitAll()

                        .requestMatchers(HttpMethod.GET, "/api/employees/*/reviews").permitAll()

                        .requestMatchers(HttpMethod.GET, "/api/employees/available").permitAll()

                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        .requestMatchers("/api/employee/**").hasRole("EMPLOYEE")

                        .requestMatchers("/api/reviews/**").authenticated()

                        .anyRequest().authenticated())

                // 4. Το δικό μας filter ΠΡΙΝ το username/password filter του Spring
                .addFilterBefore(jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * CORS config ΜΟΝΟ εκτός dev (production).
     *
     * Γιατί profile-gated: σε dev το Vite proxy προωθεί τα /api requests στο backend
     * σαν same-origin → κανένα CORS preflight, κανένα bean χρειάζεται. Σε production
     * frontend (π.χ. https://kratisimo.app) και backend (π.χ. https://api.kratisimo.app)
     * είναι διαφορετικά origins → ο browser απαιτεί CORS headers.
     *
     * Το origin έρχεται από env variable FRONTEND_ORIGIN (ίδια αρχή με τα secrets, D58).
     */
    @Bean
    @Profile("!dev")
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${frontend.origin}") String frontendOrigin) {

        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(frontendOrigin));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
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