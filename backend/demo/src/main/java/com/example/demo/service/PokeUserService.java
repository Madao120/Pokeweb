package com.example.demo.service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import jakarta.annotation.PostConstruct;

import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;

import com.example.demo.dto.user.PokeUserResponse;
import com.example.demo.dto.user.PokeUserRequest;
import com.example.demo.dto.user.UpdateProfileRequest;
import com.example.demo.model.PokeUser;
import com.example.demo.repository.PokeUserRepository;

@Service
public class PokeUserService {
    private final PokeUserRepository pokeUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    public PokeUserService(
        PokeUserRepository pokeUserRepository,
        PasswordEncoder passwordEncoder,
        JdbcTemplate jdbcTemplate
    ) {
        this.pokeUserRepository = pokeUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    void ensureScoreColumns() {
        // Helps existing local DBs migrate when adding new minigame score columns.
        jdbcTemplate.execute("ALTER TABLE pokemon_user ADD COLUMN IF NOT EXISTS score_m1 INTEGER DEFAULT 0");
        jdbcTemplate.execute("ALTER TABLE pokemon_user ADD COLUMN IF NOT EXISTS score_m2 INTEGER DEFAULT 0");
        jdbcTemplate.execute("ALTER TABLE pokemon_user ADD COLUMN IF NOT EXISTS score_m3 INTEGER DEFAULT 0");
        jdbcTemplate.execute("ALTER TABLE pokemon_user ADD COLUMN IF NOT EXISTS global_score INTEGER DEFAULT 0");
    }

    // Creacion de usuario, con excepcion si el email ya existe y si el nombre tambien.
    public PokeUser createUser(PokeUserRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        String normalizedName = request.getName().trim();

        if (pokeUserRepository.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
            throw new RuntimeException("EMAIL_ALREADY_EXISTS");
        }
        if (pokeUserRepository.findByNameIgnoreCase(normalizedName).isPresent()) {
            throw new RuntimeException("NAME_ALREADY_EXISTS");
        }

        PokeUser user = new PokeUser();
        user.setEmail(normalizedEmail);
        user.setName(normalizedName);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setProfilePictureUrl(request.getProfilePictureUrl());
        user.setGlobalScore(0);
        user.setScoreM1(0);
        user.setScoreM2(0);
        user.setScoreM3(0);

        return pokeUserRepository.save(user);
    }

    // Obtener usuario por id.
    public Optional<PokeUser> getUser(Long id) {
        return pokeUserRepository.findById(id);
    }

    // Actualiza la puntuacion global de un usuario (mantenido para compatibilidad).
    public PokeUser updateScore(Long id, int newScore) {
        PokeUser user = pokeUserRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));

