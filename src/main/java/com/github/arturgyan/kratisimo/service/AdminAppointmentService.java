package com.github.arturgyan.kratisimo.service;

import com.github.arturgyan.kratisimo.dto.AdminAppointmentResponse;
import com.github.arturgyan.kratisimo.entity.Appointment;
import com.github.arturgyan.kratisimo.entity.AppointmentItem;
import com.github.arturgyan.kratisimo.entity.BusinessSettings;
import com.github.arturgyan.kratisimo.repository.AppointmentRepository;
import com.github.arturgyan.kratisimo.repository.BusinessSettingsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
public class AdminAppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final BusinessSettingsRepository businessSettingsRepository;

    public AdminAppointmentService(AppointmentRepository appointmentRepository,
                                   BusinessSettingsRepository businessSettingsRepository) {
        this.appointmentRepository = appointmentRepository;
        this.businessSettingsRepository = businessSettingsRepository;
    }

    // Ο client στέλνει LocalDate (from/to inclusive). Τα μετατρέπουμε σε Instant range
    // μέσω business timezone (D35/D100), half-open [from 00:00, to+1 00:00).
    @Transactional(readOnly = true)
    public List<AdminAppointmentResponse> getAppointmentsInRange(LocalDate from, LocalDate to) {
        ZoneId zone = loadZone();

        Instant fromInstant = from.atStartOfDay(zone).toInstant();
        Instant toInstant = to.plusDays(1).atStartOfDay(zone).toInstant();

        return appointmentRepository.findByStartsAtRange(fromInstant, toInstant).stream()
                .map(this::toResponse)
                .toList();
    }

    private ZoneId loadZone() {
        BusinessSettings settings = businessSettingsRepository
                .findById(BusinessSettings.SINGLETON_ID)
                .orElseThrow(() -> new IllegalStateException("Business settings not found"));
        return ZoneId.of(settings.getTimezone());
    }


    private AdminAppointmentResponse toResponse(Appointment a) {
        List<String> serviceNames = a.getItems().stream()
                .map(AppointmentItem::getService)
                .map(s -> s.getName())
                .toList();

        return new AdminAppointmentResponse(
                a.getId(),
                a.getEmployee().getId(),          // employeeProfileId
                a.getCustomer().getFullName(),
                a.getEmployee().getUser().getFullName(),
                a.getStartsAt(),
                a.getEndsAt(),
                a.getStatus(),
                a.getTotalPrice(),
                a.getTotalDurationMinutes(),
                serviceNames
        );
    }
}