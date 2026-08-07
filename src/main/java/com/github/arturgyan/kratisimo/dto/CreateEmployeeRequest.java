package com.github.arturgyan.kratisimo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.Set;

public record CreateEmployeeRequest(

        // ---- User fields ----
        @NotBlank(message = "Full name is required")
        String fullName,

        @NotBlank(message = "Email is required")
        @Email(message = "Must be a valid email")
        String email,

        @NotBlank(message = "Initial password is required")
        @Size(min = 8, message = "Password must be at least 8 characters")
        String password,

        // Τηλέφωνο προαιρετικό — καμία annotation
        String phone,

        // ---- EmployeeProfile fields ----
        String bio,        // προαιρετικό
        String photoUrl,   // προαιρετικό

        // ---- Services (many-to-many) ----
        // @NotEmpty — ο υπάλληλος ΠΡΕΠΕΙ να προσφέρει τουλάχιστον μία υπηρεσία (Απόφαση 1)
        @NotEmpty(message = "Employee must offer at least one service")
        Set<Long> serviceIds
) {}
