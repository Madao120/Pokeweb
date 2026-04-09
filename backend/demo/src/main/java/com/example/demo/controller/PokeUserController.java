package com.example.demo.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.user.PokeUserRequest;
import com.example.demo.dto.user.PokeUserResponse;
import com.example.demo.dto.user.UpdateProfileRequest;
import com.example.demo.model.PokeUser;
import com.example.demo.service.PokeUserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/users")
public class PokeUserController {


    // En ved de autowired uso uin constructor por probar otra cosa
    private final PokeUserService userService;

    public PokeUserController(PokeUserService userService) {
        this.userService = userService;
    }


    // Crear un nuevo usuario
    @PostMapping
    public ResponseEntity<?> createUser(@Valid @RequestBody PokeUserRequest request) {
    try {
        PokeUser user = userService.createUser(request);
        return ResponseEntity.ok(mapToResponse(user));
    } catch (RuntimeException e) {
        if (e.getMessage().equals("EMAIL_ALREADY_EXISTS")) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body("El email ya está registrado");
        }
        else if (e.getMessage().equals("NAME_ALREADY_EXISTS")) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body("El nombre de usuario ya está registrado");
        }

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error interno");
        }
    }

    // Obtener un usuario por su ID
    @GetMapping("/{id}")
    public PokeUserResponse getUser(@PathVariable Long id) {
        PokeUser user = userService.getUser(id)
            .orElseThrow(() -> new RuntimeException("User not found"));

        return mapToResponse(user);
    }

    // Actualizar el score de un usuario
    @PutMapping("/{id}/score")
    public PokeUserResponse updateScore(@PathVariable Long id, @RequestParam int score) {
        PokeUser user = userService.updateScore(id, score);
        return mapToResponse(user);
    }

    // Actualizar perfil de usuario (nombre y foto)
    @PutMapping("/{id}/profile")
    public ResponseEntity<?> updateProfile(
            @PathVariable Long id,
            @Valid @RequestBody UpdateProfileRequest request) {
        try {
            PokeUser user = userService.updateProfile(id, request);
            return ResponseEntity.ok(mapToResponse(user));
        } catch (RuntimeException e) {
            if (e.getMessage().equals("NAME_ALREADY_EXISTS")) {
                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .body("El nombre de usuario ya está registrado");
            }

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(e.getMessage());
        }
    }

    // Top 15 ranking por scoreM1; si el usuario actual no entra, se devuelve al final.
    @GetMapping("/ranking")
    public List<PokeUserResponse> getRanking(@RequestParam(required = false) Long userId) {
        return userService.getRanking(userId);
    }

    @GetMapping("/rankings/global")
    public List<PokeUserResponse> getGlobalRanking(@RequestParam(required = false) Long userId) {
        return userService.getGlobalRanking(userId);
    }

    @GetMapping("/rankings/m2")
    public List<PokeUserResponse> getRankingM2(@RequestParam(required = false) Long userId) {
        return userService.getRankingM2(userId);
    }

    @GetMapping("/rankings/m3")
    public List<PokeUserResponse> getRankingM3(@RequestParam(required = false) Long userId) {
        return userService.getRankingM3(userId);
    }

    // Mapper para pasar de PokeUser (Enttidad) a UserResponse (DTOs)
    private PokeUserResponse mapToResponse(PokeUser user) {
        PokeUserResponse res = new PokeUserResponse();
        res.setId(user.getId());
        res.setEmail(user.getEmail());
        res.setName(user.getName());
        res.setProfilePictureUrl(user.getProfilePictureUrl());
        res.setGlobalScore(user.getGlobalScore());
        res.setScoreM1(user.getScoreM1());
        res.setScoreM2(user.getScoreM2());
        res.setScoreM3(user.getScoreM3());
        return res;
    }
}
