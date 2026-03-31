package com.example.demo.dto;

import lombok.Data;

/**
 * Mensaje que el frontend envía por WebSocket cuando adivina una letra.
 * Destino: /app/room/{roomCode}/guess
 */
@Data
public class GuessLetterMessage {
    private Long userId;
    private String letra;
}