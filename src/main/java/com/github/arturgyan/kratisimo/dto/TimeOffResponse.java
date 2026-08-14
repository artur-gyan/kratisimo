package com.github.arturgyan.kratisimo.dto;

import java.time.Instant;

public record TimeOffResponse(

        Long id,

        Instant startsAt,

        Instant endsAt,

        String reason

) {}
