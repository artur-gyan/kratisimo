package com.github.arturgyan.kratisimo.controller;

import com.github.arturgyan.kratisimo.dto.BusinessInfoResponse;
import com.github.arturgyan.kratisimo.entity.BusinessSettings;
import com.github.arturgyan.kratisimo.service.SettingsProvider;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public business info (landing σελίδα, ανώνυμος).
 * Ξεχωριστός public controller (D119: ένας controller = ένα επίπεδο πρόσβασης).
 */
@RestController
@RequestMapping("/api/business-info")
public class PublicBusinessController {

    private final SettingsProvider settingsProvider;

    public PublicBusinessController(SettingsProvider settingsProvider) {
        this.settingsProvider = settingsProvider;
    }

    @GetMapping
    public BusinessInfoResponse getBusinessInfo() {
        BusinessSettings s = settingsProvider.get();
        return new BusinessInfoResponse(
                s.getName(),
                s.getAddress(),
                s.getPhone(),
                s.getType()
        );
    }
}