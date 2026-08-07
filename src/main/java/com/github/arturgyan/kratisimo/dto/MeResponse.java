package com.github.arturgyan.kratisimo.dto;

import com.github.arturgyan.kratisimo.enums.Role;
import java.util.Set;

public record MeResponse(
        Long id,
        String email,
        String fullName,
        Set<Role> roles
) {}