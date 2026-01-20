package com.example.demo.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;   

@Data
@Entity
public class User {

    //Id del usuario como siempre
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Email para que incie sesion 
    private String email;

    // Nombre quequiera ponerse
    private String name;

    // Imagen de perfil, que será escogida entre varias opciones predeterminadas
    private String profilePictureUrl;

    // Puintucaión que se actualizará cada partida, al empezarla perderá puntos directamente con un mínimo de 0, si gana ahi se le añadirán los puntos
    private int score;

} 

