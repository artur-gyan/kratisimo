package com.github.arturgyan.kratisimo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "employee_profiles")
@Getter
@Setter
@NoArgsConstructor
public class EmployeeProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(length = 500)
    private String bio;

    @Column(name = "photo_url", columnDefinition = "TEXT")
    private String photoUrl;

    @Column(nullable = false)
    private boolean active;


    //
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "employee_services",
            joinColumns = @JoinColumn(name = "employee_id"),
            inverseJoinColumns = @JoinColumn(name = "service_id")
    )
    private Set<ServiceOffering> services = new HashSet<>();
}
