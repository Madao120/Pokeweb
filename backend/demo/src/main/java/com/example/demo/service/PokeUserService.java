package com.example.demo.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.example.demo.dto.PokeUserRequest;
import com.example.demo.dto.UpdateProfileRequest;
import com.example.demo.model.PokeUser;
import com.example.demo.repository.PokeUserRepository;

@Service
public class PokeUserService{
    private final PokeUserRepository pokeUserRepository;
    private final PasswordEncoder passwordEncoder;

    public PokeUserService(PokeUserRepository pokeUserRepository, PasswordEncoder passwordEncoder) {
        this.pokeUserRepository = pokeUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // Creación de usuario, con excepción si el email ya existe y si el nombre también
    public PokeUser createUser(PokeUserRequest request) {

        if (pokeUserRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("EMAIL_ALREADY_EXISTS");
        }
        if (pokeUserRepository.findByName(request.getName()).isPresent()) {
            throw new RuntimeException("NAME_ALREADY_EXISTS");
        }

        PokeUser user = new PokeUser();
        user.setEmail(request.getEmail());
        user.setName(request.getName());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setProfilePictureUrl(request.getProfilePictureUrl());
        user.setGlobalScore(0);
        user.setScoreM1(0);

        return pokeUserRepository.save(user);
    }

    // Obtener usuario por id
    public Optional<PokeUser> getUser(Long id) {
        return pokeUserRepository.findById(id);
    }

     // Actualiza la puntuación global de un usuario (mantenido para compatibilidad)
    public PokeUser updateScore(Long id, int newScore) {
        PokeUser user = pokeUserRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));

        user.setGlobalScore(Math.max(0, newScore));
        return pokeUserRepository.save(user);
    }

    // Suma o resta puntos del minijuego 1 y recalcula score global.
    // Por ahora globalScore = scoreM1, luego se ampliará con más minijuegos.
    public PokeUser addScoreM1(Long id, int puntos) {
        PokeUser user = pokeUserRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        int nuevoScoreM1 = Math.max(0, user.getScoreM1() + puntos);
        user.setScoreM1(nuevoScoreM1);
        user.setGlobalScore(nuevoScoreM1);
        return pokeUserRepository.save(user);
    }

    // Actualiza los datos de perfil editables (nombre y avatar)
    public PokeUser updateProfile(Long id, UpdateProfileRequest request) {
        PokeUser user = pokeUserRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getName() != null && !request.getName().isBlank()) {
            String nuevoNombre = request.getName().trim();
            Optional<PokeUser> existingByName = pokeUserRepository.findByName(nuevoNombre);
            if (existingByName.isPresent() && !existingByName.get().getId().equals(id)) {
                throw new RuntimeException("NAME_ALREADY_EXISTS");
            }
            user.setName(nuevoNombre);
        }

        // Permite limpiar la url o actualizarla
        user.setProfilePictureUrl(request.getProfilePictureUrl());

        return pokeUserRepository.save(user);
    }

    // Login con verificacion de hash bcrypt
    public PokeUser login(String emailNombre, String password) {

        // Probamos primero por email y si no existe, por nombre.
        Optional<PokeUser> userOptional = pokeUserRepository.findByEmail(emailNombre);
        if (userOptional.isEmpty()) {
            userOptional = pokeUserRepository.findByName(emailNombre);
        }

        PokeUser user = userOptional
            .orElseThrow(() -> new RuntimeException("Email or name not found"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("El usuario o la contraseña es incorrecta");
        }

        // Si lo encontramos (que no salte al excepción) devolvemos el usuario
        return user;
    }
}
