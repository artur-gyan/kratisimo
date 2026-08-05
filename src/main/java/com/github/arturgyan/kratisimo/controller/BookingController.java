package com.github.arturgyan.kratisimo.controller;

import com.github.arturgyan.kratisimo.dto.BookingRequest;
import com.github.arturgyan.kratisimo.dto.BookingResponse;
import com.github.arturgyan.kratisimo.security.CustomUserDetails;
import com.github.arturgyan.kratisimo.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/appointments")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping
    public ResponseEntity<BookingResponse> book(
            @Valid @RequestBody BookingRequest request,
            @AuthenticationPrincipal CustomUserDetails principal) {

        // D52: ο customerId έρχεται ΑΠΟ ΤΟ TOKEN (principal), ΠΟΤΕ από το request.
        // Ο client δεν μπορεί να κλείσει ραντεβού στο όνομα άλλου αλλάζοντας ένα νούμερο.
        Long customerId = principal.getUser().getId();

        BookingResponse response = bookingService.book(request, customerId);

        // 201 Created: φτιάχτηκε νέος πόρος. ΟΧΙ 200 — το POST που δημιουργεί
        // επιστρέφει 201 κατά σύμβαση REST.
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}