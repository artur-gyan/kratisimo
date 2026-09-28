package com.github.arturgyan.kratisimo.service;

import com.github.arturgyan.kratisimo.dto.AdminAppointmentResponse;
import com.github.arturgyan.kratisimo.dto.AdminCustomerResponse;
import com.github.arturgyan.kratisimo.dto.AdminCustomerUpdateRequest;
import com.github.arturgyan.kratisimo.dto.LoyaltyResponse;
import com.github.arturgyan.kratisimo.entity.User;
import com.github.arturgyan.kratisimo.enums.Role;
import com.github.arturgyan.kratisimo.repository.AppointmentRepository;
import com.github.arturgyan.kratisimo.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class AdminCustomerService {

    private final UserRepository userRepository;
    private final AppointmentRepository appointmentRepository;
    private final LoyaltyService loyaltyService;   // ΝΕΟ (2e)

    public AdminCustomerService(UserRepository userRepository,
                                AppointmentRepository appointmentRepository,
                                LoyaltyService loyaltyService) {
        this.userRepository = userRepository;
        this.appointmentRepository = appointmentRepository;
        this.loyaltyService = loyaltyService;
    }

    @Transactional(readOnly = true)
    public List<AdminCustomerResponse> getAllCustomers() {
        return withLoyalty(userRepository.findAllPureCustomers());
    }

    @Transactional(readOnly = true)
    public List<AdminCustomerResponse> search(String q) {
        String pattern = "%" + q.trim() + "%";
        return withLoyalty(userRepository.searchCustomers(pattern));
    }

    @Transactional
    public AdminCustomerResponse update(Long customerId, AdminCustomerUpdateRequest request) {
        User user = userRepository.findById(customerId)
                .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        // Ασφάλεια: μόνο "καθαρός" CUSTOMER επεξεργάζεται από εδώ.
        // Αποτρέπει τον admin να αλλάξει κατά λάθος στοιχεία άλλου admin/employee.
        if (!isPureCustomer(user)) {
            throw new IllegalArgumentException("This user is not a customer");
        }

        // Dirty checking — μόνο fullName + phone (email/roles/active ΟΧΙ).
        user.setFullName(request.fullName().trim());
        user.setPhone(request.phone() != null ? request.phone().trim() : null);

        return toResponse(user, loyaltyService.getStatus(user.getId()));
    }

    @Transactional
    public void setActive(Long customerId, boolean active) {
        User user = userRepository.findById(customerId)
                .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        if (!isPureCustomer(user)) {
            throw new IllegalArgumentException("This user is not a customer");
        }

        // user.active = μπορεί να κάνει login (D36). false → banned/απενεργοποιημένος.
        user.setActive(active);
    }

    @Transactional(readOnly = true)
    public List<AdminAppointmentResponse> getCustomerHistory(Long customerId) {
        User user = userRepository.findById(customerId)
                .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        if (!isPureCustomer(user)) {
            throw new IllegalArgumentException("This user is not a customer");
        }

        // Reuse του tested query (D123) — ίδιο query, admin ως caller.
        return appointmentRepository.findByCustomerIdOrderByStartsAtDesc(customerId).stream()
                .map(AdminAppointmentResponse::from)   // ΑΛΛΑΓΗ (2e): ενιαίο mapping
                .toList();
    }

    /**
     * ΝΕΟ (2e) — Πρόοδος επιβράβευσης ενός πελάτη.
     * Χρήση: «Νέο ραντεβού» → μήνυμα "ο πελάτης έχει έκπτωση X%".
     * existsById: 400 για ανύπαρκτο id, αντί για "0/5" που θα έμοιαζε με έγκυρο πελάτη.
     */
    @Transactional(readOnly = true)
    public LoyaltyResponse getLoyalty(Long customerId) {
        if (!userRepository.existsById(customerId)) {
            throw new IllegalArgumentException("Customer not found");
        }
        return loyaltyService.getStatus(customerId);
    }

    // ── helpers ──

    /**
     * Λίστα πελατών + πρόοδος για ΟΛΟΥΣ σε ΕΝΑ query (batch, μοτίβο D128).
     * Χωρίς batch: 1 query ανά πελάτη → N+1.
     */
    private List<AdminCustomerResponse> withLoyalty(List<User> users) {
        List<Long> ids = users.stream().map(User::getId).toList();
        Map<Long, LoyaltyResponse> loyaltyById = loyaltyService.getStatuses(ids);

        return users.stream()
                .map(u -> toResponse(u, loyaltyById.get(u.getId())))
                .toList();
    }

    private boolean isPureCustomer(User user) {
        return user.getRoles().contains(Role.CUSTOMER)
                && !user.getRoles().contains(Role.ADMIN)
                && !user.getRoles().contains(Role.EMPLOYEE);
    }

    private AdminCustomerResponse toResponse(User u, LoyaltyResponse loyalty) {
        return new AdminCustomerResponse(
                u.getId(),
                u.getFullName(),
                u.getEmail(),
                u.getPhone(),
                u.isActive(),
                loyalty
        );
    }
}