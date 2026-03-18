package com.example.demo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;
import lombok.Data;

@Data
public class LoginRequest {

    @NotBlank
    private String emailOrName;

    @NotBlank
    private String password;

    // getters y setters
}