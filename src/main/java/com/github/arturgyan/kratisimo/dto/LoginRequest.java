package com.github.arturgyan.kratisimo.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(

        @NotBlank(message = "Το email είναι υποχρεωτικό")
        String email,

        @NotBlank(message = "Ο κωδικός είναι υποχρεωτικός")
        String password
) {}