package com.github.arturgyan.kratisimo.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.validation.FieldError;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;



@RestControllerAdvice
public class GlobalExceptionHandler {

    // ── 400: business logic λάθος input (π.χ. διπλό email από τον AuthService) ──
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(
            IllegalArgumentException ex, HttpServletRequest request) {

        ErrorResponse body = ErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),        // 400
                HttpStatus.BAD_REQUEST.getReasonPhrase(), // "Bad Request"
                ex.getMessage(),                        // το μήνυμα που έβαλες όταν το πέταξες
                request.getRequestURI()                 // π.χ. "/api/auth/register"
        );
        return ResponseEntity.badRequest().body(body);
    }

    // ── 401: λάθος login credentials ──
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(
            BadCredentialsException ex, HttpServletRequest request) {

        ErrorResponse body = ErrorResponse.of(
                HttpStatus.UNAUTHORIZED.value(),        // 401
                HttpStatus.UNAUTHORIZED.getReasonPhrase(),
                "Invalid email or password",            // ΣΚΟΠΙΜΑ γενικό — βλ. σχόλιο κάτω
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    // ── 400: αποτυχία @Valid — αναλυτικά ποιο πεδίο & γιατί ──
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest request) {

        // Μαζεύουμε ΟΛΑ τα field errors σε ένα Map<πεδίο, μήνυμα>.
        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            // getField() = "email", getDefaultMessage() = "must not be blank"
            fieldErrors.put(fe.getField(), fe.getDefaultMessage());
        }

        ErrorResponse body = new ErrorResponse(
                Instant.now(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                "Validation failed",           // γενικό top-level μήνυμα
                request.getRequestURI(),
                fieldErrors                     // ΕΔΩ γεμίζει το nullable πεδίο
        );
        return ResponseEntity.badRequest().body(body);
    }

    // ── 500: BusinessSettings singleton δεν βρέθηκε, ή άλλη παραβίαση invariant ──
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalState(
            IllegalStateException ex, HttpServletRequest request) {

        ErrorResponse body = ErrorResponse.of(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),   // 500
                HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase(),
                ex.getMessage(),   // εδώ ΘΕΛΟΥΜΕ το μήνυμα — είναι δικό μας, όχι user input
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }

    // ── 500 catch-all: ΟΤΙΔΗΠΟΤΕ δεν προβλέψαμε ──
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(
            Exception ex, HttpServletRequest request) {

        // ΠΡΟΣΟΧΗ: ΔΕΝ επιστρέφουμε το ex.getMessage() στον client.
        // Ένα άγνωστο exception μπορεί να περιέχει SQL, paths, internals → διαρροή.
        ErrorResponse body = ErrorResponse.of(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase(),
                "An unexpected error occurred",   // σκόπιμα αόριστο
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }

    // ── 409: slot πιάστηκε (Java check, στάδιο 5) ──
    @ExceptionHandler(SlotUnavailableException.class)
    public ResponseEntity<ErrorResponse> handleSlotUnavailable(
            SlotUnavailableException ex, HttpServletRequest request) {

        ErrorResponse body = ErrorResponse.of(
                HttpStatus.CONFLICT.value(),          // 409
                HttpStatus.CONFLICT.getReasonPhrase(), // "Conflict"
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    // ── 409: EXCLUDE constraint της βάσης (στάδιο 7, race που ξέφυγε) ──
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(
            DataIntegrityViolationException ex, HttpServletRequest request) {

        // ΔΕΝ δείχνουμε το ex.getMessage() — περιέχει raw SQL/constraint names (leak).
        // Γενικό, ασφαλές μήνυμα. Το ίδιο 409 με τον Java check — ίδιο νόημα για τον client.
        ErrorResponse body = ErrorResponse.of(
                HttpStatus.CONFLICT.value(),
                HttpStatus.CONFLICT.getReasonPhrase(),
                "This time slot is no longer available",
                request.getRequestURI()
        );

        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    // Malformed JSON ή μη-έγκυρη τιμή (π.χ. λάθος enum) → client error, όχι server error
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadable(
            HttpMessageNotReadableException ex, HttpServletRequest request) {

        ErrorResponse body = new ErrorResponse(
                Instant.now(),
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                "Malformed request body or invalid field value",
                request.getRequestURI(),
                null                       // δεν είναι field-addressable — γενικό μήνυμα
        );
        return ResponseEntity.badRequest().body(body);
    }

    // Λάθος τύπος σε @RequestParam/@PathVariable (π.χ. "xyz" για LocalDate, "abc" για Long)
// → client error, όχι server error
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex, HttpServletRequest request) {

        ErrorResponse body = new ErrorResponse(
                Instant.now(),
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                "Invalid value for parameter '" + ex.getName() + "'",
                request.getRequestURI(),
                null
        );
        return ResponseEntity.badRequest().body(body);
    }

    // ── 403: ownership violation (D52) ──
    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ErrorResponse> handleForbidden(
            ForbiddenException ex, HttpServletRequest request) {
        ErrorResponse body = new ErrorResponse(
                Instant.now(),
                HttpStatus.FORBIDDEN.value(),        // 403
                "Forbidden",
                ex.getMessage(),
                request.getRequestURI(),
                null
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    // ── 409: duplicate review (ίδιο pattern με SlotUnavailable, D85) ──
    @ExceptionHandler(AlreadyReviewedException.class)
    public ResponseEntity<ErrorResponse> handleAlreadyReviewed(
            AlreadyReviewedException ex, HttpServletRequest request) {
        ErrorResponse body = new ErrorResponse(
                Instant.now(),
                HttpStatus.CONFLICT.value(),         // 409
                "Conflict",
                ex.getMessage(),
                request.getRequestURI(),
                null
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

}