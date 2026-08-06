package com.github.arturgyan.kratisimo.service;

import com.github.arturgyan.kratisimo.dto.CategoryRequest;
import com.github.arturgyan.kratisimo.dto.CategoryResponse;
import com.github.arturgyan.kratisimo.entity.ServiceCategory;
import com.github.arturgyan.kratisimo.repository.ServiceCategoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CategoryService {

    private final ServiceCategoryRepository categoryRepository;

    public CategoryService(ServiceCategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    // CREATE
    // @Transactional: το save + το build του response γίνονται σε ένα transaction.
    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        // Business rule: όχι δύο κατηγορίες με το ίδιο όνομα. Ελέγχουμε ΠΡΙΝ το save
        // → καθαρό μήνυμα (409) αντί για raw DB unique-violation. Το DB UNIQUE
        // constraint (V1) παραμένει ως τελικό δίχτυ (D45, validation σε 3 επίπεδα).
        if (categoryRepository.existsByNameIgnoreCase(request.name())) {
            throw new IllegalStateException("A category with this name already exists");
        }

        ServiceCategory category = new ServiceCategory();
        category.setName(request.name());
        category.setDisplayOrder(request.displayOrder());
        category.setActive(true);   // νέα κατηγορία = ενεργή εξ ορισμού

        ServiceCategory saved = categoryRepository.save(category);
        return toResponse(saved);
    }

    // READ ALL (admin βλέπει όλες, active + inactive)
    // readOnly = true: hint στον Hibernate ότι δεν γίνονται αλλαγές → optimization
    // (κανένα dirty checking). Σωστό για pure reads.
    @Transactional(readOnly = true)
    public List<CategoryResponse> findAll() {
        return categoryRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    // READ ONE
    @Transactional(readOnly = true)
    public CategoryResponse findById(Long id) {
        ServiceCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Category not found: " + id));
        return toResponse(category);
    }

    // UPDATE
    @Transactional
    public CategoryResponse update(Long id, CategoryRequest request) {
        ServiceCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Category not found: " + id));

        // Duplicate check: επιτρέπεται να κρατήσει το ΙΔΙΟ όνομα, αλλά όχι να πάρει
        // όνομα ΑΛΛΗΣ κατηγορίας. Ελέγχουμε μόνο αν άλλαξε το όνομα.
        if (!category.getName().equalsIgnoreCase(request.name())
                && categoryRepository.existsByNameIgnoreCase(request.name())) {
            throw new IllegalStateException("A category with this name already exists");
        }

        category.setName(request.name());
        category.setDisplayOrder(request.displayOrder());
        // ΔΕΝ αγγίζουμε το active εδώ — το activate/deactivate γίνεται μέσω DELETE
        // (soft-delete) ή ξεχωριστού endpoint αν χρειαστεί.

        // ΔΕΝ χρειάζεται save(): το category είναι managed entity μέσα στο
        // transaction → ο Hibernate κάνει dirty checking και UPDATE αυτόματα στο commit.
        return toResponse(category);
    }

    // DELETE (soft, D20)
    @Transactional
    public void delete(Long id) {
        ServiceCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Category not found: " + id));
        // Soft delete: δεν σβήνουμε τη γραμμή, την κάνουμε ανενεργή.
        // Hard delete θα έσπαγε FK (services δείχνουν σε αυτή) + έχανε ιστορικό.
        category.setActive(false);
        // πάλι, dirty checking → UPDATE αυτόματα
    }

    // Helper: entity → DTO. Απομονώνει το mapping σε ένα σημείο.
    private CategoryResponse toResponse(ServiceCategory c) {
        return new CategoryResponse(c.getId(), c.getName(), c.getDisplayOrder(), c.isActive());
    }
}