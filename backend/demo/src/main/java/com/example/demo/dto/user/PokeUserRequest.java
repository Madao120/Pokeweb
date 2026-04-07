package com.example.demo.dto.user;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Valid
public class PokeUserRequest {

    // Email del usuario
    @NotBlank(message = "El email es obligatorio")
    @Email(message = "Introduce un email valido")
    private String email;

    // Nombre a escoger
    @NotBlank(message = "El nombre es obligatorio")
    @Size(min = 3, max = 30, message = "El nombre debe tener entre 3 y 30 caracteres")
    private String name;

    // Contrasena
    @NotBlank(message = "La contrasena es obligatoria")
    @Size(min = 6, message = "La contrasena debe tener al menos 6 caracteres")
    private String password;

    // Imagen de perfil que se escogera entre varias opciones
    private String profilePictureUrl;
}
