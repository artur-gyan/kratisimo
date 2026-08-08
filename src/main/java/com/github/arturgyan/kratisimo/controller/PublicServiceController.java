package com.github.arturgyan.kratisimo.controller;

import com.github.arturgyan.kratisimo.dto.PublicServiceResponse;
import com.github.arturgyan.kratisimo.service.ServiceOfferingService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class PublicServiceController {

    private final ServiceOfferingService offeringService;

    public PublicServiceController(ServiceOfferingService offeringService) {
        this.offeringService = offeringService;
    }

    // GET /api/services — μόνο active, public-safe (χωρίς active flag).
    @GetMapping("/api/services")
    public List<PublicServiceResponse> getActiveServices() {
        return offeringService.findAllActive();
    }
}