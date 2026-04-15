package com.example.demo.model;

import java.util.List;
import java.util.Objects;

import com.example.demo.dto.pokemon.PokemonM2;
import com.fasterxml.jackson.annotation.JsonIgnore;

import lombok.Data;

@Data
public class GameSessionM2 {

    private static final int TOTAL_ROUNDS = 4;
    private static final int TOTAL_LIVES = 4;

    private PokemonM2 currentRound;
    private int currentRoundNumber;
    private int totalRounds;
    private int totalLives;
    private int vidasRestantes;
    private int aciertos;
    private int fallos;
    private int unresolvedRounds;
    private boolean gameOver;
    private boolean finishedByTimeout;
    private int puntosGanados;
    private boolean scoreAplicado;
    private Boolean ultimoAcierto;
    private String ultimoPokemonCorrecto;
    private long completedAtMs;

    @JsonIgnore
    private final List<PokemonM2> rounds;

    @JsonIgnore
    private int currentRoundIndex;

    public GameSessionM2(List<PokemonM2> rounds) {
        this.rounds = rounds;
        this.currentRoundIndex = 0;
        this.totalRounds = TOTAL_ROUNDS;
        this.totalLives = TOTAL_LIVES;
        this.vidasRestantes = TOTAL_LIVES;
        this.currentRound = rounds.isEmpty() ? null : rounds.get(0);
        this.currentRoundNumber = rounds.isEmpty() ? 0 : 1;
        this.aciertos = 0;
        this.fallos = 0;
        this.unresolvedRounds = 0;
        this.gameOver = rounds.isEmpty();
        this.finishedByTimeout = false;
        this.puntosGanados = 0;
        this.scoreAplicado = false;
        this.ultimoAcierto = null;
        this.ultimoPokemonCorrecto = null;
        this.completedAtMs = 0L;
    }

    public void adivinarPokemon(Long pokemonId) {
        if (gameOver || currentRound == null) {
            return;
        }

        boolean acierto = Objects.equals(currentRound.getPokemonCorrectoId(), pokemonId);
        if (acierto) {
            aciertos++;
        } else {
            fallos++;
            vidasRestantes = Math.max(0, totalLives - fallos);
        }

        ultimoAcierto = acierto;
        ultimoPokemonCorrecto = currentRound.getPokemonDelSonido() == null
            ? null
            : currentRound.getPokemonDelSonido().getName();

        currentRoundIndex++;

        if (currentRoundIndex >= rounds.size()) {
            currentRound = null;
            currentRoundNumber = totalRounds;
            gameOver = true;
            unresolvedRounds = 0;
            vidasRestantes = Math.max(0, totalLives - fallos);
            puntosGanados = calcularPuntosFinales();
            return;
        }

        currentRound = rounds.get(currentRoundIndex);
        currentRoundNumber = currentRoundIndex + 1;
    }

    public void forzarDerrota() {
        if (gameOver) {
            return;
        }

        currentRound = null;
        currentRoundIndex = rounds.size();
        currentRoundNumber = totalRounds;
        gameOver = true;
        unresolvedRounds = Math.max(0, totalRounds - aciertos - fallos);
        vidasRestantes = 0;
        puntosGanados = -25;
        ultimoAcierto = false;
        ultimoPokemonCorrecto = null;
    }

    public void finishByTimeout(long elapsedMs) {
        if (gameOver) {
            if (completedAtMs == 0L) {
                completedAtMs = elapsedMs;
            }
            return;
        }

        unresolvedRounds = Math.max(0, totalRounds - currentRoundIndex);
        vidasRestantes = Math.max(0, totalLives - fallos - unresolvedRounds);
        currentRound = null;
        currentRoundIndex = rounds.size();
        currentRoundNumber = totalRounds;
        gameOver = true;
        finishedByTimeout = true;
        completedAtMs = elapsedMs;
        puntosGanados = vidasRestantes > 0 ? calcularPuntosFinales() : 0;
    }

    public void markCompleted(long elapsedMs) {
        completedAtMs = elapsedMs;
        vidasRestantes = Math.max(0, totalLives - fallos);
        puntosGanados = vidasRestantes > 0 ? calcularPuntosFinales() : 0;
    }

    private int calcularPuntosFinales() {
        return switch (vidasRestantes) {
            case 4 -> 100;
            case 3 -> 75;
            case 2 -> 50;
            case 1 -> 25;
            default -> 0;
        };
    }
}
