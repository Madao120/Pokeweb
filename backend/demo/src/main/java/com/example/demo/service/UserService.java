package com.example.demo.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import com.example.demo.dto.UserRequest;
import com.example.demo.model.PokeUser;
import com.example.demo.repository.UserRepository;

@Service
public class UserService{
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // Creación de usuario, con excepción si el email ya existe y si el nombre también
    public PokeUser createUser(UserRequest request) {

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("EMAIL_ALREADY_EXISTS");
        }
        if (userRepository.findByName(request.getName()).isPresent()) {
            throw new RuntimeException("NAME_ALREADY_EXISTS");
        }

        PokeUser user = new PokeUser();
        user.setEmail(request.getEmail());
        user.setName(request.getName());
        user.setPassword(request.getPassword());
        user.setProfilePictureUrl(request.getProfilePictureUrl());
        user.setScore(0);

        return userRepository.save(user);
    }

    // Obtener usuario por id
    public Optional<PokeUser> getUser(Long id) {
        return userRepository.findById(id);
    }

    // Atualiza la puntuación, provisional (posteriormente hacer prev + puntos ganados)
    // Cuando inicies un minijuego prev - puntos directamente, luego si ganas te suman puntos
    public PokeUser updateScore(Long id, int newScore) {
        PokeUser user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));

        user.setScore(newScore);
        return userRepository.save(user);
    }

    // Logeo simple, sin cifrado aun es un esquema sencillo
    public PokeUser login(String email, String password) {

    // Para encontrar el usuario debemos de poner el email y contraseña, en caso de no encontrarlo
    // lanzamos una excepcion
    PokeUser user = userRepository.findByEmail(email)
        .orElseThrow(() -> new RuntimeException("Email not found"));

    if (!user.getPassword().equals(password)) {
        throw new RuntimeException("El usuario o la contraseña es incorrecta");
    }

    // Si lo encontramos (que no salte al excepción) devolvemos el usuario
    return user;
    }
}
