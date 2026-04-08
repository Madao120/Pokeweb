package com.example.demo.dto.pokemon;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PokemonM2 {
    private int ronda;
    private String sonido;
    private List<PokemonOptionM2> opciones;

    @JsonIgnore
    private PokemonOptionM2 pokemonDelSonido;

    @JsonIgnore
    private PokemonOptionM2 pokemonIncorrecto1;

    @JsonIgnore
    private PokemonOptionM2 pokemonIncorrecto2;

    @JsonIgnore
    private PokemonOptionM2 pokemonIncorrecto3;

    @JsonIgnore
    private PokemonOptionM2 pokemonIncorrecto4;

    @JsonIgnore
    private Long pokemonCorrectoId;
}
