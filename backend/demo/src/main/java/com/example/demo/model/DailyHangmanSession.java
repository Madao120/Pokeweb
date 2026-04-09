package com.example.demo.model;

import java.util.HashSet;
import java.util.Set;

import com.example.demo.dto.pokemon.PokemonM1;

import lombok.Data;

@Data
public class DailyHangmanSession {

    private PokemonM1 pokemon;
    private String maskedWord;
    private int intentos;
    private boolean gameOver;
    private boolean ganado;
    private Set<Character> guessedLetters = new HashSet<>();

    private boolean mostrarTipo1;
    private boolean mostrarGeneracion;
    private boolean mostrarTipo2;

    public DailyHangmanSession(PokemonM1 pokemon) {
        this.pokemon = pokemon;
        this.intentos = 0;
        this.gameOver = false;
        this.ganado = false;
        this.mostrarTipo1 = false;
        this.mostrarGeneracion = false;
        this.mostrarTipo2 = false;

        this.maskedWord = pokemon.getName().toLowerCase()
            .chars()
            .mapToObj(c -> Character.isLetter(c) ? "_" : String.valueOf((char) c))
            .collect(java.util.stream.Collectors.joining());
    }

    public void adivinarLetra(String letra) {
        if (gameOver || letra == null || letra.isBlank()) return;

        char c = letra.toLowerCase().charAt(0);
        if (guessedLetters.contains(c)) return;
        guessedLetters.add(c);

        String name = pokemon.getName().toLowerCase();
        boolean acierto = false;

        StringBuilder newMasked = new StringBuilder(maskedWord);
        for (int i = 0; i < name.length(); i++) {
            if (name.charAt(i) == c) {
                newMasked.setCharAt(i, c);
                acierto = true;
            }
        }

        maskedWord = newMasked.toString();

        if (!acierto) {
            intentos++;
            actualizarPistas();
        }

        if (!maskedWord.contains("_")) {
            gameOver = true;
            ganado = true;
            return;
        }

    }

    public void adivinarPalabra(String palabra) {
        if (gameOver) return;

        String intento = palabra == null ? "" : palabra.trim().toLowerCase();
        String name = pokemon.getName().toLowerCase();

        if (intento.isEmpty()) return;

        if (name.equals(intento)) {
            maskedWord = name;
            gameOver = true;
            ganado = true;
            return;
        }

        intentos++;
        actualizarPistas();

    }

    private void actualizarPistas() {
        if (intentos >= 2) mostrarTipo1 = true;
        if (intentos >= 4) mostrarGeneracion = true;
        if (intentos >= 6) mostrarTipo2 = true;
    }
}
