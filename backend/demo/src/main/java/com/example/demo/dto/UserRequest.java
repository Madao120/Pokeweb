package com.example.demo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserRequest {

    //Email del usuario
    @NotBlank
    @Email
    private String email;

    //Nombre a escoger
    @NotBlank
    @Size(min = 3, max = 30)
    private String name;

    // Contraseña
    @NotBlank
    @Size(min = 6)
    private String password;

    // Imagen de perfil que se escogerá entre varias opciones
    private String profilePictureUrl;
}
