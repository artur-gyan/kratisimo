package com.github.arturgyan.kratisimo.service;

import com.github.arturgyan.kratisimo.dto.AdminAppointmentResponse;
import com.github.arturgyan.kratisimo.dto.AppointmentCancelledEvent;
import com.github.arturgyan.kratisimo.dto.AppointmentCompletedEvent;
import com.github.arturgyan.kratisimo.dto.RescheduleRequest;
import com.github.arturgyan.kratisimo.entity.Appointment;
import com.github.arturgyan.kratisimo.entity.AppointmentItem;
import com.github.arturgyan.kratisimo.entity.EmployeeProfile;
import com.github.arturgyan.kratisimo.enums.AppointmentStatus;
import com.github.arturgyan.kratisimo.exception.SlotUnavailableException;
import com.github.arturgyan.kratisimo.repository.AppointmentRepository;
import com.github.arturgyan.kratisimo.repository.EmployeeProfileRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;

@Service
public class AdminAppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final EmployeeProfileRepository employeeProfileRepository;
    private final SettingsProvider settingsProvider;
    private final ApplicationEventPublisher eventPublisher;

    public AdminAppointmentService(AppointmentRepository appointmentRepository,
                                   EmployeeProfileRepository employeeProfileRepository,
                                   SettingsProvider settingsProvider,
                                   ApplicationEventPublisher eventPublisher) {
        this.appointmentRepository = appointmentRepository;
        this.employeeProfileRepository = employeeProfileRepository;
        this.settingsProvider = settingsProvider;
        this.eventPublisher = eventPublisher;
    }

    @Transactional(readOnly = true)
    public List<AdminAppointmentResponse> getAppointmentsInRange(LocalDate from, LocalDate to) {
        ZoneId zone = settingsProvider.getZone();

        Instant fromInstant = from.atStartOfDay(zone).toInstant();
        Instant toInstant = to.plusDays(1).atStartOfDay(zone).toInstant();

        return appointmentRepository.findByStartsAtRange(fromInstant, toInstant).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminAppointmentResponse> getByStatusInRange(
            AppointmentStatus status, LocalDate from, LocalDate to) {
        ZoneId zone = settingsProvider.getZone();
        Instant fromInstant = from.atStartOfDay(zone).toInstant();
        Instant toInstant = to.plusDays(1).atStartOfDay(zone).toInstant();

        return appointmentRepository.findByStatusInRange(status, fromInstant, toInstant).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void changeStatus(Long appointmentId, AppointmentStatus target) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));

        AppointmentStatus current = appointment.getStatus();

        boolean valid =
                (current == AppointmentStatus.CONFIRMED && target == AppointmentStatus.COMPLETED)
                        || (current == AppointmentStatus.CONFIRMED && target == AppointmentStatus.CANCELLED);

        if (!valid) {
            throw new IllegalArgumentException(
                    "Cannot change status from " + current + " to " + target);
        }

        appointment.setStatus(target);

        if (target == AppointmentStatus.CANCELLED) {
            appointment.setCancelledAt(Instant.now());
            appointment.setCancellationReason("Cancelled by admin");
        }

        // ── Email event ΜΟΝΟ για registered customer (guest δεν έχει email) ──
        // Διαβάζουμε flat τιμές ΕΔΩ (transaction ανοιχτό, lazy proxies resolve),
        // ο listener παίρνει έτοιμο snapshot (D105). Publish μετά το commit (AFTER_COMMIT).
        if (appointment.getCustomer() != null) {
            String customerEmail = appointment.getCustomer().getEmail();
            String customerName = appointment.getCustomer().getFullName();
            String employeeName = appointment.getEmployee().getUser().getFullName();
            List<String> serviceNames = appointment.getItems().stream()
                    .map(item -> item.getService().getName())
                    .toList();

            if (target == AppointmentStatus.CANCELLED) {
                eventPublisher.publishEvent(new AppointmentCancelledEvent(
                        customerEmail, customerName, employeeName,
                        appointment.getStartsAt(), serviceNames));
            } else if (target == AppointmentStatus.COMPLETED) {
                eventPublisher.publishEvent(new AppointmentCompletedEvent(
                        customerEmail, customerName, employeeName,
                        appointment.getStartsAt(), serviceNames));
            }
        }
    }

    @Transactional
    public void reschedule(Long appointmentId, RescheduleRequest request) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));

        if (appointment.getStatus() != AppointmentStatus.CONFIRMED) {
            throw new IllegalArgumentException(
                    "Only confirmed appointments can be rescheduled");
        }

        if (appointment.getStartsAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException(
                    "Past appointments cannot be rescheduled");
        }

        EmployeeProfile employee = appointment.getEmployee();
        if (request.employeeId() != null
                && !request.employeeId().equals(employee.getId())) {
            employee = employeeProfileRepository.findById(request.employeeId())
                    .orElseThrow(() -> new IllegalArgumentException("Employee not found"));
            if (!employee.isActive()) {
                throw new IllegalArgumentException("Employee is not available");
            }
        }

        Instant newStartsAt = request.startsAt();
        Instant newEndsAt = newStartsAt.plus(
                appointment.getTotalDurationMinutes(), ChronoUnit.MINUTES);

        List<AppointmentStatus> blockingStatuses = Arrays.stream(AppointmentStatus.values())
                .filter(AppointmentStatus::blocksTime)
                .toList();

        boolean occupied = appointmentRepository.existsOverlappingExcluding(
                employee.getId(), appointment.getId(), newStartsAt, newEndsAt, blockingStatuses);
        if (occupied) {
            throw new SlotUnavailableException("This time slot is no longer available");
        }

        appointment.setEmployee(employee);
        appointment.setStartsAt(newStartsAt);
        appointment.setEndsAt(newEndsAt);
    }

    private AdminAppointmentResponse toResponse(Appointment a) {
        List<String> serviceNames = a.getItems().stream()
                .map(AppointmentItem::getService)
                .map(s -> s.getName())
                .toList();

        String customerName = (a.getCustomer() != null)
                ? a.getCustomer().getFullName()
                : a.getGuestName();

        return new AdminAppointmentResponse(
                a.getId(),
                a.getEmployee().getId(),
                customerName,
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