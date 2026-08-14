package com.github.arturgyan.kratisimo.dto;

import com.github.arturgyan.kratisimo.enums.BusinessType;

/**
 * Public business info για τη landing (ανώνυμος χρήστης).
 * ΥΠΟΣΥΝΟΛΟ του SettingsResponse — μόνο δημόσια πεδία (όνομα/διεύθυνση/τηλέφωνο/τύπος).
 * ΟΧΙ granularity/leadTime/email/setupCompleted (εσωτερικά, D109 αρχή: DTO ανά σκοπό).
 */
public record BusinessInfoResponse(
        String name,
        String address,
        String phone,
        BusinessType businessType
) {}