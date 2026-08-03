package com.github.arturgyan.kratisimo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "appointment_items")
@Getter
@Setter
@NoArgsConstructor
public class AppointmentItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "appointment_id", nullable = false)
    private Appointment appointment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id", nullable = false)
    private ServiceOffering service;

    @Column(name = "price_snapshot", nullable = false, precision = 8, scale = 2)
    private BigDecimal priceSnapshot;

    @Column(name = "duration_snapshot", nullable = false)
    private int durationSnapshot;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
