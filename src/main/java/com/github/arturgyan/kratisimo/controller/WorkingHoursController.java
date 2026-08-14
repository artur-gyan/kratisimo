package com.github.arturgyan.kratisimo.controller;

import com.github.arturgyan.kratisimo.dto.WorkingHoursRequest;
import com.github.arturgyan.kratisimo.dto.WorkingHoursResponse;
import com.github.arturgyan.kratisimo.service.WorkingHoursService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller για διαχείριση ωραρίων υπαλλήλων (admin-only).
 *
 * Path design: /api/admin/employees/{employeeId}/working-hours
 * - Nested resource: τα working hours "ανήκουν" σε έναν employee (D8 FK to EmployeeProfile)
 * - Ξεχωριστό controller (ΟΧΙ μέσα στο EmployeeController): separation of concerns —
 *   το EmployeeController χειρίζεται profile metadata, αυτό χειρίζεται το πρόγραμμα.
 *
 * Security: Το /api/admin/** path είναι ΗΔΗ secured με hasRole("ADMIN") στο SecurityConfig (line 58).
 * Κανένα επιπλέον @PreAuthorize annotation δεν χρειάζεται.
 */
@RestController
@RequestMapping("/api/admin/employees/{employeeId}/working-hours")
public class WorkingHoursController {

    private final WorkingHoursService workingHoursService;

    public WorkingHoursController(WorkingHoursService workingHoursService) {
        this.workingHoursService = workingHoursService;
    }

    /**
     * GET /api/admin/employees/{employeeId}/working-hours
     *
     * Επιστρέφει το ΠΛΗΡΕΣ εβδομαδιαίο πρόγραμμα του υπαλλήλου (όλες οι βάρδιες, sorted).
     *
     * Responses:
     * - 200 OK: επιτυχία (κενή λίστα shifts αν ο υπάλληλος δεν έχει πρόγραμμα ακόμα)
     * - 400 Bad Request: employeeId δεν υπάρχει (GlobalExceptionHandler maps IllegalArgumentException)
     * - 401 Unauthorized: όχι JWT token
     * - 403 Forbidden: το token δεν έχει ROLE_ADMIN
     */
    @GetMapping
    public WorkingHoursResponse getSchedule(@PathVariable Long employeeId) {
        return workingHoursService.getSchedule(employeeId);
    }

    /**
     * PUT /api/admin/employees/{employeeId}/working-hours
     *
     * ΑΝΤΙΚΑΘΙΣΤΑ το ΠΛΗΡΕΣ εβδομαδιαίο πρόγραμμα (atomic replace: διαγραφή παλιών + εισαγωγή νέων).
     *
     * Body: WorkingHoursRequest με λίστα βαρδιών (nested Shift records).
     * Το @Valid ενεργοποιεί bean validation (JSR-380):
     * - @NotEmpty στη λίστα → τουλάχιστον 1 βάρδια
     * - @NotNull στα πεδία κάθε Shift (dayOfWeek, startTime, endTime)
     * - Cascade validation (@Valid List<Shift>) → κάθε Shift επικυρώνεται ξεχωριστά
     *
     * Business validation (service layer):
     * - startTime < endTime
     * - Όχι επικαλυπτόμενες βάρδιες στην ίδια μέρα
     *
     * Responses:
     * - 200 OK: επιτυχία, επιστρέφει το νέο πρόγραμμα (sorted)
     * - 400 Bad Request: validation error (bean validation Η business rules)
     * - 401/403: όπως το GET
     *
     * Design note: PUT (όχι POST/PATCH) γιατί:
     * - Idempotent: πολλαπλά PUT με το ίδιο body → ίδιο αποτέλεσμα
     * - Full-replace semantics: αντικαθιστά ΟΛΗ την εβδομάδα, όχι incremental update
     * - REST best practice για replacing a resource (thesis justification D-TBD)
     */
    @PutMapping
    public WorkingHoursResponse replaceSchedule(
            @PathVariable Long employeeId,
            @Valid @RequestBody WorkingHoursRequest request) {
        return workingHoursService.replaceSchedule(employeeId, request);
    }
}
