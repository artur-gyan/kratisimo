package com.github.arturgyan.kratisimo.controller;

import com.github.arturgyan.kratisimo.dto.CategoryRequest;
import com.github.arturgyan.kratisimo.dto.CategoryResponse;
import com.github.arturgyan.kratisimo.service.CategoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/categories")   // όλα κάτω από /api/admin/** → admin-only (SecurityConfig)
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    // POST → 201 Created
    // @Valid: ενεργοποιεί το bean validation του DTO (@NotBlank κ.λπ.). Αν αποτύχει →
    // MethodArgumentNotValidException → ο GlobalExceptionHandler το πιάνει → 400 (D73).
    @PostMapping
    public ResponseEntity<CategoryResponse> create(@Valid @RequestBody CategoryRequest request) {
        CategoryResponse created = categoryService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // GET all → 200
    @GetMapping
    public List<CategoryResponse> findAll() {
        return categoryService.findAll();
    }

    // GET one → 200 (ή 404 αν δεν βρεθεί, μέσω handler)
    @GetMapping("/{id}")
    public CategoryResponse findById(@PathVariable Long id) {
        return categoryService.findById(id);
    }

    // PUT → 200
    @PutMapping("/{id}")
    public CategoryResponse update(@PathVariable Long id, @Valid @RequestBody CategoryRequest request) {
        return categoryService.update(id, request);
    }

    // DELETE → 204 No Content (επιτυχία χωρίς response body)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        categoryService.delete(id);
        return ResponseEntity.noContent().build();
    }
}