package com.example.demo.dto.room;

import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.Data;

/**
 * Estado completo de la sala emitido a TODOS los jugadores por WebSocket.
 * Cada jugador además recibe su propia sesión en playerSession.
 */
@Data
public class RoomStateDTO {

    private String roomCode;
    private String state;           // WAITING | PLAYING | ROUND_FINISHED | FINISHED
    private String gameMode;        // HANGMAN | ...
    private Long leaderId;

    // Jugadores en la sala
    private List<Long> playerIds;

    // ── Datos del minijuego ──────────────────────────────────────────────────
    // La palabra enmascarada ES la misma para todos — se puede mostrar en tiempo real
    // cómo va el jugador actual (su propia sesión se incluye abajo)

    // Nombre del pokemon — solo visible cuando gameOver de la sesión del jugador
    private String pokemonName;
    private String pokemonType1;
    private String pokemonType2;
    private String pokemonGeneration;

    // Estado individual del jugador que recibe este mensaje
    // (el frontend lo rellena con el estado de SU propia sesión)
    private PlayerSessionDTO mySession;

    // ── Progreso de todos los jugadores (para ver quién va ganando) ───────────
    // maskedWord de cada jugador — muestra cuántas letras lleva
    private Map<Long, String> playerMaskedWords;

    // Si cada jugador ha terminado ya
    private Map<Long, Boolean> playerFinished;

    // Orden de llegada (para mostrar posiciones en tiempo real)
    private List<Long> finishOrder;

    // Votaciones en sala
    private Map<String, Integer> modeVotes;
    private Map<Long, String> playerModeVotes;
    private Map<String, Integer> postRoundVotes;

    // ── Fin de ronda ─────────────────────────────────────────────────────────
    private Map<Long, Integer> lastRoundPoints;   // puntos ganados en esta ronda
    private Map<Long, Integer> roundScores;       // puntuación total acumulada

    // ── Timer ────────────────────────────────────────────────────────────────
    private long remainingMs;
    private long countdownRemainingMs;

    // ── Fin de partida ───────────────────────────────────────────────────────
    // Clasificación final ordenada por puntuación total
    private List<Long> finalRanking;

    // Mensaje informativo (ej. "Diego se ha unido", "¡La partida ha comenzado!")
    private String message;

    // ── DTO interno: sesión individual del jugador ────────────────────────────
    @Data
    public static class PlayerSessionDTO {
        private String maskedWord;
        private int intentos;
        private boolean gameOver;
        private boolean ganado;
        private boolean mostrarTipo1;
        private boolean mostrarGeneracion;
        private boolean mostrarTipo2;
        private Set<Character> guessedLetters;
    }
}
