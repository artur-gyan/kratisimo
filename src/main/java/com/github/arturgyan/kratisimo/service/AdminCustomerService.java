package com.github.arturgyan.kratisimo.service;

import com.github.arturgyan.kratisimo.dto.AdminAppointmentResponse;
import com.github.arturgyan.kratisimo.dto.AdminCustomerResponse;
import com.github.arturgyan.kratisimo.dto.AdminCustomerUpdateRequest;
import com.github.arturgyan.kratisimo.entity.Appointment;
import com.github.arturgyan.kratisimo.entity.AppointmentItem;
import com.github.arturgyan.kratisimo.entity.User;
import com.github.arturgyan.kratisimo.enums.Role;
import com.github.arturgyan.kratisimo.repository.AppointmentRepository;
import com.github.arturgyan.kratisimo.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AdminCustomerService {

    private final UserRepository userRepository;
    private final AppointmentRepository appointmentRepository;

    public AdminCustomerService(UserRepository userRepository,
                                AppointmentRepository appointmentRepository) {
        this.userRepository = userRepository;
        this.appointmentRepository = appointmentRepository;
    }

    @Transactional(readOnly = true)
    public List<AdminCustomerResponse> getAllCustomers() {
        return userRepository.findAllPureCustomers().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminCustomerResponse> search(String q) {
        String pattern = "%" + q.trim() + "%";
        return userRepository.searchCustomers(pattern).stream()
                .map(this::toResponse)
                .toList();
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

        return toResponse(user);
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
                .map(this::toAppointmentResponse)
                .toList();
    }

    // ── helpers ──

    private boolean isPureCustomer(User user) {
        return user.getRoles().contains(Role.CUSTOMER)
                && !user.getRoles().contains(Role.ADMIN)
                && !user.getRoles().contains(Role.EMPLOYEE);
    }

    private AdminCustomerResponse toResponse(User u) {
        return new AdminCustomerResponse(
                u.getId(),
                u.getFullName(),
                u.getEmail(),
                u.getPhone(),
                u.isActive()
        );
    }

    private AdminAppointmentResponse toAppointmentResponse(Appointment a) {
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