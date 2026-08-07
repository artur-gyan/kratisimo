package com.github.arturgyan.kratisimo.entity;

import com.github.arturgyan.kratisimo.enums.BusinessType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "business_settings")
@Getter
@Setter
@NoArgsConstructor
public class BusinessSettings {

    public static final Long SINGLETON_ID = 1L;

    @Id
    private Long id = SINGLETON_ID;

    @Column(nullable = false, length = 120)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BusinessType type;

    @Column(length = 200)
    private String address;

    @Column(length = 30)
    private String phone;

    @Column(length = 255)
    private String email;

    @Column(nullable = false, length = 50)
    private String timezone = "Europe/Athens";

    @Column(name = "slot_granularity_minutes", nullable = false)
    private int slotGranularityMinutes = 15;

    @Column(name = "setup_completed", nullable = false)
    private boolean setupCompleted = false;

    @Column(name = "booking_lead_time_minutes", nullable = false)
    private int bookingLeadTimeMinutes = 10;


}