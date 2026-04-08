package com.example.demo.model;

import java.util.List;
import java.util.Objects;

import com.example.demo.dto.pokemon.PokemonM2;
import com.fasterxml.jackson.annotation.JsonIgnore;

import lombok.Data;

@Data
public class GameSessionM2 {

    private static final int TOTAL_ROUNDS = 4;

    private PokemonM2 currentRound;
    private int currentRoundNumber;
    private int totalRounds;
    private int aciertos;
    private int fallos;
    private boolean gameOver;
    private int puntosGanados;
    private boolean scoreAplicado;
    private Boolean ultimoAcierto;
    private String ultimoPokemonCorrecto;

    @JsonIgnore
    private final List<PokemonM2> rounds;

    @JsonIgnore
    private int currentRoundIndex;

    public GameSessionM2(List<PokemonM2> rounds) {
        this.rounds = rounds;
        this.currentRoundIndex = 0;
        this.totalRounds = TOTAL_ROUNDS;
        this.currentRound = rounds.isEmpty() ? null : rounds.get(0);
        this.currentRoundNumber = rounds.isEmpty() ? 0 : 1;
        this.aciertos = 0;
        this.fallos = 0;
        this.gameOver = rounds.isEmpty();
        this.puntosGanados = 0;
        this.scoreAplicado = false;
        this.ultimoAcierto = null;
        this.ultimoPokemonCorrecto = null;
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
        puntosGanados = -25;
        ultimoAcierto = false;
        ultimoPokemonCorrecto = null;
    }

    private int calcularPuntosFinales() {
        return switch (aciertos) {
            case 4 -> 100;
            case 3 -> 75;
            case 2 -> 50;
            case 1 -> 25;
            default -> -25;
        };
    }
}
