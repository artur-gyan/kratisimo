package com.github.arturgyan.kratisimo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.Set;

public record UpdateEmployeeRequest(

        @NotBlank(message = "Full name is required")
        String fullName,

        String phone,        // προαιρετικό

        String bio,          // προαιρετικό
        String photoUrl,     // προαιρετικό

        @NotEmpty(message = "Employee must offer at least one service")
        Set<Long> serviceIds
) {}
