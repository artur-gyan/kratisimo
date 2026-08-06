package com.github.arturgyan.kratisimo.dto;

// Ό,τι επιστρέφει το API. Έχει id + active (server-managed), σε αντίθεση με το request.
public record CategoryResponse(
        Long id,
        String name,
        int displayOrder,
        boolean active
) {}