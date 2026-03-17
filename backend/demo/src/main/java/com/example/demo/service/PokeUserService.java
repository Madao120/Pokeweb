package com.example.demo.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.example.demo.dto.PokeUserRequest;
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
        user.setScore(0);

        return pokeUserRepository.save(user);
    }

    // Obtener usuario por id
    public Optional<PokeUser> getUser(Long id) {
        return pokeUserRepository.findById(id);
    }

    // Atualiza la puntuación, provisional (posteriormente hacer prev + puntos ganados)
    // Cuando inicies un minijuego prev - puntos directamente, luego si ganas te suman puntos
    public PokeUser updateScore(Long id, int newScore) {
        PokeUser user = pokeUserRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));

        user.setScore(newScore);
        return pokeUserRepository.save(user);
    }

    // Suma o resta puntos al score actual (usado al terminar una partida)
    // El score nunca baja de 0
    public PokeUser addScore(Long id, int puntos) {
        PokeUser user = pokeUserRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        // Math max es para que nmo baje de 0, mas a delante se podrán poner rangos competitivos
        int nuevoScore = Math.max(0, user.getScore() + puntos);
        user.setScore(nuevoScore);
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
