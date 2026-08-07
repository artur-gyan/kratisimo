package com.github.arturgyan.kratisimo.service;

import com.github.arturgyan.kratisimo.dto.CreateEmployeeRequest;
import com.github.arturgyan.kratisimo.dto.EmployeeResponse;
import com.github.arturgyan.kratisimo.dto.UpdateEmployeeRequest;
import com.github.arturgyan.kratisimo.entity.EmployeeProfile;
import com.github.arturgyan.kratisimo.entity.ServiceOffering;
import com.github.arturgyan.kratisimo.entity.User;
import com.github.arturgyan.kratisimo.enums.Role;
import com.github.arturgyan.kratisimo.repository.EmployeeProfileRepository;
import com.github.arturgyan.kratisimo.repository.ServiceOfferingRepository;
import com.github.arturgyan.kratisimo.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class EmployeeService {

    private final UserRepository userRepository;
    private final EmployeeProfileRepository employeeProfileRepository;
    private final ServiceOfferingRepository serviceOfferingRepository;
    private final PasswordEncoder passwordEncoder;

    public EmployeeService(UserRepository userRepository,
                           EmployeeProfileRepository employeeProfileRepository,
                           ServiceOfferingRepository serviceOfferingRepository,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.employeeProfileRepository = employeeProfileRepository;
        this.serviceOfferingRepository = serviceOfferingRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ---------- CREATE ----------
    @Transactional
    public EmployeeResponse create(CreateEmployeeRequest request) {

        // Duplicate email check — συνεπές (users.email έχει UNIQUE στη βάση, D45)
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already in use: " + request.email());
        }

        Set<ServiceOffering> services = loadAndValidateServices(request.serviceIds());

        // User: ρόλος EMPLOYEE, password μέσω BCrypt (D92)
        User user = new User();
        user.setEmail(request.email());
        user.setFullName(request.fullName());
        user.setPhone(request.phone());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setActive(true);                 // μπορεί να κάνει login (D36)

        Set<Role> roles = new HashSet<>();
        roles.add(Role.EMPLOYEE);
        user.setRoles(roles);

        User savedUser = userRepository.save(user);   // save ΠΡΩΤΑ → id για το FK

        // EmployeeProfile → δείχνει στον νέο User
        EmployeeProfile profile = new EmployeeProfile();
        profile.setUser(savedUser);
        profile.setBio(request.bio());
        profile.setPhotoUrl(request.photoUrl());
        profile.setActive(true);              // εμφανίζεται στην κράτηση (D36)
        profile.setServices(services);

        EmployeeProfile savedProfile = employeeProfileRepository.save(profile);

        return toResponse(savedProfile);      // map ΜΕΣΑ στο transaction (D87)
    }

    // ---------- READ (list) ----------
    @Transactional(readOnly = true)
    public List<EmployeeResponse> findAll() {
        return employeeProfileRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ---------- READ (single) ----------
    @Transactional(readOnly = true)
    public EmployeeResponse findById(Long id) {
        EmployeeProfile profile = employeeProfileRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found: " + id));
        return toResponse(profile);
    }

    // ---------- UPDATE ----------
    @Transactional
    public EmployeeResponse update(Long id, UpdateEmployeeRequest request) {
        EmployeeProfile profile = employeeProfileRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found: " + id));

        // Επικύρωσε τις νέες υπηρεσίες (ίδιοι έλεγχοι με create)
        Set<ServiceOffering> services = loadAndValidateServices(request.serviceIds());

        // User fields (dirty checking — ο User είναι managed μέσω του profile.getUser())
        User user = profile.getUser();
        user.setFullName(request.fullName());
        user.setPhone(request.phone());
        // ΟΧΙ email, ΟΧΙ password, ΟΧΙ active — σκόπιμα εκτός update scope

        // Profile fields
        profile.setBio(request.bio());
        profile.setPhotoUrl(request.photoUrl());
        profile.setServices(services);        // αντικαθιστά όλο το set (D30, όχι cascade)

        return toResponse(profile);           // UPDATE αυτόματα στο commit (dirty checking)
    }

    // ---------- DELETE (soft) ----------
    @Transactional
    public void delete(Long id) {
        EmployeeProfile profile = employeeProfileRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found: " + id));
        profile.setActive(false);   // soft delete μόνο στο profile — ο User κρατάει login (D36)
    }

    // ---------- Helper: φόρτωσε & επικύρωσε υπηρεσίες ----------
    private Set<ServiceOffering> loadAndValidateServices(Set<Long> serviceIds) {
        List<ServiceOffering> found = serviceOfferingRepository.findAllById(serviceIds);

        if (found.size() != serviceIds.size()) {
            throw new IllegalArgumentException("One or more service ids do not exist");
        }

        boolean anyInactive = found.stream().anyMatch(s -> !s.isActive());
        if (anyInactive) {
            throw new IllegalArgumentException(
                    "Cannot assign an inactive service to an employee");
        }

        return new HashSet<>(found);
    }

    // ---------- Mapping helper ----------
    private EmployeeResponse toResponse(EmployeeProfile profile) {
        List<EmployeeResponse.ServiceSummary> serviceSummaries = profile.getServices().stream()
                .map(s -> new EmployeeResponse.ServiceSummary(s.getId(), s.getName()))
                .toList();

        User u = profile.getUser();
        return new EmployeeResponse(
                profile.getId(),
                u.getId(),
                u.getFullName(),
                u.getEmail(),
                u.getPhone(),
                profile.getBio(),
                profile.getPhotoUrl(),
                profile.isActive(),
                serviceSummaries
        );
    }
}