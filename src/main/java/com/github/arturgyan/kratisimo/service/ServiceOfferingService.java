package com.github.arturgyan.kratisimo.service;

import com.github.arturgyan.kratisimo.dto.ServiceOfferingRequest;
import com.github.arturgyan.kratisimo.dto.ServiceOfferingResponse;
import com.github.arturgyan.kratisimo.entity.ServiceCategory;
import com.github.arturgyan.kratisimo.entity.ServiceOffering;
import com.github.arturgyan.kratisimo.repository.ServiceCategoryRepository;
import com.github.arturgyan.kratisimo.repository.ServiceOfferingRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ServiceOfferingService {

    private final ServiceOfferingRepository offeringRepository;
    private final ServiceCategoryRepository categoryRepository;

    // Constructor injection — όχι @Autowired σε field (testable, final, fail-fast)
    public ServiceOfferingService(ServiceOfferingRepository offeringRepository,
                                  ServiceCategoryRepository categoryRepository) {
        this.offeringRepository = offeringRepository;
        this.categoryRepository = categoryRepository;
    }

    // ---------- CREATE ----------
    @Transactional
    public ServiceOfferingResponse create(ServiceOfferingRequest request) {
        // Φορτώνουμε ΚΑΙ επικυρώνουμε την κατηγορία (findById, όχι getReferenceById)
        ServiceCategory category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Category not found: " + request.categoryId()));

        // Απόρριψη ανάθεσης σε soft-deleted κατηγορία
        if (!category.isActive()) {
            throw new IllegalArgumentException(
                    "Cannot assign a service to an inactive category");
        }

        ServiceOffering offering = new ServiceOffering();
        offering.setName(request.name());
        offering.setDescription(request.description());
        offering.setDurationMinutes(request.durationMinutes());
        offering.setPrice(request.price());
        offering.setTargetAudience(request.targetAudience());
        offering.setCategory(category);
        offering.setActive(true);   // server-set, ποτέ από τον client (D94)

        ServiceOffering saved = offeringRepository.save(offering);
        return toResponse(saved);   // mapping ΜΕΣΑ στο transaction (D87)
    }

    // ---------- READ (list) ----------
    @Transactional(readOnly = true)
    public List<ServiceOfferingResponse> findAll() {
        return offeringRepository.findAllByOrderByNameAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ---------- READ (single) ----------
    @Transactional(readOnly = true)
    public ServiceOfferingResponse findById(Long id) {
        ServiceOffering offering = offeringRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Service not found: " + id));
        return toResponse(offering);
    }

    // ---------- UPDATE ----------
    @Transactional
    public ServiceOfferingResponse update(Long id, ServiceOfferingRequest request) {
        ServiceOffering offering = offeringRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Service not found: " + id));

        // Αν άλλαξε η κατηγορία, ξανα-επικυρώνουμε (ίδιοι έλεγχοι με το create)
        ServiceCategory category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Category not found: " + request.categoryId()));
        if (!category.isActive()) {
            throw new IllegalArgumentException(
                    "Cannot assign a service to an inactive category");
        }

        // Dirty checking — καμία ρητή save() (D95)
        offering.setName(request.name());
        offering.setDescription(request.description());
        offering.setDurationMinutes(request.durationMinutes());
        offering.setPrice(request.price());
        offering.setTargetAudience(request.targetAudience());
        offering.setCategory(category);

        return toResponse(offering);   // UPDATE γίνεται αυτόματα στο commit
    }

    // ---------- DELETE (soft) ----------
    @Transactional
    public void delete(Long id) {
        ServiceOffering offering = offeringRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Service not found: " + id));
        offering.setActive(false);   // soft delete (D20) — dirty checking κάνει το UPDATE
    }

    // ---------- Mapping helper ----------
    // private — λεπτομέρεια υλοποίησης, όχι μέρος του public API
    private ServiceOfferingResponse toResponse(ServiceOffering o) {
        return new ServiceOfferingResponse(
                o.getId(),
                o.getName(),
                o.getDescription(),
                o.getDurationMinutes(),
                o.getPrice(),
                o.getTargetAudience(),
                o.isActive(),
                o.getCategory().getId(),      // FK — ήδη φορτωμένο
                o.getCategory().getName()     // lazy access, resolve μέσα στο transaction (D87)
        );
    }
}