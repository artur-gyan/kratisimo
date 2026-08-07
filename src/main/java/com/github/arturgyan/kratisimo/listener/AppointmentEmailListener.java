package com.github.arturgyan.kratisimo.listener;

import com.github.arturgyan.kratisimo.dto.AppointmentBookedEvent;
import com.github.arturgyan.kratisimo.entity.BusinessSettings;
import com.github.arturgyan.kratisimo.repository.BusinessSettingsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Ακούει AppointmentBookedEvent και στέλνει confirmation email.
 *
 * ΞΕΧΩΡΙΣΤΟ bean (όχι μέθοδος στον BookingService): το @Async δουλεύει μέσω proxy —
 * κλήση από άλλο bean περνάει από το proxy → async ενεργό. Self-invocation θα το ακύρωνε (D79).
 */
@Component
public class AppointmentEmailListener {

    private static final Logger log = LoggerFactory.getLogger(AppointmentEmailListener.class);

    private final JavaMailSender mailSender;                        // bean από spring.mail.* autoconfig
    private final BusinessSettingsRepository businessSettingsRepository;

    // Instant → τοπική ώρα μέσω business timezone (D4/D35).
    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy 'at' HH:mm", Locale.ENGLISH);

    public AppointmentEmailListener(JavaMailSender mailSender,
                                    BusinessSettingsRepository businessSettingsRepository) {
        this.mailSender = mailSender;
        this.businessSettingsRepository = businessSettingsRepository;
    }

    /**
     * @TransactionalEventListener(AFTER_COMMIT): τρέχει ΜΟΝΟ αν το booking transaction
     *   έκανε επιτυχημένο commit. Rollback → event πετιέται, κανένα email.
     * @Async: τρέχει σε ξεχωριστό thread → ο χρήστης δεν περιμένει το SMTP.
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAppointmentBooked(AppointmentBookedEvent event) {
        try {
            BusinessSettings settings = businessSettingsRepository
                    .findById(BusinessSettings.SINGLETON_ID)
                    .orElseThrow(() -> new IllegalStateException("BusinessSettings not found"));
            ZoneId zone = ZoneId.of(settings.getTimezone());

            String formattedTime = event.startsAt().atZone(zone).format(FORMATTER);
            String services = String.join(", ", event.serviceNames());

            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(event.customerEmail());
            message.setSubject("Appointment Confirmation — " + settings.getName());
            message.setText(buildBody(event, formattedTime, services, settings.getName()));

            mailSender.send(message);  // ← πραγματική SMTP σύνδεση εδώ

            log.info("Confirmation email sent to {}", event.customerEmail());

        } catch (MailException e) {
            // Το booking έχει ΗΔΗ γίνει commit — δεν το πειράζουμε. Email = best-effort.
            // Δεν ξαναπετάμε (async thread, κανείς δεν το πιάνει). Σε production: retry/dead-letter.
            log.error("Failed to send confirmation email to {}: {}",
                    event.customerEmail(), e.getMessage());
        }
    }

    private String buildBody(AppointmentBookedEvent event, String formattedTime,
                             String services, String businessName) {
        return """
                Dear %s,

                Your appointment has been confirmed.

                Services: %s
                Staff: %s
                When: %s
                Total: €%.2f

                Thank you for choosing %s.
                """.formatted(
                event.customerName(),
                services,
                event.employeeName(),
                formattedTime,
                event.totalPrice(),
                businessName
        );
    }
}