package com.example.demo.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {

    @NotBlank
    private String emailOrName;

    @NotBlank
    private String password;

    // getters y setters
}