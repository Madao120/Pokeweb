package com.example.demo.model;

import java.util.Objects;

import com.example.demo.dto.pokemon.PokemonOptionM3;

import lombok.Data;

@Data
public class DailySpriteSession {

    private PokemonOptionM3 pokemon;
    private boolean gameOver;
    private boolean ganado;
    private int intentos;
    private double focusX;
    private double focusY;
    private double zoomInicial;
    private double zoomMinimo;
    private double zoomActual;

    public DailySpriteSession(PokemonOptionM3 pokemon, double focusX, double focusY, double zoomInicial) {
        this.pokemon = pokemon;
        this.gameOver = false;
        this.ganado = false;
        this.intentos = 0;
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

        intentos++;
        boolean acierto = Objects.equals(pokemon == null ? null : pokemon.getId(), pokemonId);

        if (acierto) {
            gameOver = true;
            ganado = true;
            return;
        }

        zoomActual = Math.max(zoomMinimo, zoomActual - 0.35);
    }
}
