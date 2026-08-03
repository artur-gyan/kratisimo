package com.github.arturgyan.kratisimo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;


public record RegisterRequest(

        @NotBlank(message = "Το email είναι υποχρεωτικό")
        @Email(message = "Μη έγκυρη μορφή email")
        String email,

        @NotBlank(message = "Ο κωδικός είναι υποχρεωτικός")
        @Size(min = 8, message = "Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες")
        String password,

        @NotBlank(message = "Το ονοματεπώνυμο είναι υποχρεωτικό")
        String fullName,

        String phone   // προαιρετικό — χωρίς constraint
) {}