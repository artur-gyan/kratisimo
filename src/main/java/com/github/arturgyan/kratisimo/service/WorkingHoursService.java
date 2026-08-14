package com.github.arturgyan.kratisimo.service;

import com.github.arturgyan.kratisimo.dto.WorkingHoursRequest;
import com.github.arturgyan.kratisimo.dto.WorkingHoursResponse;
import com.github.arturgyan.kratisimo.entity.EmployeeProfile;
import com.github.arturgyan.kratisimo.entity.WorkingHours;
import com.github.arturgyan.kratisimo.repository.EmployeeProfileRepository;
import com.github.arturgyan.kratisimo.repository.WorkingHoursRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class WorkingHoursService {

    private final WorkingHoursRepository workingHoursRepository;
    private final EmployeeProfileRepository employeeProfileRepository;

    public WorkingHoursService(WorkingHoursRepository workingHoursRepository,
                               EmployeeProfileRepository employeeProfileRepository) {
        this.workingHoursRepository = workingHoursRepository;
        this.employeeProfileRepository = employeeProfileRepository;
    }

    /**
     * Ανακτά το πλήρες εβδομαδιαίο πρόγραμμα ενός υπαλλήλου.
     *
     * @param employeeId το id του EmployeeProfile (ΟΧΙ User.id — D8 asymmetry)
     * @return response με ΟΛΕΣ τις βάρδιες, sorted για UX consistency
     * @throws IllegalArgumentException αν ο υπάλληλος δεν υπάρχει (→ 400)
     */
    @Transactional(readOnly = true)
    public WorkingHoursResponse getSchedule(Long employeeId) {
        // Επικύρωση ύπαρξης υπαλλήλου (fail-fast αν το id είναι άκυρο)
        employeeProfileRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found: " + employeeId));

        List<WorkingHours> shifts = workingHoursRepository.findByEmployeeId(employeeId);

        // Ταξινόμηση για UX consistency: MONDAY→SUNDAY, μέσα σε κάθε μέρα → startTime ASC.
        // Το frontend μπορεί να τα ομαδοποιήσει ανά μέρα χωρίς re-sort.
        List<WorkingHoursResponse.Shift> sortedShifts = shifts.stream()
                .sorted(Comparator
                        .comparing((WorkingHours wh) -> wh.getDayOfWeek().getValue())  // MONDAY=1, SUNDAY=7
                        .thenComparing(WorkingHours::getStartTime))
                .map(wh -> new WorkingHoursResponse.Shift(
                        wh.getId(),
                        wh.getDayOfWeek(),
                        wh.getStartTime(),
                        wh.getEndTime()))
                .toList();

        return new WorkingHoursResponse(employeeId, sortedShifts);
    }

    /**
     * ΑΝΤΙΚΑΘΙΣΤΑ το ΠΛΗΡΕΣ εβδομαδιαίο πρόγραμμα ενός υπαλλήλου (atomic replace).
     *
     * Ροή:
     * 1. Επικύρωση: employee exists, shifts valid (no overlap, startTime < endTime)
     * 2. Διαγραφή ΟΛΩΝ των υπαρχόντων βαρδιών (DELETE FROM working_hours WHERE employee_id = ?)
     * 3. Εισαγωγή ΝΕΩ βαρδιών από το request
     * 4. Commit (atomicity → είτε όλα, είτε τίποτα)
     *
     * Λόγοι full-replace vs. incremental PATCH:
     * - Απλούστερο UX: ο admin βλέπει το πλήρες πρόγραμμα, το επεξεργάζεται, πατάει Save.
     * - Αποφεύγει edge cases: "πώς διαγράφω μία βάρδια;" → στο replace, απλά δεν την στέλνεις.
     * - Thesis justification: REST best practice για immutable weekly schedules (D34 recurring rules).
     *
     * @param employeeId το id του EmployeeProfile
     * @param request    λίστα βαρδιών (το @Valid στον controller έχει ήδη τρέξει bean validation)
     * @return το νέο πρόγραμμα (sorted όπως το GET)
     * @throws IllegalArgumentException για business rule violations (→ 400 μέσω GlobalExceptionHandler)
     */
    @Transactional
    public WorkingHoursResponse replaceSchedule(Long employeeId, WorkingHoursRequest request) {

        // ─── ΣΤΑΔΙΟ 1: Επικύρωση employee ───
        EmployeeProfile employee = employeeProfileRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found: " + employeeId));

        // ─── ΣΤΑΔΙΟ 2: Επικύρωση shifts (business rules) ───
        validateShifts(request.shifts());

        // ─── ΣΤΑΔΙΟ 3: Atomic replace (delete + insert) ───
        // 3α. Διαγραφή ΟΛΩΝ των υπαρχόντων βαρδιών
        List<WorkingHours> oldShifts = workingHoursRepository.findByEmployeeId(employeeId);
        workingHoursRepository.deleteAll(oldShifts);

        // ΚΡΙΣΙΜΟ: flush() εδώ εξασφαλίζει ότι το DELETE τρέχει ΠΡΙΝ τα INSERTs.
        // Χωρίς αυτό, το Hibernate μπορεί να αναβάλει το DELETE μέχρι το commit,
        // οπότε τα INSERTs τρέχουν πρώτα → πιθανή παραβίαση unique constraint (αν υπήρχε).
        // Εδώ δεν έχουμε unique constraint, ΑΛΛΑ είναι good practice για atomic replace patterns.
        workingHoursRepository.flush();

        // 3β. Εισαγωγή νέων βαρδιών
        List<WorkingHours> newShifts = request.shifts().stream()
                .map(shiftDto -> {
                    WorkingHours wh = new WorkingHours();
                    wh.setEmployee(employee);                // FK προς EmployeeProfile (όχι proxy — ήδη managed)
                    wh.setDayOfWeek(shiftDto.dayOfWeek());
                    wh.setStartTime(shiftDto.startTime());
                    wh.setEndTime(shiftDto.endTime());
                    return wh;
                })
                .toList();

        List<WorkingHours> saved = workingHoursRepository.saveAll(newShifts);

        // ─── ΣΤΑΔΙΟ 4: Χτίσιμο response (sorted όπως το GET, για consistency) ───
        List<WorkingHoursResponse.Shift> sortedShifts = saved.stream()
                .sorted(Comparator
                        .comparing((WorkingHours wh) -> wh.getDayOfWeek().getValue())
                        .thenComparing(WorkingHours::getStartTime))
                .map(wh -> new WorkingHoursResponse.Shift(
                        wh.getId(),
                        wh.getDayOfWeek(),
                        wh.getStartTime(),
                        wh.getEndTime()))
                .toList();

        return new WorkingHoursResponse(employeeId, sortedShifts);
    }

    /**
     * Επικυρώνει τις business rules για τις βάρδιες:
     *
     * 1. Κάθε βάρδια: startTime < endTime (αποκλείει zero-duration + backwards shifts)
     * 2. Δεν επιτρέπονται επικαλυπτόμενες βάρδιες την ΙΔΙΑ μέρα
     *    (π.χ. MONDAY 09:00-14:00 + MONDAY 12:00-18:00 → INVALID)
     *
     * Αιτιολόγηση επικάλυψης:
     * - Η AvailabilityService.isWithinWorkingHours (line 154-158) ελέγχει αν ένα ραντεβού
     *   χωράει σε ΜΙΑ βάρδια. Επικαλυπτόμενες βάρδιες δημιουργούν αμφισημία: το [12:00-13:00]
     *   χωράει και στις δύο → ποια είναι η "σωστή"; Η λογική του engine προϋποθέτει
     *   NON-OVERLAPPING shifts (D34 implicit).
     * - Gaps ΜΕ overlap (π.χ. 09:00-13:00, 14:00-18:00) είναι VALID → διάλειμμα μεσημεριού.
     *
     * Thesis note: Αυτό είναι domain constraint, ΟΧΙ DB constraint (δύσκολο στο SQL —
     * χρειάζεται exclusion constraint με tstzrange, υπερβολικό για LocalTime pairs).
     * Η επικύρωση ζει στο service layer (D-number TBD στο thesis doc).
     *
     * @param shifts η λίστα βαρδιών προς έλεγχο
     * @throws IllegalArgumentException αν παραβιάζεται κανόνας (→ 400)
     */
    private void validateShifts(List<WorkingHoursRequest.Shift> shifts) {

        // ─── Κανόνας 1: startTime < endTime ───
        for (WorkingHoursRequest.Shift shift : shifts) {
            if (!shift.startTime().isBefore(shift.endTime())) {
                throw new IllegalArgumentException(
                        String.format("Invalid shift: start time must be before end time (%s %s-%s)",
                                shift.dayOfWeek(), shift.startTime(), shift.endTime()));
            }
        }

        // ─── Κανόνας 2: Όχι επικαλύψεις στην ΙΔΙΑ μέρα ───
        // Ομαδοποίηση ανά μέρα: Map<DayOfWeek, List<Shift>>
        Map<DayOfWeek, List<WorkingHoursRequest.Shift>> byDay = shifts.stream()
                .collect(Collectors.groupingBy(WorkingHoursRequest.Shift::dayOfWeek));

        // Έλεγχος κάθε μέρας ξεχωριστά (shifts διαφορετικών ημερών ΔΕΝ επικαλύπτονται by definition)
        for (Map.Entry<DayOfWeek, List<WorkingHoursRequest.Shift>> entry : byDay.entrySet()) {
            DayOfWeek day = entry.getKey();
            List<WorkingHoursRequest.Shift> dayShifts = entry.getValue();

            // Ταξινόμηση ανά startTime (απλοποιεί τον έλεγχο επικάλυψης)
            dayShifts.sort(Comparator.comparing(WorkingHoursRequest.Shift::startTime));

            // Έλεγχος γειτονικών ζευγών: αν shift[i].end > shift[i+1].start → overlap
            for (int i = 0; i < dayShifts.size() - 1; i++) {
                WorkingHoursRequest.Shift current = dayShifts.get(i);
                WorkingHoursRequest.Shift next = dayShifts.get(i + 1);

                // Επικάλυψη: το τέλος της τρέχουσας βάρδιας είναι ΜΕΤΑ την αρχή της επόμενης.
                // Touching boundaries (13:00-14:00) είναι VALID (isBefore, όχι isAfter).
                if (current.endTime().isAfter(next.startTime())) {
                    throw new IllegalArgumentException(
                            String.format("Overlapping shifts on %s: %s-%s and %s-%s",
                                    day,
                                    current.startTime(), current.endTime(),
                                    next.startTime(), next.endTime()));
                }
            }
        }
    }
}
