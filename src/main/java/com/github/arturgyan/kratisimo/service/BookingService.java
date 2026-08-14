package com.github.arturgyan.kratisimo.service;

import com.github.arturgyan.kratisimo.dto.AdminBookingRequest;
import com.github.arturgyan.kratisimo.dto.BookingRequest;
import com.github.arturgyan.kratisimo.dto.BookingResponse;
import com.github.arturgyan.kratisimo.entity.*;
import com.github.arturgyan.kratisimo.enums.AppointmentStatus;
import com.github.arturgyan.kratisimo.exception.SlotUnavailableException;
import com.github.arturgyan.kratisimo.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.github.arturgyan.kratisimo.dto.AppointmentBookedEvent;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class BookingService {

    private final ServiceOfferingRepository serviceOfferingRepository;
    private final EmployeeProfileRepository employeeProfileRepository;
    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final AvailabilityService availabilityService;
    private final SettingsProvider settingsProvider;

    public BookingService(ServiceOfferingRepository serviceOfferingRepository,
                          EmployeeProfileRepository employeeProfileRepository,
                          AppointmentRepository appointmentRepository,
                          UserRepository userRepository,
                          ApplicationEventPublisher eventPublisher,
                          AvailabilityService availabilityService,
                          SettingsProvider settingsProvider) {
        this.serviceOfferingRepository = serviceOfferingRepository;
        this.employeeProfileRepository = employeeProfileRepository;
        this.appointmentRepository = appointmentRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
        this.availabilityService = availabilityService;
        this.settingsProvider = settingsProvider;
    }

    @Transactional
    public BookingResponse book(BookingRequest request, Long customerId) {

        Set<Long> uniqueIds = new HashSet<>(request.serviceIds());
        if (uniqueIds.size() != request.serviceIds().size()) {
            throw new IllegalArgumentException("Duplicate services are not allowed");
        }

        List<ServiceOffering> services =
                serviceOfferingRepository.findAllById(request.serviceIds());

        if (services.size() != request.serviceIds().size()) {
            throw new IllegalArgumentException("One or more services do not exist");
        }

        boolean allActive = services.stream().allMatch(ServiceOffering::isActive);
        if (!allActive) {
            throw new IllegalArgumentException("One or more services are not available");
        }

        EmployeeProfile employee = null;
        if (request.employeeId() != null) {
            employee = employeeProfileRepository.findById(request.employeeId())
                    .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

            if (!employee.isActive()) {
                throw new IllegalArgumentException("Employee is not available");
            }

            // Ο πελάτης δεν μπορεί να κλείσει ραντεβού με τον εαυτό του.
            if (employee.getUser().getId().equals(customerId)) {
                throw new IllegalArgumentException(
                        "You cannot book an appointment with yourself");
            }
        }

        int totalDuration = services.stream()
                .mapToInt(ServiceOffering::getDurationMinutes)
                .sum();

        BusinessSettings settings = settingsProvider.get();
        int granularity = settings.getSlotGranularityMinutes();
        ZoneId zone = ZoneId.of(settings.getTimezone());

        int effectiveDuration = ((totalDuration + granularity - 1) / granularity) * granularity;

        Instant startsAt = request.startsAt();
        Instant endsAt = startsAt.plus(effectiveDuration, ChronoUnit.MINUTES);

        List<AppointmentStatus> blockingStatuses = Arrays.stream(AppointmentStatus.values())
                .filter(AppointmentStatus::blocksTime)
                .toList();

        if (employee == null) {
            List<EmployeeProfile> candidates = employeeProfileRepository
                    .findByOfferingAllServices(request.serviceIds(), request.serviceIds().size());

            if (candidates.isEmpty()) {
                throw new IllegalArgumentException(
                        "No employee offers all the selected services");
            }

            EmployeeProfile leastLoaded = null;
            long minLoad = Long.MAX_VALUE;

            Instant dayStart = startsAt.truncatedTo(ChronoUnit.DAYS);
            Instant dayEnd = dayStart.plus(1, ChronoUnit.DAYS);

            for (EmployeeProfile candidate : candidates) {
                // Ο πελάτης δεν μπορεί να είναι ο ίδιος ο υπάλληλος (self-booking).
                if (candidate.getUser().getId().equals(customerId)) {
                    continue;
                }
                boolean occupied = appointmentRepository.existsOverlapping(
                        candidate.getId(), startsAt, endsAt, blockingStatuses);
                if (occupied) {
                    continue;
                }
                if (!availabilityService.isWithinWorkingHours(
                        candidate.getId(), startsAt, endsAt, zone)) {
                    continue;
                }

                long load = appointmentRepository
                        .findByEmployeeInRange(candidate.getId(), dayStart, dayEnd)
                        .stream()
                        .filter(a -> a.getStatus().blocksTime())
                        .mapToLong(Appointment::getTotalDurationMinutes)
                        .sum();

                if (load < minLoad) {
                    minLoad = load;
                    leastLoaded = candidate;
                }
            }

            if (leastLoaded == null) {
                throw new SlotUnavailableException(
                        "No employee is available for the selected time");
            }

            employee = leastLoaded;
        }

        if (request.employeeId() != null) {
            availabilityService.validateWithinWorkingHours(employee.getId(), startsAt, endsAt);
        }

        boolean occupied = appointmentRepository.existsOverlapping(
                employee.getId(), startsAt, endsAt, blockingStatuses);
        if (occupied) {
            throw new SlotUnavailableException("This time slot is no longer available");
        }

        BigDecimal totalPrice = services.stream()
                .map(ServiceOffering::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Appointment appointment = new Appointment();
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new IllegalStateException("Customer not found"));
        appointment.setCustomer(customer);

        appointment.setEmployee(employee);
        appointment.setStartsAt(startsAt);
        appointment.setEndsAt(endsAt);
        appointment.setStatus(AppointmentStatus.CONFIRMED);
        appointment.setTotalPrice(totalPrice);
        appointment.setTotalDurationMinutes(effectiveDuration);

        int sortOrder = 0;
        for (ServiceOffering service : services) {
            AppointmentItem item = new AppointmentItem();
            item.setService(service);
            item.setPriceSnapshot(service.getPrice());
            item.setDurationSnapshot(service.getDurationMinutes());
            item.setSortOrder(sortOrder++);
            appointment.addItem(item);
        }

        Appointment saved = appointmentRepository.save(appointment);

        String employeeName = employee.getUser().getFullName();

        List<String> serviceNames = services.stream()
                .map(ServiceOffering::getName)
                .toList();

        AppointmentBookedEvent event = new AppointmentBookedEvent(
                customer.getEmail(),
                customer.getFullName(),
                employeeName,
                saved.getStartsAt(),
                serviceNames,
                saved.getTotalPrice()
        );
        eventPublisher.publishEvent(event);

        return new BookingResponse(
                saved.getId(),
                employeeName,
                saved.getStartsAt(),
                saved.getEndsAt(),
                saved.getTotalPrice(),
                saved.getTotalDurationMinutes(),
                saved.getStatus().name(),
                serviceNames
        );
    }

    @Transactional
    public BookingResponse adminBook(AdminBookingRequest request) {

        boolean hasCustomer = request.customerId() != null;
        boolean hasGuest = request.guestName() != null && !request.guestName().isBlank();

        if (hasCustomer == hasGuest) {
            throw new IllegalArgumentException(
                    "Provide either a customer or guest details, not both or neither");
        }

        Set<Long> uniqueIds = new HashSet<>(request.serviceIds());
        if (uniqueIds.size() != request.serviceIds().size()) {
            throw new IllegalArgumentException("Duplicate services are not allowed");
        }

        List<ServiceOffering> services =
                serviceOfferingRepository.findAllById(request.serviceIds());

        if (services.size() != request.serviceIds().size()) {
            throw new IllegalArgumentException("One or more services do not exist");
        }

        boolean allActive = services.stream().allMatch(ServiceOffering::isActive);
        if (!allActive) {
            throw new IllegalArgumentException("One or more services are not available");
        }

        EmployeeProfile employee = null;
        if (request.employeeId() != null) {
            employee = employeeProfileRepository.findById(request.employeeId())
                    .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

            if (!employee.isActive()) {
                throw new IllegalArgumentException("Employee is not available");
            }
        }

        int totalDuration = services.stream()
                .mapToInt(ServiceOffering::getDurationMinutes)
                .sum();

        BusinessSettings settings = settingsProvider.get();
        int granularity = settings.getSlotGranularityMinutes();

        int effectiveDuration = ((totalDuration + granularity - 1) / granularity) * granularity;

        Instant startsAt = request.startsAt();
        Instant endsAt = startsAt.plus(effectiveDuration, ChronoUnit.MINUTES);

        List<AppointmentStatus> blockingStatuses = Arrays.stream(AppointmentStatus.values())
                .filter(AppointmentStatus::blocksTime)
                .toList();

        if (employee == null) {
            List<EmployeeProfile> candidates = employeeProfileRepository
                    .findByOfferingAllServices(request.serviceIds(), request.serviceIds().size());

            if (candidates.isEmpty()) {
                throw new IllegalArgumentException(
                        "No employee offers all the selected services");
            }

            EmployeeProfile leastLoaded = null;
            long minLoad = Long.MAX_VALUE;

            Instant dayStart = startsAt.truncatedTo(ChronoUnit.DAYS);
            Instant dayEnd = dayStart.plus(1, ChronoUnit.DAYS);

            for (EmployeeProfile candidate : candidates) {
                boolean busy = appointmentRepository.existsOverlapping(
                        candidate.getId(), startsAt, endsAt, blockingStatuses);
                if (busy) {
                    continue;
                }

                long load = appointmentRepository
                        .findByEmployeeInRange(candidate.getId(), dayStart, dayEnd)
                        .stream()
                        .filter(a -> a.getStatus().blocksTime())
                        .mapToLong(Appointment::getTotalDurationMinutes)
                        .sum();

                if (load < minLoad) {
                    minLoad = load;
                    leastLoaded = candidate;
                }
            }

            if (leastLoaded == null) {
                throw new SlotUnavailableException(
                        "No employee is available for the selected time");
            }

            employee = leastLoaded;
        }

        boolean occupied = appointmentRepository.existsOverlapping(
                employee.getId(), startsAt, endsAt, blockingStatuses);
        if (occupied) {
            throw new SlotUnavailableException("This time slot is no longer available");
        }

        BigDecimal totalPrice = services.stream()
                .map(ServiceOffering::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Appointment appointment = new Appointment();

        User customer = null;
        if (hasCustomer) {
            customer = userRepository.findById(request.customerId())
                    .orElseThrow(() -> new IllegalArgumentException("Customer not found"));
            appointment.setCustomer(customer);
        } else {
            appointment.setGuestName(request.guestName().trim());
            appointment.setGuestPhone(
                    request.guestPhone() != null ? request.guestPhone().trim() : null);
        }

        appointment.setEmployee(employee);
        appointment.setStartsAt(startsAt);
        appointment.setEndsAt(endsAt);
        appointment.setStatus(AppointmentStatus.CONFIRMED);
        appointment.setTotalPrice(totalPrice);
        appointment.setTotalDurationMinutes(effectiveDuration);

        int sortOrder = 0;
        for (ServiceOffering service : services) {
            AppointmentItem item = new AppointmentItem();
            item.setService(service);
            item.setPriceSnapshot(service.getPrice());
            item.setDurationSnapshot(service.getDurationMinutes());
            item.setSortOrder(sortOrder++);
            appointment.addItem(item);
        }

        Appointment saved = appointmentRepository.save(appointment);

        String employeeName = employee.getUser().getFullName();
        List<String> serviceNames = services.stream()
                .map(ServiceOffering::getName)
                .toList();

        if (hasCustomer) {
            AppointmentBookedEvent event = new AppointmentBookedEvent(
                    customer.getEmail(),
                    customer.getFullName(),
                    employeeName,
                    saved.getStartsAt(),
                    serviceNames,
                    saved.getTotalPrice()
            );
            eventPublisher.publishEvent(event);
        }

        return new BookingResponse(
                saved.getId(),
                employeeName,
                saved.getStartsAt(),
                saved.getEndsAt(),
                saved.getTotalPrice(),
                saved.getTotalDurationMinutes(),
                saved.getStatus().name(),
                serviceNames
        );
    }
}