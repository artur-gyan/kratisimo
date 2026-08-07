package com.github.arturgyan.kratisimo.controller;

import com.github.arturgyan.kratisimo.dto.SettingsRequest;
import com.github.arturgyan.kratisimo.dto.SettingsResponse;
import com.github.arturgyan.kratisimo.service.SettingsService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/settings")   // D94 — hasRole(ADMIN)
public class SettingsController {

    private final SettingsService settingsService;

    public SettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping
    public SettingsResponse getSettings() {
        return settingsService.getSettings();
    }

    @PutMapping
    public SettingsResponse updateSettings(@Valid @RequestBody SettingsRequest request) {
        return settingsService.updateSettings(request);
    }
}