package com.example.demo.model;

import java.util.HashSet;
import java.util.Set;

import com.example.demo.dto.PokemonM1;

import lombok.Data;

@Data
public class GameSession {
 
    private static final int MAX_INTENTOS = 7;
 
    private PokemonM1 pokemon;
    private String maskedWord;
    private int intentos;
    private boolean gameOver;
    private boolean ganado;
    private int puntosGanados;
    private boolean scoreAplicado = false;
    private Set<Character> guessedLetters = new HashSet<>();
 
    //PISTAS
    // Intentos 0-1: ninguna pista
    // Intentos 2-3: mostrar tipo1
    // Intentos 4-5: mostrar generacion
    // Intentos 6: mostrar tipo2
    private boolean mostrarTipo1;
    private boolean mostrarGeneracion;
    private boolean mostrarTipo2;
    

    public GameSession(PokemonM1 pokemon) {
        this.pokemon = pokemon;
        this.intentos = 0;
        this.puntosGanados = 0;
        this.gameOver = false;
        this.ganado = false;
        this.mostrarTipo1 = false;
        this.mostrarGeneracion = false;
        this.mostrarTipo2 = false;

        // Para enmascarar solo las lertas del nombre deberemos de hacer lo siguiente;
        this.maskedWord = pokemon.getName().toLowerCase()
            .chars()
            .mapToObj(c -> Character.isLetter(c) ? "_" : String.valueOf((char) c))
            .collect(java.util.stream.Collectors.joining());
        // Esto es debido a que hay nombres con caracteres especiales, como guiones espacios, etc
    }
 
    public void adivinarLetra(String letra) {
        if (gameOver) return;
 
        // En cuanto a las letras introducidas solo se podran escribir una por vez 🗣
        char c = letra.toLowerCase().charAt(0);
 
        // Si la letra ya fue usada, ignorar
        if (guessedLetters.contains(c)) return;
        
        // Por cada intento agregar la letra a las usadas
        guessedLetters.add(c); 
 
        String name = pokemon.getName().toLowerCase();
        boolean acierto = false;
 
        // Funcionamiento para comprobar los intentos, si la letra coincide con alguna del nombre, se reemplaza el guion bajo por la letra
        StringBuilder newMasked = new StringBuilder(maskedWord);
        for (int i = 0; i < name.length(); i++) {
            if (name.charAt(i) == c) {
                newMasked.setCharAt(i, c);
                acierto = true;
            }
        }
        
        // Actualizar la palabra enmascarada
        maskedWord = newMasked.toString();
 
        // Solo sumar intento si la letra NO estaba en el nombre
        if (!acierto) {
            intentos++;
        }

        // Actualizar pistas visibles según intentos fallados
        actualizarPistas();
 
        // Comprobar si ganó (no quedan guiones bajos)
        if (!maskedWord.contains("_")) {
            gameOver = true;
            ganado = true;
            puntosGanados = calcularPuntos();
        }
 
        // Comprobar si perdió
        if (intentos >= MAX_INTENTOS) {
            gameOver = true;
            ganado = false;
            puntosGanados = -25;
        }
    }
    private void actualizarPistas() {
        if (intentos >= 2) mostrarTipo1 = true;
        if (intentos >= 4) mostrarGeneracion = true;
        if (intentos >= 6) mostrarTipo2 = true;
    }
 
    private int calcularPuntos() {
        return switch (intentos) {
            case 0 -> 100;
            case 1 -> 70;
            case 2 -> 60;
            case 3 -> 50;
            case 4 -> 40;
            case 5 -> 30;
            case 6 -> 20;
            default -> 10;
        };
    }
}
