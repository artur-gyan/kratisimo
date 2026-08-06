package com.github.arturgyan.kratisimo.service;

import com.github.arturgyan.kratisimo.dto.BookingRequest;
import com.github.arturgyan.kratisimo.dto.BookingResponse;
import com.github.arturgyan.kratisimo.entity.*;
import com.github.arturgyan.kratisimo.enums.AppointmentStatus;
import com.github.arturgyan.kratisimo.exception.SlotUnavailableException;
import com.github.arturgyan.kratisimo.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
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
    private final BusinessSettingsRepository businessSettingsRepository;
    private final UserRepository userRepository;

    public BookingService(ServiceOfferingRepository serviceOfferingRepository,
                          EmployeeProfileRepository employeeProfileRepository,
                          AppointmentRepository appointmentRepository,
                          BusinessSettingsRepository businessSettingsRepository,
                          UserRepository userRepository) {
        this.serviceOfferingRepository = serviceOfferingRepository;
        this.employeeProfileRepository = employeeProfileRepository;
        this.appointmentRepository = appointmentRepository;
        this.businessSettingsRepository = businessSettingsRepository;
        this.userRepository = userRepository;
    }

    /**
     * Κλείνει ραντεβού. ΟΛΟΚΛΗΡΟ μέσα σε μία transaction (D19):
     * είτε όλα πετυχαίνουν (Appointment + Items + snapshots), είτε τίποτα.
     *
     * @param request    τι ζήτησε ο client (services, employee ή null=any, startsAt)
     * @param customerId ΑΠΟ ΤΟ TOKEN (D52) — ποτέ από το request
     */
    @Transactional
    public BookingResponse book(BookingRequest request, Long customerId) {

        // ── ΣΤΑΔΙΟ 2α: Έλεγχος διπλότυπων ΠΡΙΝ τη βάση ──
        Set<Long> uniqueIds = new HashSet<>(request.serviceIds());
        if (uniqueIds.size() != request.serviceIds().size()) {
            throw new IllegalArgumentException("Duplicate services are not allowed");
        }

        // ── ΣΤΑΔΙΟ 2β: Φόρτωση & έλεγχος υπηρεσιών ──
        List<ServiceOffering> services =
                serviceOfferingRepository.findAllById(request.serviceIds());

        if (services.size() != request.serviceIds().size()) {
            throw new IllegalArgumentException("One or more services do not exist");
        }

        boolean allActive = services.stream().allMatch(ServiceOffering::isActive);
        if (!allActive) {
            throw new IllegalArgumentException("One or more services are not available");
        }

        // ── ΣΤΑΔΙΟ 2γ: Φόρτωση employee (ΑΝ δόθηκε συγκεκριμένος) ──
        EmployeeProfile employee = null;
        if (request.employeeId() != null) {
            employee = employeeProfileRepository.findById(request.employeeId())
                    .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

            if (!employee.isActive()) {
                throw new IllegalArgumentException("Employee is not available");
            }
        }
        // ── ΣΤΑΔΙΟ 3: Effective duration (D16) ──
        // Πραγματικά λεπτά = άθροισμα durations των υπηρεσιών.
        int totalDuration = services.stream()
                .mapToInt(ServiceOffering::getDurationMinutes)
                .sum();

        // Φόρτωσε settings για το granularity (ίδιο singleton με τον engine).
        BusinessSettings settings = businessSettingsRepository
                .findById(BusinessSettings.SINGLETON_ID)
                .orElseThrow(() -> new IllegalStateException("BusinessSettings not found"));
        int granularity = settings.getSlotGranularityMinutes();

        // Ceiling στο επόμενο πολλαπλάσιο του granularity (D16).
        // Μαθηματικό ceiling για ακέραιους: (a + b - 1) / b * b
        int effectiveDuration = ((totalDuration + granularity - 1) / granularity) * granularity;

        // endsAt + blockingStatuses: τα χρειάζονται ΚΑΙ το στάδιο 4 ΚΑΙ το 5. Μία φορά.
        Instant startsAt = request.startsAt();
        Instant endsAt = startsAt.plus(effectiveDuration, ChronoUnit.MINUTES);

        List<AppointmentStatus> blockingStatuses = Arrays.stream(AppointmentStatus.values())
                .filter(AppointmentStatus::blocksTime)
                .toList();

        // ── ΣΤΑΔΙΟ 4: Any-employee assignment (D18 least-loaded) ──
        if (employee == null) {
            // (α) Βρες υποψήφιους: όσοι active προσφέρουν ΟΛΕΣ τις υπηρεσίες (D77 → count αξιόπιστο).
            List<EmployeeProfile> candidates = employeeProfileRepository
                    .findByOfferingAllServices(request.serviceIds(), request.serviceIds().size());

            if (candidates.isEmpty()) {
                // Κανείς δεν προσφέρει όλες τις υπηρεσίες → business error (400).
                throw new IllegalArgumentException(
                        "No employee offers all the selected services");
            }

            // (β) Φίλτραρε ελεύθερους + (γ) βρες least-loaded, σε ένα πέρασμα.
            EmployeeProfile leastLoaded = null;
            long minLoad = Long.MAX_VALUE;

            // Όρια της ΜΕΡΑΣ του ραντεβού (τοπική μέρα) για μέτρηση load.
            // Χρησιμοποιούμε τα ίδια όρια για το findByEmployeeInRange.
            Instant dayStart = startsAt.truncatedTo(ChronoUnit.DAYS);
            Instant dayEnd = dayStart.plus(1, ChronoUnit.DAYS);

            for (EmployeeProfile candidate : candidates) {
                // Είναι ελεύθερος για το ζητούμενο slot;
                boolean occupied = appointmentRepository.existsOverlapping(
                        candidate.getId(), startsAt, endsAt, blockingStatuses);
                if (occupied) {
                    continue; // πιασμένος → όχι υποψήφιος
                }

                // Load = άθροισμα durations των ραντεβού του τη μέρα.
                long load = appointmentRepository
                        .findByEmployeeInRange(candidate.getId(), dayStart, dayEnd)
                        .stream()
                        .filter(a -> a.getStatus().blocksTime()) // μόνο όσα πιάνουν χρόνο
                        .mapToLong(Appointment::getTotalDurationMinutes)
                        .sum();

                // Κράτα τον με το ΜΙΚΡΟΤΕΡΟ load (deterministic, D18).
                if (load < minLoad) {
                    minLoad = load;
                    leastLoaded = candidate;
                }
            }

            // (δ) Κανείς ελεύθερος → conflict (409).
            if (leastLoaded == null) {
                throw new SlotUnavailableException(
                        "No employee is available for the selected time");
            }

            employee = leastLoaded; // ← ο ανατεθειμένος employee, συνεχίζει το ΙΔΙΟ μονοπάτι
        }



        // ── ΣΤΑΔΙΟ 5: Re-validation διαθεσιμότητας (D19) ──


        // Ο ΠΡΩΤΟΣ έλεγχος race condition (D19): είναι ο employee ελεύθερος ΤΩΡΑ;
        // Ο client είδε τα slots πριν λίγο· κάποιος μπορεί να πρόλαβε στο μεσοδιάστημα.
        boolean occupied = appointmentRepository.existsOverlapping(
                employee.getId(), startsAt, endsAt, blockingStatuses);
        if (occupied) {
            throw new SlotUnavailableException("This time slot is no longer available");
        }

        // ── ΣΤΑΔΙΟ 6: Χτίσιμο & save του Appointment (aggregate root) ──

        // Total price = άθροισμα των snapshots. BigDecimal, ΠΟΤΕ double (D29).
        BigDecimal totalPrice = services.stream()
                .map(ServiceOffering::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Appointment appointment = new Appointment();
        // customer: proxy μέσω getReferenceById — κανένα SELECT, μόνο το FK χρειάζεται.
        appointment.setCustomer(userRepository.getReferenceById(customerId));
        appointment.setEmployee(employee); // ήδη φορτωμένος (στάδιο 2γ)
        appointment.setStartsAt(startsAt);
        appointment.setEndsAt(endsAt);
        appointment.setStatus(AppointmentStatus.CONFIRMED); // η απόφασή σου: κλείνει κατευθείαν
        appointment.setTotalPrice(totalPrice);
        appointment.setTotalDurationMinutes(effectiveDuration);

        // Ένα AppointmentItem ανά υπηρεσία, με SNAPSHOTS (D6).
        // sortOrder: η σειρά που ήρθαν οι υπηρεσίες (0, 1, 2...).
        int sortOrder = 0;
        for (ServiceOffering service : services) {
            AppointmentItem item = new AppointmentItem();
            item.setService(service); // FK για όνομα + στατιστικά (D6)
            item.setPriceSnapshot(service.getPrice());        // τιμή ΤΩΡΑ (D6)
            item.setDurationSnapshot(service.getDurationMinutes()); // διάρκεια ΤΩΡΑ
            item.setSortOrder(sortOrder++);
            appointment.addItem(item); // helper: σετάρει το FK στην owning side (D41)
        }

        // Save: cascade=ALL σώζει τα items μαζί (D41).
        // ΕΔΩ πιάνει το EXCLUDE constraint αν υπάρχει race (στάδιο 7).
        Appointment saved = appointmentRepository.save(appointment);

        // ── ΣΤΑΔΙΟ 8: Χτίσιμο response DTO ──
        // employeeName: ασυμμετρία FK — employee → EmployeeProfile → User → fullName.
        String employeeName = employee.getUser().getFullName();

        // serviceNames: ονόματα (όχι ids) — ανθρώπινη επιβεβαίωση.
        List<String> serviceNames = services.stream()
                .map(ServiceOffering::getName)
                .toList();

        return new BookingResponse(
                saved.getId(),
                employeeName,
                saved.getStartsAt(),
                saved.getEndsAt(),
                saved.getTotalPrice(),
                saved.getTotalDurationMinutes(),
                saved.getStatus().name(),   // enum → String ("CONFIRMED")
                serviceNames
        );

    }
}
