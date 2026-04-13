package com.example.demo.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

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

    // Puntuación global individual (suma de minijuegos individuales)
    private int globalScore;

    // Puntuación del minijuego 1 (ahorcado individual)
    private int scoreM1;

    // Puntuacion del minijuego 2 (GuessSound)
    private int scoreM2;

    // Puntuacion del minijuego 3 (GuessSprite)
    private int scoreM3;

    // Datos diarios del ahorcado (M1 diario)
    private LocalDate dailyHangmanDate;
    private int dailyHangmanAttempts;
    private LocalDateTime dailyHangmanCompletedAt;

    // Datos diarios de GuessSprite (M3 diario)
    private LocalDate dailySpriteDate;
    private int dailySpriteAttempts;
    private LocalDateTime dailySpriteCompletedAt;
} 