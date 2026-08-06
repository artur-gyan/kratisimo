package com.github.arturgyan.kratisimo.config;

import com.github.arturgyan.kratisimo.entity.*;
import com.github.arturgyan.kratisimo.enums.AppointmentStatus;
import com.github.arturgyan.kratisimo.enums.Role;
import com.github.arturgyan.kratisimo.enums.TargetAudience;
import com.github.arturgyan.kratisimo.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;

/**
 * Πλούσιο seed για development/testing (unisex κομμωτήριο).
 *
 * @Profile("dev"): φορτώνεται ΜΟΝΟ όταν το "dev" profile είναι ενεργό —
 * ποτέ σε production. Τα test data ζουν στον κώδικα αλλά δεν φτάνουν ποτέ
 * σε παραγωγικό περιβάλλον (guard σε επίπεδο bean, όχι σε επίπεδο if).
 *
 * ΣΗΜΕΙΩΣΗ: η singleton business_settings γραμμή ΔΕΝ μπαίνει εδώ — μπαίνει
 * στο V3__seed_essential.sql (Flyway), γιατί είναι δομικά υποχρεωτική
 * (production-safe), όχι test convenience.
 */
@Component
@Profile("dev")
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final EmployeeProfileRepository employeeProfileRepository;
    private final ServiceCategoryRepository serviceCategoryRepository;
    private final ServiceOfferingRepository serviceOfferingRepository;
    private final WorkingHoursRepository workingHoursRepository;
    private final AppointmentRepository appointmentRepository;
    private final PasswordEncoder passwordEncoder;

    // Constructor injection (final = υποχρεωτικές, immutable εξαρτήσεις).
    public DataSeeder(UserRepository userRepository,
                      EmployeeProfileRepository employeeProfileRepository,
                      ServiceCategoryRepository serviceCategoryRepository,
                      ServiceOfferingRepository serviceOfferingRepository,
                      WorkingHoursRepository workingHoursRepository,
                      AppointmentRepository appointmentRepository,
                      PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.employeeProfileRepository = employeeProfileRepository;
        this.serviceCategoryRepository = serviceCategoryRepository;
        this.serviceOfferingRepository = serviceOfferingRepository;
        this.workingHoursRepository = workingHoursRepository;
        this.appointmentRepository = appointmentRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // Ζώνη του μαγαζιού — ίδια με το business_settings (D35). Χρησιμοποιείται
    // για μετατροπή τοπικής ώρας ραντεβού → Instant (D4).
    private static final ZoneId SHOP_ZONE = ZoneId.of("Europe/Athens");

    @Override
    public void run(String... args) {
        // GUARD: idempotent — τρέχει ΜΟΝΟ σε άδεια βάση. Το CommandLineRunner
        // τρέχει σε ΚΑΘΕ startup· χωρίς αυτό → διπλά inserts → unique violation.
        if (userRepository.count() > 0) {
            return;
        }

        List<ServiceCategory> categories = seedCategories();
        Map<String, ServiceOffering> services = seedServices(categories);
        List<EmployeeProfile> employees = seedEmployees(services);
        List<User> customers = seedCustomers();
        seedAdmin();
        seedAppointments(employees, customers, services);
    }

    // ============================================================
    // 1. ΚΑΤΗΓΟΡΙΕΣ
    // ============================================================
    private List<ServiceCategory> seedCategories() {
        return List.of(
                createCategory("Κουρέματα", 1),
                createCategory("Βαφές", 2),
                createCategory("Χτενίσματα", 3),
                createCategory("Περιποίηση", 4)
        );
    }

    private ServiceCategory createCategory(String name, int order) {
        ServiceCategory c = new ServiceCategory();
        c.setName(name);
        c.setDisplayOrder(order);
        c.setActive(true);
        return serviceCategoryRepository.save(c);
    }

    // ============================================================
    // 2. ΥΠΗΡΕΣΙΕΣ (mix MAN/WOMAN/UNISEX, ρεαλιστικές τιμές/διάρκειες)
    // Επιστρέφει Map με κλειδί το όνομα → εύκολη αναφορά στα appointments.
    // ============================================================
    private Map<String, ServiceOffering> seedServices(List<ServiceCategory> categories) {
        ServiceCategory kouremata = categories.get(0);
        ServiceCategory vafes = categories.get(1);
        ServiceCategory xtenismata = categories.get(2);
        ServiceCategory peripoiisi = categories.get(3);

        Map<String, ServiceOffering> map = new LinkedHashMap<>();

        // Κουρέματα
        map.put("andriko", createService(kouremata, "Ανδρικό κούρεμα", 30, "15.00", TargetAudience.MAN));
        map.put("gynaikeio", createService(kouremata, "Γυναικείο κούρεμα", 45, "25.00", TargetAudience.WOMAN));
        map.put("paidiko", createService(kouremata, "Παιδικό κούρεμα", 20, "12.00", TargetAudience.UNISEX));

        // Βαφές
        map.put("rizes", createService(vafes, "Βαφή ρίζας", 60, "35.00", TargetAudience.WOMAN));
        map.put("oliko", createService(vafes, "Ολική βαφή", 90, "55.00", TargetAudience.WOMAN));
        map.put("antaygeies", createService(vafes, "Ανταύγειες", 120, "70.00", TargetAudience.WOMAN));

        // Χτενίσματα
        map.put("xtenisma", createService(xtenismata, "Χτένισμα", 30, "20.00", TargetAudience.WOMAN));
        map.put("nyfiko", createService(xtenismata, "Νυφικό χτένισμα", 90, "80.00", TargetAudience.WOMAN));

        // Περιποίηση
        map.put("lousimo", createService(peripoiisi, "Λούσιμο & mask", 30, "18.00", TargetAudience.UNISEX));
        map.put("therapeia", createService(peripoiisi, "Θεραπεία μαλλιών", 45, "40.00", TargetAudience.UNISEX));

        return map;
    }

    private ServiceOffering createService(ServiceCategory category, String name,
                                          int duration, String price, TargetAudience audience) {
        ServiceOffering s = new ServiceOffering();
        s.setCategory(category);
        s.setName(name);
        s.setDescription(name + " — επαγγελματική εξυπηρέτηση");
        s.setDurationMinutes(duration);
        s.setPrice(new BigDecimal(price));   // String constructor (D29), ποτέ double
        s.setTargetAudience(audience);
        s.setActive(true);
        return serviceOfferingRepository.save(s);
    }

    // ============================================================
    // 3. EMPLOYEES — 5 προφίλ με διαφορετικά ωράρια & ειδικότητες
    // (κλειδί για least-loaded testing D89 + availability edge cases)
    // ============================================================
    private List<EmployeeProfile> seedEmployees(Map<String, ServiceOffering> s) {
        List<EmployeeProfile> list = new ArrayList<>();

        // --- Μαρία: full-time senior, Δευτ-Παρ 09:00-17:00, προσφέρει ΤΑ ΠΑΝΤΑ ---
        EmployeeProfile maria = createEmployee("maria@kratisimo.com", "Μαρία Παπαδοπούλου",
                "Senior κομμώτρια, 15 χρόνια εμπειρία", new HashSet<>(s.values()));
        addWeekdayHours(maria, LocalTime.of(9, 0), LocalTime.of(17, 0));
        list.add(maria);

        // --- Γιώργος: specialist κουρέματα, Δευτ/Τετ/Παρ 10:00-18:00 ---
        EmployeeProfile giorgos = createEmployee("giorgos@kratisimo.com", "Γιώργος Νικολάου",
                "Ειδικός σε ανδρικά κουρέματα",
                Set.of(s.get("andriko"), s.get("gynaikeio"), s.get("paidiko")));
        addHours(giorgos, DayOfWeek.MONDAY, LocalTime.of(10, 0), LocalTime.of(18, 0));
        addHours(giorgos, DayOfWeek.WEDNESDAY, LocalTime.of(10, 0), LocalTime.of(18, 0));
        addHours(giorgos, DayOfWeek.FRIDAY, LocalTime.of(10, 0), LocalTime.of(18, 0));
        list.add(giorgos);

        // --- Ελένη: part-time απόγευμα, Δευτ-Παρ 14:00-20:00, βαφές + χτενίσματα ---
        EmployeeProfile eleni = createEmployee("eleni@kratisimo.com", "Ελένη Γεωργίου",
                "Ειδική σε βαφές και χτενίσματα",
                Set.of(s.get("rizes"), s.get("oliko"), s.get("antaygeies"),
                        s.get("xtenisma"), s.get("nyfiko")));
        addWeekdayHours(eleni, LocalTime.of(14, 0), LocalTime.of(20, 0));
        list.add(eleni);

        // --- Νίκος: full-time ΜΕ ΔΙΑΛΕΙΜΜΑ (βάρδιες D34!), κουρέματα + περιποίηση ---
        // Δύο working_hours γραμμές/μέρα = πρωινή + απογευματινή βάρδια.
        EmployeeProfile nikos = createEmployee("nikos@kratisimo.com", "Νίκος Δημητρίου",
                "Κουρέματα και θεραπείες μαλλιών",
                Set.of(s.get("andriko"), s.get("gynaikeio"), s.get("paidiko"),
                        s.get("lousimo"), s.get("therapeia")));
        for (DayOfWeek d : new DayOfWeek[]{DayOfWeek.MONDAY, DayOfWeek.TUESDAY,
                DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY}) {
            addHours(nikos, d, LocalTime.of(9, 0), LocalTime.of(13, 0));   // πρωινή
            addHours(nikos, d, LocalTime.of(17, 0), LocalTime.of(21, 0));  // απογευματινή
        }
        list.add(nikos);

        // --- Άννα: weekend μόνο (Σαβ/Κυρ 10:00-16:00), προσφέρει ΤΑ ΠΑΝΤΑ ---
        EmployeeProfile anna = createEmployee("anna@kratisimo.com", "Άννα Κωνσταντίνου",
                "Weekend κομμώτρια, all-round", new HashSet<>(s.values()));
        addHours(anna, DayOfWeek.SATURDAY, LocalTime.of(10, 0), LocalTime.of(16, 0));
        addHours(anna, DayOfWeek.SUNDAY, LocalTime.of(10, 0), LocalTime.of(16, 0));
        list.add(anna);

        return list;
    }

    private EmployeeProfile createEmployee(String email, String fullName, String bio,
                                           Set<ServiceOffering> services) {
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode("employee123"));
        user.setFullName(fullName);
        user.setActive(true);
        user.setRoles(Set.of(Role.EMPLOYEE));
        userRepository.save(user);

        EmployeeProfile profile = new EmployeeProfile();
        profile.setUser(user);
        profile.setBio(bio);
        profile.setActive(true);
        profile.setServices(services);
        return employeeProfileRepository.save(profile);
    }

    private void addWeekdayHours(EmployeeProfile emp, LocalTime start, LocalTime end) {
        for (DayOfWeek d : new DayOfWeek[]{DayOfWeek.MONDAY, DayOfWeek.TUESDAY,
                DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY}) {
            addHours(emp, d, start, end);
        }
    }

    private void addHours(EmployeeProfile emp, DayOfWeek day, LocalTime start, LocalTime end) {
        WorkingHours wh = new WorkingHours();
        wh.setEmployee(emp);
        wh.setDayOfWeek(day);
        wh.setStartTime(start);
        wh.setEndTime(end);
        workingHoursRepository.save(wh);
    }

    // ============================================================
    // 4. CUSTOMERS (6 πελάτες για τα appointments)
    // ============================================================
    private List<User> seedCustomers() {
        String[][] data = {
                {"kostas@example.com", "Κώστας Αντωνίου"},
                {"dimitra@example.com", "Δήμητρα Παύλου"},
                {"vasilis@example.com", "Βασίλης Ρούσσος"},
                {"sofia@example.com", "Σοφία Μακρή"},
                {"petros@example.com", "Πέτρος Ιωάννου"},
                {"katerina@example.com", "Κατερίνα Βλάχου"}
        };
        List<User> customers = new ArrayList<>();
        for (String[] d : data) {
            User u = new User();
            u.setEmail(d[0]);
            u.setPasswordHash(passwordEncoder.encode("customer123"));
            u.setFullName(d[1]);
            u.setActive(true);
            u.setRoles(Set.of(Role.CUSTOMER));
            customers.add(userRepository.save(u));
        }
        return customers;
    }

    // ============================================================
    // 5. ADMIN (+ CUSTOMER ρόλο, ώστε να μπορεί και να κλείνει ραντεβού)
    // ============================================================
    private void seedAdmin() {
        User admin = new User();
        admin.setEmail("admin@kratisimo.com");
        admin.setPasswordHash(passwordEncoder.encode("admin123"));
        admin.setFullName("Admin User");
        admin.setPhone("2100000000");
        admin.setActive(true);
        admin.setRoles(Set.of(Role.ADMIN, Role.CUSTOMER));   // πολλαπλοί ρόλοι (D9)
        userRepository.save(admin);
    }

    // ============================================================
    // 6. APPOINTMENTS — ~25 σε βάθος 2 μηνών, άνισος φόρτος ανά employee
    // (COMPLETED τα παρελθόντα → έσοδα· CONFIRMED τα μελλοντικά)
    // ============================================================
    private void seedAppointments(List<EmployeeProfile> employees,
                                  List<User> customers,
                                  Map<String, ServiceOffering> services) {
        // Deterministic seed → ΙΔΙΑ δεδομένα κάθε φορά (testable, όχι τυχαία).
        Random rng = new Random(42);

        List<ServiceOffering> serviceList = new ArrayList<>(services.values());
        LocalDate today = LocalDate.now(SHOP_ZONE);

        // 22 παρελθόντα (COMPLETED) — σκορπισμένα στους τελευταίους 2 μήνες.
        // Άνισος φόρτος: η Μαρία (index 0) παίρνει τα περισσότερα (senior),
        // ώστε στο least-loaded testing να ΜΗΝ επιλέγεται αυτή.
        int[] loadWeights = {8, 5, 4, 3, 2}; // Μαρία, Γιώργος, Ελένη, Νίκος, Άννα
        for (int empIdx = 0; empIdx < employees.size(); empIdx++) {
            EmployeeProfile emp = employees.get(empIdx);
            for (int i = 0; i < loadWeights[empIdx]; i++) {
                int daysAgo = 1 + rng.nextInt(60);              // 1-60 μέρες πριν
                LocalDate date = today.minusDays(daysAgo);
                int hour = 9 + rng.nextInt(8);                  // 09:00-16:00
                ServiceOffering svc = serviceList.get(rng.nextInt(serviceList.size()));
                User customer = customers.get(rng.nextInt(customers.size()));
                createAppointment(emp, customer, svc, date, hour, AppointmentStatus.COMPLETED);
            }
        }

        // 3 μελλοντικά (CONFIRMED) — για να φαίνονται και upcoming ραντεβού.
        for (int i = 0; i < 3; i++) {
            EmployeeProfile emp = employees.get(rng.nextInt(employees.size()));
            int daysAhead = 1 + rng.nextInt(7);
            LocalDate date = today.plusDays(daysAhead);
            int hour = 9 + rng.nextInt(6);
            ServiceOffering svc = serviceList.get(rng.nextInt(serviceList.size()));
            User customer = customers.get(rng.nextInt(customers.size()));
            createAppointment(emp, customer, svc, date, hour, AppointmentStatus.CONFIRMED);
        }
    }

    /**
     * Χτίζει ΕΝΑ appointment με ΕΝΑ item (aggregate, D41).
     * Χρησιμοποιεί το helper addItem() που κρατάει και τις δύο πλευρές συνεπείς.
     * ΠΡΟΣΟΧΗ: το startsAt είναι ιστορικό (σκορπισμένο), αλλά το createdAt
     * μπαίνει αυτόματα "τώρα" (@CreationTimestamp) — το dashboard θα πρέπει
     * να μετράει έσοδα βάσει startsAt, ΟΧΙ createdAt.
     */
    private void createAppointment(EmployeeProfile emp, User customer, ServiceOffering svc,
                                   LocalDate date, int hour, AppointmentStatus status) {
        // Τοπική ώρα → Instant μέσω της ζώνης του μαγαζιού (D4/D35).
        Instant startsAt = date.atTime(LocalTime.of(hour, 0)).atZone(SHOP_ZONE).toInstant();

        // Effective duration = ceiling στο 15' (D16). Εδώ ένα service, οπότε
        // απλό: ceil(duration/15)*15. (Το booking service κάνει το ίδιο για πολλά.)
        int rawDuration = svc.getDurationMinutes();
        int effective = (int) (Math.ceil(rawDuration / 15.0) * 15);
        Instant endsAt = startsAt.plus(Duration.ofMinutes(effective));

        Appointment appt = new Appointment();
        appt.setCustomer(customer);
        appt.setEmployee(emp);
        appt.setStartsAt(startsAt);
        appt.setEndsAt(endsAt);
        appt.setStatus(status);
        appt.setTotalPrice(svc.getPrice());
        appt.setTotalDurationMinutes(effective);

        // AppointmentItem με snapshots (D6): φωτογραφία τιμής/διάρκειας ΤΩΡΑ.
        AppointmentItem item = new AppointmentItem();
        item.setService(svc);
        item.setPriceSnapshot(svc.getPrice());
        item.setDurationSnapshot(rawDuration);   // ΠΡΑΓΜΑΤΙΚΗ διάρκεια, όχι effective (D82)
        item.setSortOrder(0);
        appt.addItem(item);   // helper: σετάρει και item.setAppointment(appt)

        appointmentRepository.save(appt);   // cascade=ALL → σώζει και το item
    }
}