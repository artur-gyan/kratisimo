package com.github.arturgyan.kratisimo.controller;

import com.github.arturgyan.kratisimo.dto.CreateEmployeeRequest;
import com.github.arturgyan.kratisimo.dto.EmployeeResponse;
import com.github.arturgyan.kratisimo.dto.UpdateEmployeeRequest;
import com.github.arturgyan.kratisimo.service.EmployeeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/employees")   // D94 — hasRole(ADMIN) από SecurityConfig
public class EmployeeController {

    private final EmployeeService employeeService;

    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    // ---------- CREATE → 201 ----------
    @PostMapping
    public ResponseEntity<EmployeeResponse> create(
            @Valid @RequestBody CreateEmployeeRequest request) {
        EmployeeResponse created = employeeService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // ---------- READ list → 200 ----------
    @GetMapping
    public List<EmployeeResponse> findAll() {
        return employeeService.findAll();
    }

    // ---------- READ single → 200 ----------
    @GetMapping("/{id}")
    public EmployeeResponse findById(@PathVariable Long id) {
        return employeeService.findById(id);
    }

    // ---------- UPDATE → 200 ----------
    @PutMapping("/{id}")
    public EmployeeResponse update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateEmployeeRequest request) {
        return employeeService.update(id, request);
    }

    // ---------- DELETE (soft) → 204 ----------
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        employeeService.delete(id);
    }

    // ---------- ACTIVATE → 200 ----------
    @PostMapping("/{id}/activate")
    public EmployeeResponse activate(@PathVariable Long id) {
        return employeeService.activate(id);
    }
}