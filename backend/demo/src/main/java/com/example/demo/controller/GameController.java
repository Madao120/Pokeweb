package com.example.demo.controller;


import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.service.PokemonApiService;

@RestController
@RequestMapping("/game")
public class GameController {

    private final PokemonApiService pokemonService;

    public GameController(PokemonApiService pokemonService) {
        this.pokemonService = pokemonService;
    }

    @GetMapping("/random-pokemon")
    public String randomPokemon() {
        return pokemonService.getRandomPokemon();
    }
}