        user.setGlobalScore(Math.max(0, newScore));
        return pokeUserRepository.save(user);
    }

    // Suma o resta puntos del minijuego 1 y recalcula score global.
    public PokeUser addScoreM1(Long id, int puntos) {
        PokeUser user = pokeUserRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        int nuevoScoreM1 = Math.max(0, user.getScoreM1() + puntos);
        user.setScoreM1(nuevoScoreM1);
        user.setGlobalScore(calcularGlobalScore(user));
        return pokeUserRepository.save(user);
    }

    // Suma o resta puntos del minijuego 2 y recalcula score global.
    public PokeUser addScoreM2(Long id, int puntos) {
        PokeUser user = pokeUserRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        int nuevoScoreM2 = Math.max(0, user.getScoreM2() + puntos);
        user.setScoreM2(nuevoScoreM2);
        user.setGlobalScore(calcularGlobalScore(user));
        return pokeUserRepository.save(user);
    }

    // Suma o resta puntos del minijuego 3 y recalcula score global.
    public PokeUser addScoreM3(Long id, int puntos) {
        PokeUser user = pokeUserRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        int nuevoScoreM3 = Math.max(0, user.getScoreM3() + puntos);
        user.setScoreM3(nuevoScoreM3);
        user.setGlobalScore(calcularGlobalScore(user));
        return pokeUserRepository.save(user);
    }

    // Actualiza los datos de perfil editables (nombre y avatar).
    public PokeUser updateProfile(Long id, UpdateProfileRequest request) {
        PokeUser user = pokeUserRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getName() != null && !request.getName().isBlank()) {
            String nuevoNombre = request.getName().trim();
            Optional<PokeUser> existingByName = pokeUserRepository.findByNameIgnoreCase(nuevoNombre);
            if (existingByName.isPresent() && !existingByName.get().getId().equals(id)) {
                throw new RuntimeException("NAME_ALREADY_EXISTS");
            }
            user.setName(nuevoNombre);
        }

        // Permite limpiar la url o actualizarla.
        user.setProfilePictureUrl(request.getProfilePictureUrl());

        return pokeUserRepository.save(user);
    }

    // Login con verificacion de hash bcrypt.
    public PokeUser login(String emailNombre, String password) {
        String normalizedValue = emailNombre == null ? "" : emailNombre.trim();

        // Probamos primero por email y si no existe, por nombre.
        Optional<PokeUser> userOptional = pokeUserRepository.findByEmailIgnoreCase(normalizedValue);
        if (userOptional.isEmpty()) {
            userOptional = pokeUserRepository.findByNameIgnoreCase(normalizedValue);
        }

        PokeUser user = userOptional
            .orElseThrow(() -> new RuntimeException("Email or name not found"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("El usuario o la contrasena es incorrecta");
        }

        return user;
    }

    // Top 15 del ranking, y si el usuario actual no entra, se anade al final con su posicion real.
    public List<PokeUserResponse> getRanking(Long currentUserId) {
        List<PokeUser> topPlayers = pokeUserRepository.findRankingByScoreM1(PageRequest.of(0, 15));
        List<PokeUserResponse> ranking = topPlayers.stream()
            .map(this::mapToResponseWithRank)
            .collect(Collectors.toList());

        if (currentUserId == null) {
            return ranking;
        }

        boolean currentUserAlreadyIncluded = topPlayers.stream()
            .anyMatch(player -> player.getId().equals(currentUserId));

        if (currentUserAlreadyIncluded) {
            return ranking;
        }

        pokeUserRepository.findById(currentUserId)
            .map(this::mapToResponseWithRank)
            .ifPresent(ranking::add);

        return ranking;
    }

    public List<PokeUserResponse> getGlobalRanking(Long currentUserId) {
        List<PokeUser> topPlayers = pokeUserRepository.findRankingByGlobalScore(PageRequest.of(0, 15));
        List<PokeUserResponse> ranking = topPlayers.stream()
            .map(this::mapToResponseWithGlobalRank)
            .collect(Collectors.toList());

        if (currentUserId == null) {
            return ranking;
        }

        boolean currentUserAlreadyIncluded = topPlayers.stream()
            .anyMatch(player -> player.getId().equals(currentUserId));

        if (currentUserAlreadyIncluded) {
            return ranking;
        }

        pokeUserRepository.findById(currentUserId)
            .map(this::mapToResponseWithGlobalRank)
            .ifPresent(ranking::add);

        return ranking;
    }

    public List<PokeUserResponse> getRankingM2(Long currentUserId) {
        List<PokeUser> topPlayers = pokeUserRepository.findRankingByScoreM2(PageRequest.of(0, 15));
        List<PokeUserResponse> ranking = topPlayers.stream()
            .map(this::mapToResponseWithRankM2)
            .collect(Collectors.toList());

        if (currentUserId == null) {
            return ranking;
        }

        boolean currentUserAlreadyIncluded = topPlayers.stream()
            .anyMatch(player -> player.getId().equals(currentUserId));

        if (currentUserAlreadyIncluded) {
            return ranking;
        }

        pokeUserRepository.findById(currentUserId)
            .map(this::mapToResponseWithRankM2)
            .ifPresent(ranking::add);

        return ranking;
    }

    public List<PokeUserResponse> getRankingM3(Long currentUserId) {
        List<PokeUser> topPlayers = pokeUserRepository.findRankingByScoreM3(PageRequest.of(0, 15));
        List<PokeUserResponse> ranking = topPlayers.stream()
            .map(this::mapToResponseWithRankM3)
            .collect(Collectors.toList());

        if (currentUserId == null) {
            return ranking;
        }

        boolean currentUserAlreadyIncluded = topPlayers.stream()
            .anyMatch(player -> player.getId().equals(currentUserId));

        if (currentUserAlreadyIncluded) {
            return ranking;
        }

        pokeUserRepository.findById(currentUserId)
            .map(this::mapToResponseWithRankM3)
            .ifPresent(ranking::add);

        return ranking;
    }

    private PokeUserResponse mapToResponseWithRank(PokeUser user) {
        PokeUserResponse response = new PokeUserResponse();
        response.setId(user.getId());
        response.setEmail(user.getEmail());
        response.setName(user.getName());
        response.setProfilePictureUrl(user.getProfilePictureUrl());
        response.setGlobalScore(user.getGlobalScore());
        response.setScoreM1(user.getScoreM1());
        response.setScoreM2(user.getScoreM2());
        response.setScoreM3(user.getScoreM3());
        response.setRank((int) pokeUserRepository.countByScoreM1GreaterThan(user.getScoreM1()) + 1);
        return response;
    }

    private PokeUserResponse mapToResponseWithRankM2(PokeUser user) {
        PokeUserResponse response = new PokeUserResponse();
        response.setId(user.getId());
        response.setEmail(user.getEmail());
        response.setName(user.getName());
        response.setProfilePictureUrl(user.getProfilePictureUrl());
        response.setGlobalScore(user.getGlobalScore());
        response.setScoreM1(user.getScoreM1());
        response.setScoreM2(user.getScoreM2());
        response.setScoreM3(user.getScoreM3());
        response.setRank((int) pokeUserRepository.countByScoreM2GreaterThan(user.getScoreM2()) + 1);
        return response;
    }

    private PokeUserResponse mapToResponseWithRankM3(PokeUser user) {
        PokeUserResponse response = new PokeUserResponse();
        response.setId(user.getId());
        response.setEmail(user.getEmail());
        response.setName(user.getName());
        response.setProfilePictureUrl(user.getProfilePictureUrl());
        response.setGlobalScore(user.getGlobalScore());
        response.setScoreM1(user.getScoreM1());
        response.setScoreM2(user.getScoreM2());
        response.setScoreM3(user.getScoreM3());
        response.setRank((int) pokeUserRepository.countByScoreM3GreaterThan(user.getScoreM3()) + 1);
        return response;
    }

    private PokeUserResponse mapToResponseWithGlobalRank(PokeUser user) {
        PokeUserResponse response = new PokeUserResponse();
        response.setId(user.getId());
        response.setEmail(user.getEmail());
        response.setName(user.getName());
        response.setProfilePictureUrl(user.getProfilePictureUrl());
        response.setGlobalScore(user.getGlobalScore());
        response.setScoreM1(user.getScoreM1());
        response.setScoreM2(user.getScoreM2());
        response.setScoreM3(user.getScoreM3());
        response.setRank((int) pokeUserRepository.countByGlobalScoreGreaterThan(user.getGlobalScore()) + 1);
        return response;
    }

    private int calcularGlobalScore(PokeUser user) {
        return Math.max(0, user.getScoreM1() + user.getScoreM2() + user.getScoreM3());
    }
}
