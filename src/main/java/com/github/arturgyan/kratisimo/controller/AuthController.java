package com.github.arturgyan.kratisimo.controller;

import com.github.arturgyan.kratisimo.dto.AuthResponse;
import com.github.arturgyan.kratisimo.dto.LoginRequest;
import com.github.arturgyan.kratisimo.dto.MeResponse;
import com.github.arturgyan.kratisimo.dto.RegisterRequest;
import com.github.arturgyan.kratisimo.security.CustomUserDetails;
import com.github.arturgyan.kratisimo.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * HTTP endpoints του authentication. ΜΟΝΟ HTTP handling —
 * η λογική ζει στον AuthService.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    public ResponseEntity<MeResponse> me(
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(authService.getCurrentUser(principal.getUser()));
    }
}