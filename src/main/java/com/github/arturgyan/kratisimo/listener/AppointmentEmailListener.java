package com.github.arturgyan.kratisimo.listener;

import com.github.arturgyan.kratisimo.dto.AppointmentBookedEvent;
import com.github.arturgyan.kratisimo.dto.AppointmentCancelledEvent;
import com.github.arturgyan.kratisimo.dto.AppointmentCompletedEvent;
import com.github.arturgyan.kratisimo.entity.BusinessSettings;
import com.github.arturgyan.kratisimo.service.SettingsProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
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

@Component
public class AppointmentEmailListener {

    private static final Logger log = LoggerFactory.getLogger(AppointmentEmailListener.class);

    private final JavaMailSender mailSender;
    private final SettingsProvider settingsProvider;
    private final String frontendOrigin;

    // Ελληνικό locale → "Δευτέρα, 3 Μαρτίου 2026, 14:30".
    private static final Locale GREEK = Locale.forLanguageTag("el");
    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy, HH:mm", GREEK);

    public AppointmentEmailListener(JavaMailSender mailSender,
                                    SettingsProvider settingsProvider,
                                    @Value("${frontend.origin:http://localhost:5173}") String frontendOrigin) {
        this.mailSender = mailSender;
        this.settingsProvider = settingsProvider;
        this.frontendOrigin = frontendOrigin;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAppointmentBooked(AppointmentBookedEvent event) {
        try {
            BusinessSettings settings = settingsProvider.get();
            ZoneId zone = ZoneId.of(settings.getTimezone());

            String formattedTime = event.startsAt().atZone(zone).format(FORMATTER);
            String services = String.join(", ", event.serviceNames());

            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(event.customerEmail());
            message.setSubject("Επιβεβαίωση ραντεβού — " + settings.getName());
            message.setText("""
                    Αγαπητέ/ή %s,

                    Το ραντεβού σας επιβεβαιώθηκε.

                    Υπηρεσίες: %s
                    Υπάλληλος: %s
                    Πότε: %s
                    Σύνολο: €%.2f

                    Ευχαριστούμε που επιλέξατε %s.
                    """.formatted(
                    event.customerName(), services, event.employeeName(),
                    formattedTime, event.totalPrice(), settings.getName()));

            mailSender.send(message);
            log.info("Confirmation email sent to {}", event.customerEmail());

        } catch (MailException e) {
            log.error("Failed to send confirmation email to {}: {}",
                    event.customerEmail(), e.getMessage());
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAppointmentCancelled(AppointmentCancelledEvent event) {
        try {
            BusinessSettings settings = settingsProvider.get();
            ZoneId zone = ZoneId.of(settings.getTimezone());

            String formattedTime = event.startsAt().atZone(zone).format(FORMATTER);
            String services = String.join(", ", event.serviceNames());

            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(event.customerEmail());
            message.setSubject("Ακύρωση ραντεβού — " + settings.getName());
            message.setText("""
                    Αγαπητέ/ή %s,

                    Το ραντεβού σας ακυρώθηκε.

                    Υπηρεσίες: %s
                    Υπάλληλος: %s
                    Πότε: %s

                    Αν έχετε απορίες, επικοινωνήστε μαζί μας.

                    %s
                    """.formatted(
                    event.customerName(), services, event.employeeName(),
                    formattedTime, settings.getName()));

            mailSender.send(message);
            log.info("Cancellation email sent to {}", event.customerEmail());

        } catch (MailException e) {
            log.error("Failed to send cancellation email to {}: {}",
                    event.customerEmail(), e.getMessage());
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAppointmentCompleted(AppointmentCompletedEvent event) {
        try {
            BusinessSettings settings = settingsProvider.get();
            ZoneId zone = ZoneId.of(settings.getTimezone());

            String formattedTime = event.startsAt().atZone(zone).format(FORMATTER);
            String services = String.join(", ", event.serviceNames());
            String reviewLink = frontendOrigin + "/appointments";

            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(event.customerEmail());
            message.setSubject("Ευχαριστούμε για την επίσκεψή σας — " + settings.getName());
            message.setText("""
                    Αγαπητέ/ή %s,

                    Ευχαριστούμε για την επίσκεψή σας! Ελπίζουμε να μείνατε ευχαριστημένος/η.

                    Υπηρεσίες: %s
                    Υπάλληλος: %s
                    Πότε: %s

                    Θα χαρούμε να ακούσουμε τη γνώμη σας. Αφήστε μια αξιολόγηση εδώ:
                    %s

                    Σας περιμένουμε ξανά,
                    %s
                    """.formatted(
                    event.customerName(), services, event.employeeName(),
                    formattedTime, reviewLink, settings.getName()));

            mailSender.send(message);
            log.info("Completion email sent to {}", event.customerEmail());

        } catch (MailException e) {
            log.error("Failed to send completion email to {}: {}",
                    event.customerEmail(), e.getMessage());
        }
    }
}