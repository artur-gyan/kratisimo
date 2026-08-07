package com.github.arturgyan.kratisimo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

@Configuration          // λέει στο Spring: αυτή η κλάση περιέχει bean/infrastructure ρυθμίσεις
@EnableAsync            // ενεργοποιεί την επεξεργασία των @Async — χωρίς αυτό, το @Async ΑΓΝΟΕΙΤΑΙ σιωπηλά
public class AsyncConfig {
    // Προς το παρόν κενή. Το @EnableAsync από μόνο του δίνει ένα default thread pool.
}