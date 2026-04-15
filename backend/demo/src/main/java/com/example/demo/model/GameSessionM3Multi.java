package com.example.demo.model;

import java.util.Objects;

import com.example.demo.dto.pokemon.PokemonOptionM3;

import lombok.Data;

@Data
public class GameSessionM3Multi {

    private static final int MAX_FALLOS = 7;
    private static final long GUESS_COOLDOWN_MS = 10_000L;

    private PokemonOptionM3 pokemon;
    private int fallos;
    private int maxFallos;
    private boolean gameOver;
    private boolean ganado;
    private int puntosGanados;
    private double focusX;
    private double focusY;
    private double zoomInicial;
    private double zoomMinimo;
    private double zoomActual;
    private long nextGuessAllowedAtMs;
    private long completedAtMs;

    public GameSessionM3Multi(
        PokemonOptionM3 pokemon,
        double focusX,
        double focusY,
        double zoomInicial
    ) {
        this.pokemon = pokemon;
        this.fallos = 0;
        this.maxFallos = MAX_FALLOS;
        this.gameOver = false;
        this.ganado = false;
        this.puntosGanados = 0;
        this.focusX = focusX;
        this.focusY = focusY;
        this.zoomInicial = zoomInicial;
        this.zoomMinimo = 1.12;
        this.zoomActual = zoomInicial;
        this.nextGuessAllowedAtMs = 0L;
        this.completedAtMs = 0L;
    }

    public boolean isGuessBlocked() {
        return !gameOver && System.currentTimeMillis() < nextGuessAllowedAtMs;
    }

    public void adivinarPokemon(Long pokemonId, long completedAtMs) {
        if (gameOver) return;

        boolean acierto = Objects.equals(
            pokemon == null ? null : pokemon.getId(),
            pokemonId
        );

        if (acierto) {
            gameOver = true;
            ganado = true;
            puntosGanados = 0;
            zoomActual = zoomMinimo;
            this.completedAtMs = completedAtMs;
            return;
        }

        fallos++;
        nextGuessAllowedAtMs = System.currentTimeMillis() + GUESS_COOLDOWN_MS;
        zoomActual = calcularZoomActual();
    }

    public void finishByTimeout() {
        if (gameOver) return;
        gameOver = true;
        ganado = false;
        puntosGanados = 0;
        zoomActual = zoomMinimo;
        nextGuessAllowedAtMs = 0L;
    }

    private double calcularZoomActual() {
        double progress = Math.min(fallos, maxFallos) / (double) maxFallos;
        return zoomInicial - (zoomInicial - zoomMinimo) * progress;
    }
}
