package com.github.arturgyan.kratisimo.dto;

import java.util.List;

public record EmployeeResponse(
        Long employeeProfileId,   // το id του EmployeeProfile (όχι του User)
        Long userId,
        String fullName,
        String email,
        String phone,
        String bio,
        String photoUrl,
        boolean active,           // employeeProfile.active — εμφανίζεται στην κράτηση (D36)
        List<ServiceSummary> services
) {
    // Nested record — ελάχιστη περιγραφή υπηρεσίας, όχι ολόκληρο το ServiceOffering
    public record ServiceSummary(
            Long id,
            String name
    ) {}
}