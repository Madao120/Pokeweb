package com.example.demo.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.LoginRequest;
import com.example.demo.dto.PokeUserResponse;
import com.example.demo.model.PokeUser;
import com.example.demo.service.PokeUserService;

import jakarta.validation.Valid;

// Controlador para el logeo del usuario, donde recibimos el email y la contraseña
// Y así tendremos acceso al usuario

@RestController
@RequestMapping("/auth")
public class AuthController {

    //Servicio de usuario
    private final PokeUserService userService;

    public AuthController(PokeUserService userService) {
        this.userService = userService;
    }

    // Solo necesitamos un Post por ahora para el logeo
    @PostMapping("/login")
    public PokeUserResponse login(@Valid @RequestBody LoginRequest request) {

        PokeUser user = userService.login(request.getEmail(), request.getPassword());

        return mapToResponse(user);
    }

    private PokeUserResponse mapToResponse(PokeUser user) {
        PokeUserResponse res = new PokeUserResponse();
        res.setId(user.getId());
        res.setEmail(user.getEmail());
        res.setName(user.getName());
        res.setProfilePictureUrl(user.getProfilePictureUrl());
        res.setScore(user.getScore());
        return res;
    }
}
