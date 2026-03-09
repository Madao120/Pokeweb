package com.example.demo.model;

import java.util.HashSet;
import java.util.Set;

import com.example.demo.dto.PokemonM1;

import jakarta.persistence.Entity;
import lombok.Data;

@Data
@Entity
public class GameSession {
// En esta clase controlaremos en número de intentos, el pokemon aleatorio y la palabra escondida(masked)

    private PokemonM1 pokemon;
    private String maskedWord;
    private int intentos;

    // Character es para almacenar las letras adivinadas una a una
    private Set<Character> guessedLetters = new HashSet<>();

    public GameSession(PokemonM1 pokemon) {

        this.pokemon = pokemon;
        this.intentos = 0;

        this.maskedWord = "_".repeat(pokemon.getName().length());
    }

    public void adivinarLetra(String letra) {
        ////Variables de la funcion adivinar letra////
        //Guardaremos el nombre del pokemon
        String name = pokemon.getName().toLowerCase();
        //Palabra a mostrar al frontend
        StringBuilder newMasked = new StringBuilder(maskedWord);
        
        ////Variables a partir de la interacción del usuario////
        // Ahora tendremos como variable la letra introducida por el usuario
        char c = letra.toLowerCase().charAt(0);

        guessedLetters.add(c);
        if (guessedLetters.contains(c)) {
            for (int i = 0; i < name.length(); i++) {
                if (name.charAt(i) == c) {
                    newMasked.setCharAt(i, c);
                }
            }
        }
        else {
            intentos++;
        }

        maskedWord = newMasked.toString();

    }
}
