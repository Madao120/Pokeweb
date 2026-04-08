package com.example.demo.model;

import java.util.Objects;

import com.example.demo.dto.pokemon.PokemonOptionM3;

import lombok.Data;

@Data
public class GameSessionM3 {

    private static final int MAX_FALLOS = 5;

    private PokemonOptionM3 pokemon;
    private int fallos;
    private int maxFallos;
    private boolean gameOver;
    private boolean ganado;
    private int puntosGanados;
    private boolean scoreAplicado;
    private double focusX;
    private double focusY;
    private double zoomInicial;
    private double zoomMinimo;
    private double zoomActual;

    public GameSessionM3(
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
        this.scoreAplicado = false;
        this.focusX = focusX;
        this.focusY = focusY;
        this.zoomInicial = zoomInicial;
        this.zoomMinimo = 1.12;
        this.zoomActual = zoomInicial;
    }

    public void adivinarPokemon(Long pokemonId) {
        if (gameOver) {
            return;
        }

        boolean acierto = Objects.equals(
            pokemon == null ? null : pokemon.getId(),
            pokemonId
        );

        if (acierto) {
            gameOver = true;
            ganado = true;
            puntosGanados = calcularPuntosPorFallos();
            return;
        }

        fallos++;

        if (fallos > maxFallos) {
            gameOver = true;
            ganado = false;
            puntosGanados = -25;
            zoomActual = zoomMinimo;
            return;
        }

        zoomActual = calcularZoomActual();
    }

    public void forzarDerrota() {
        if (gameOver) {
            return;
        }
        fallos = maxFallos + 1;
        zoomActual = zoomMinimo;
        gameOver = true;
        ganado = false;
        puntosGanados = -25;
    }

    private int calcularPuntosPorFallos() {
        return switch (fallos) {
            case 0 -> 100;
            case 1 -> 80;
            case 2 -> 60;
            case 3 -> 40;
            case 4 -> 20;
            default -> 10;
        };
    }

    private double calcularZoomActual() {
        double progress = Math.min(fallos, maxFallos) / (double) maxFallos;
        return zoomInicial - (zoomInicial - zoomMinimo) * progress;
    }
}
