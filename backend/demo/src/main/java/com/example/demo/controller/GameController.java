package com.example.demo.controller;


import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.service.PokemonApiService;

@RestController
@RequestMapping("/game")
@CrossOrigin
public class GameController {

    private final PokemonApiService pokemonApiService;

    private GameSession currentSession;

    public GameController(PokemonApiService pokemonApiService) {
        this.pokemonApiService = pokemonApiService;
    }

    @PostMapping("/start")
    public GameSession startGame() {

        currentSession = new GameSession(
                pokemonApiService.getRandomPokemon()
        );

        return currentSession;
    }

    @GetMapping("/state")
    public GameSession getState() {
        return currentSession;
    }

    @PostMapping("/guess")
    public GameSession guess(@RequestParam String letter) {

        if (currentSession == null) {
            throw new RuntimeException("Game not started");
        }

        currentSession.guessLetter(letter);

        return currentSession;
    }
}