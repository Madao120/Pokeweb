package com.example.demo.dto;

import lombok.Data;

@Data
public class UserResponse {

    //Automático
    private Long id;
    private String email;
    private String name;
    private String profilePictureUrl;
    
    // 0 al crear el usuario
    private int score;
}
