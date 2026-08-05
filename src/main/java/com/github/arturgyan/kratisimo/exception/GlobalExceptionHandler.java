package com.github.arturgyan.kratisimo.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.validation.FieldError;
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
}