package com.github.arturgyan.kratisimo.dto;

public record AuthResponse(
        String token,
        String email,
        String fullName
) {}