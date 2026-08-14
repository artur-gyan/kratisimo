package com.github.arturgyan.kratisimo.entity;

import com.github.arturgyan.kratisimo.enums.AppointmentStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "appointments")
@Getter
@Setter
@NoArgsConstructor
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private User customer;

    @Column(name = "guest_name", length = 255)
    private String guestName;

    @Column(name = "guest_phone", length = 50)
    private String guestPhone;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private EmployeeProfile employee;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AppointmentStatus status = AppointmentStatus.PENDING;

    @Column(name = "total_price", nullable = false, precision = 8, scale = 2)
    private BigDecimal totalPrice;

    @Column(name = "total_duration_minutes", nullable = false)
    private int totalDurationMinutes;

    @OneToMany(
            mappedBy = "appointment",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY
    )
    @OrderBy("sortOrder ASC")
    private List<AppointmentItem> items = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "cancellation_reason", length = 300)
    private String cancellationReason;

    // --- helper method: κρατάει και τις δύο πλευρές συνεπείς ---
    public void addItem(AppointmentItem item) {
        items.add(item);
        item.setAppointment(this);
    }
}