package com.example.demo.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import com.example.demo.dto.UserRequest;
import com.example.demo.dto.UserResponse;
import com.example.demo.model.PokeUser;

import jakarta.validation.Valid;
import com.example.demo.service.UserService;

@RestController
@RequestMapping("/users")
@CrossOrigin(origins = "http://localhost:5173")
public class UserController {


    // En ved de autowired uso uin constructor por probar otra cosa
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }


    // Crear un nuevo usuario
    @PostMapping
    public ResponseEntity<?> createUser(@Valid @RequestBody UserRequest request) {
    try {
        PokeUser user = userService.createUser(request);
        return ResponseEntity.ok(mapToResponse(user));
    } catch (RuntimeException e) {
        if (e.getMessage().equals("EMAIL_ALREADY_EXISTS")) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body("El email ya está registrado");
        }

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error interno");
        }
    }

    @GetMapping("/{id}")
    public UserResponse getUser(@PathVariable Long id) {
        PokeUser user = userService.getUser(id)
            .orElseThrow(() -> new RuntimeException("User not found"));

        return mapToResponse(user);
    }

    @PutMapping("/{id}/score")
    public UserResponse updateScore(@PathVariable Long id, @RequestParam int score) {
        PokeUser user = userService.updateScore(id, score);
        return mapToResponse(user);
    }

    // Mapper para pasar de PokeUser (Enttidad) a UserResponse (DTOs)
    private UserResponse mapToResponse(PokeUser user) {
        UserResponse res = new UserResponse();
        res.setId(user.getId());
        res.setEmail(user.getEmail());
        res.setName(user.getName());
        res.setProfilePictureUrl(user.getProfilePictureUrl());
        res.setScore(user.getScore());
        return res;
    }
}
