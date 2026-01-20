package com.example.demo.dto;

import lombok.Data;

@Data
public class UserRequest {

    //Email del usuario
    private String email;

    //Nombre a escoger
    private String name;

    // Imagen de perfil que se escogerá entre varias opciones
    private String profilePictureUrl;
}
