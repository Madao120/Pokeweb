package com.example.demo.model;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import lombok.Data;

/**
 * Sala multijugador.
 * 
 * Estados:
 *   WAITING        → sala creada, esperando jugadores
 *   PLAYING        → minijuego en curso
 *   ROUND_FINISHED → ronda terminada (todos acabaron o se agotó el tiempo)
 *   FINISHED       → partida completa terminada por el líder
 *
 * Cada jugador tiene su propia GameSession con la MISMA palabra.
 * El score del perfil NO se modifica — los puntos son internos a la sala.
 */
@Data
public class Room {

    public enum State { WAITING, PLAYING, ROUND_FINISHED, FINISHED }
    public enum GameMode { HANGMAN }   // se amplía en fases futuras

    private final String roomCode;
    private final String password;       // null = sala abierta
    private Long leaderId;         // líder actual de la sala (puede transferirse)

    private State state = State.WAITING;
    private GameMode currentMode;

    // ── Jugadores ─────────────────────────────────────────────────────────────
    // Orden de entrada (importante para mantener posiciones)
    private final List<Long> playerIds = new ArrayList<>();

    // ── Sesiones individuales ─────────────────────────────────────────────────
    // Cada jugador tiene su propia GameSession con la misma palabra
    private final Map<Long, GameSession> playerSessions = new ConcurrentHashMap<>();

    // ── Puntuación acumulada entre rondas ──────────────────────────────────────
    // roundScores acumula los puntos de TODAS las rondas jugadas
    private final Map<Long, Integer> roundScores = new ConcurrentHashMap<>();

     // Voto de modo (en lobby): cada jugador vota 1 modo
    private final Map<Long, GameMode> modeVotes = new ConcurrentHashMap<>();


    // Orden en que los jugadores terminaron la ronda actual (para calcular posiciones)
    // Se rellena conforme van terminando; los que no terminan no aparecen
    private final List<Long> finishOrder = new ArrayList<>();

    // Puntos ganados en la última ronda (para mostrar en ROUND_FINISHED)
    private final Map<Long, Integer> lastRoundPoints = new ConcurrentHashMap<>();

     // Voto de acción al terminar ronda
    public enum PostRoundAction { REPEAT_MODE, CHANGE_MODE, FINISH_MATCH }
    private final Map<Long, PostRoundAction> postRoundVotes = new ConcurrentHashMap<>();

    // ── Timer ─────────────────────────────────────────────────────────────────
    private static final long ROUND_DURATION_MS = 3 * 60 * 1000L; // 3 minutos
    private Instant roundStartTime;

    // ── Constructor ───────────────────────────────────────────────────────────
    public Room(String roomCode, String password, Long leaderId) {
        this.roomCode   = roomCode;
        this.password   = password;
        this.leaderId   = leaderId;
        playerIds.add(leaderId);
        roundScores.put(leaderId, 0);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public boolean checkPassword(String input) {
        if (password == null || password.isBlank()) return true;
        return password.equals(input);
    }

    public boolean isTimeUp() {
        if (roundStartTime == null) return false;
        return Instant.now().isAfter(roundStartTime.plusMillis(ROUND_DURATION_MS));
    }

    public long getRemainingMs() {
        if (roundStartTime == null) return ROUND_DURATION_MS;
        long elapsed = Instant.now().toEpochMilli() - roundStartTime.toEpochMilli();
        return Math.max(0, ROUND_DURATION_MS - elapsed);
    }

    /** Todos los jugadores han terminado su sesión (gameOver) */
    public boolean allFinished() {
        return playerSessions.values().stream().allMatch(GameSession::isGameOver);
    }

    /**
     * Calcula los puntos de esta ronda según posición.
     * Fórmula: (N - posición) * 2  → 1º con 5 jugadores = (5-0)*2 = 10
     * Los que no terminaron reciben 0.
     */
    public void calculateRoundPoints() {
        int n = playerIds.size();
        lastRoundPoints.clear();

        // Posiciones por orden de finalización
        for (int i = 0; i < finishOrder.size(); i++) {
            Long pid = finishOrder.get(i);
            int pts = (n - i) * 2;
            lastRoundPoints.put(pid, pts);
            roundScores.merge(pid, pts, Integer::sum);
        }

        // Los que no terminaron: 0 puntos
        for (Long pid : playerIds) {
            lastRoundPoints.putIfAbsent(pid, 0);
        }
    }

    /** Prepara la sala para una nueva ronda (limpia sesiones y finishOrder) */
    public void resetRound() {
        playerSessions.clear();
        finishOrder.clear();
        lastRoundPoints.clear();
        roundStartTime = null;
        postRoundVotes.clear();
        state = State.WAITING;
    }
}
