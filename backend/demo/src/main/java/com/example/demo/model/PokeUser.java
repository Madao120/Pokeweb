package com.example.demo.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;   

@Data
@Entity
@Table(name = "pokemon_user")
public class PokeUser {

    //Id del usuario como siempre
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Email para que incie sesion 
    @Column(unique = true, nullable = false)
    private String email;

    // Nombre quequiera ponerse
    @Column(nullable = false)
    private String name;

    // Contraseña... casi me olvido de meterla
    @Column(nullable = false)
    private String password;

    // Imagen de perfil, que será escogida entre varias opciones predeterminadas
    private String profilePictureUrl;

    // Puintucaión que se actualizará cada partida, al empezarla perderá puntos directamente con un mínimo de 0, si gana ahi se le añadirán los puntos
    private int score;

} 

