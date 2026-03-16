package com.example.demo.model;

import java.util.HashSet;
import java.util.Set;

import com.example.demo.dto.PokemonM1;

import lombok.Data;

@Data
public class GameSession {
 
    private static final int MAX_INTENTOS = 6;
 
    private PokemonM1 pokemon;
    private String maskedWord;
    private int intentos;
    private boolean gameOver;
    private boolean ganado;
    private Set<Character> guessedLetters = new HashSet<>();
 
    public GameSession(PokemonM1 pokemon) {
        this.pokemon = pokemon;
        this.intentos = 0;
        this.gameOver = false;
        this.ganado = false;
        this.maskedWord = "_".repeat(pokemon.getName().length());
    }
 
    public void adivinarLetra(String letra) {
        if (gameOver) return;
 
        char c = letra.toLowerCase().charAt(0);
 
        // Si la letra ya fue usada, ignorar
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
 
        // Solo sumar intento si la letra NO estaba en el nombre
        if (!acierto) {
            intentos++;
        }
 
        // Comprobar si ganó (no quedan guiones bajos)
        if (!maskedWord.contains("_")) {
            gameOver = true;
            ganado = true;
        }
 
        // Comprobar si perdió
        if (intentos >= MAX_INTENTOS) {
            gameOver = true;
            ganado = false;
        }
    }
}
