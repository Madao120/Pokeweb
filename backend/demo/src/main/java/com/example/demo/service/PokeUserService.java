package com.example.demo.service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.example.demo.dto.user.PokeUserResponse;
import com.example.demo.dto.user.PokeUserRequest;
import com.example.demo.dto.user.UpdateProfileRequest;
import com.example.demo.model.PokeUser;
import com.example.demo.repository.PokeUserRepository;

@Service
public class PokeUserService {
    private final PokeUserRepository pokeUserRepository;
    private final PasswordEncoder passwordEncoder;

    public PokeUserService(PokeUserRepository pokeUserRepository, PasswordEncoder passwordEncoder) {
        this.pokeUserRepository = pokeUserRepository;
        this.passwordEncoder = passwordEncoder;
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
    // Por ahora globalScore = scoreM1, luego se ampliara con mas minijuegos.
    public PokeUser addScoreM1(Long id, int puntos) {
        PokeUser user = pokeUserRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        int nuevoScoreM1 = Math.max(0, user.getScoreM1() + puntos);
        user.setScoreM1(nuevoScoreM1);
        user.setGlobalScore(nuevoScoreM1);
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

    private PokeUserResponse mapToResponseWithRank(PokeUser user) {
        PokeUserResponse response = new PokeUserResponse();
        response.setId(user.getId());
        response.setEmail(user.getEmail());
        response.setName(user.getName());
        response.setProfilePictureUrl(user.getProfilePictureUrl());
        response.setGlobalScore(user.getGlobalScore());
        response.setScoreM1(user.getScoreM1());
        response.setRank((int) pokeUserRepository.countByScoreM1GreaterThan(user.getScoreM1()) + 1);
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
        response.setRank((int) pokeUserRepository.countByGlobalScoreGreaterThan(user.getGlobalScore()) + 1);
        return response;
    }
}
