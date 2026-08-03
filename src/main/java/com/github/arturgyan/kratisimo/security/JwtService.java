package com.github.arturgyan.kratisimo.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;

/**
 * Υπεύθυνο ΜΟΝΟ για το token: δημιουργία, ανάγνωση, επαλήθευση.
 * Δεν ξέρει τίποτα για χρήστες, βάση ή ρόλους (μόνο email στο payload).
 */
@Service
public class JwtService {

    private final SecretKey secretKey;
    private final long expirationMs;

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration-ms}") long expirationMs) {

        // Base64 string → bytes → SecretKey αντικείμενο.
        // Το jjwt σκάει εδώ αν το secret είναι < 256 bits (fail fast στο startup).
        this.secretKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
        this.expirationMs = expirationMs;
    }

    /** Παράγει υπογεγραμμένο token με subject = email. */
    public String generateToken(String email) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(email)      // sub claim — ΜΟΝΟ email (Επιλογή Β)
                .issuedAt(now)       // iat
                .expiration(expiry)  // exp
                .signWith(secretKey) // υπογραφή → τρίτο μέρος του token
                .compact();          // → "header.payload.signature"
    }

    /**
     * Βγάζει το email από το token.
     * ΠΡΟΣΟΧΗ: το parseSignedClaims ΕΠΑΛΗΘΕΥΕΙ ταυτόχρονα υπογραφή + λήξη.
     * Αν κάτι δεν πάει καλά → exception, δεν επιστρέφει ποτέ λάθος δεδομένα.
     */
    public String extractEmail(String token) {
        return parseClaims(token).getSubject();
    }

    /** true αν το token είναι έγκυρο (σωστή υπογραφή ΚΑΙ μη ληγμένο). */
    public boolean isTokenValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (Exception e) {
            // Πιάνουμε ΟΛΑ τα jjwt exceptions: κακή υπογραφή, ληγμένο,
            // κακοσχηματισμένο, null. Για το filter αρκεί ένα "όχι έγκυρο".
            return false;
        }
    }

    /** Κοινό parsing — εδώ γίνεται όλη η επαλήθευση. */
    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)      // με ΠΟΙΟ κλειδί ελέγχω την υπογραφή
                .build()
                .parseSignedClaims(token)   // επαλήθευση υπογραφής + exp
                .getPayload();
    }
}