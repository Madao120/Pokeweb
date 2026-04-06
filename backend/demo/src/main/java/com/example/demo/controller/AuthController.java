package com.example.demo.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.auth.LoginRequest;
import com.example.demo.dto.user.PokeUserResponse;
import com.example.demo.model.PokeUser;
import com.example.demo.service.PokeUserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final PokeUserService userService;

    public AuthController(PokeUserService userService) {
        this.userService = userService;
    }

    @PostMapping("/login")
    public PokeUserResponse login(@Valid @RequestBody LoginRequest request) {
        // Pasamos emailOrName para permitir login por email o por nombre de usuario
        PokeUser user = userService.login(request.getEmailOrName(), request.getPassword());
        return mapToResponse(user);
    }

    private PokeUserResponse mapToResponse(PokeUser user) {
        PokeUserResponse res = new PokeUserResponse();
        res.setId(user.getId());
        res.setEmail(user.getEmail());
        res.setName(user.getName());
        res.setProfilePictureUrl(user.getProfilePictureUrl());
        res.setGlobalScore(user.getGlobalScore());
        res.setScoreM1(user.getScoreM1());
        return res;
    }
}
