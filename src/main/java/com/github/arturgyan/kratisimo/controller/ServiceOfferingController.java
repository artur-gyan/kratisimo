package com.github.arturgyan.kratisimo.controller;

import com.github.arturgyan.kratisimo.dto.ServiceOfferingRequest;
import com.github.arturgyan.kratisimo.dto.ServiceOfferingResponse;
import com.github.arturgyan.kratisimo.service.ServiceOfferingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/services")   // D94 — URL-based auth, hasRole(ADMIN) στο SecurityConfig
public class ServiceOfferingController {

    private final ServiceOfferingService offeringService;

    public ServiceOfferingController(ServiceOfferingService offeringService) {
        this.offeringService = offeringService;
    }

    // ---------- CREATE → 201 ----------
    @PostMapping
    public ResponseEntity<ServiceOfferingResponse> create(
            @Valid @RequestBody ServiceOfferingRequest request) {
        ServiceOfferingResponse created = offeringService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // ---------- READ list → 200 ----------
    @GetMapping
    public List<ServiceOfferingResponse> findAll() {
        return offeringService.findAll();
    }

    // ---------- READ single → 200 ----------
    @GetMapping("/{id}")
    public ServiceOfferingResponse findById(@PathVariable Long id) {
        return offeringService.findById(id);
    }

    // ---------- UPDATE → 200 ----------
    @PutMapping("/{id}")
    public ServiceOfferingResponse update(
            @PathVariable Long id,
            @Valid @RequestBody ServiceOfferingRequest request) {
        return offeringService.update(id, request);
    }

    // ---------- DELETE (soft) → 204 ----------
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        offeringService.delete(id);
    }
}