package com.example.demo.controller;


import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.model.GameSession;
import com.example.demo.service.PokemonApiService;

@RestController
@RequestMapping("/game")
@CrossOrigin
public class GameController {

    private final PokemonApiService pokemonApiService;

    private GameSession session;

    public GameController(PokemonApiService pokemonApiService) {
        this.pokemonApiService = pokemonApiService;
    }

    @PostMapping("/start")
    public GameSession startGame() {

        session = new GameSession(
                pokemonApiService.getRandomPokemon()
        );

        return session;
    }

    @GetMapping("/state")
    public GameSession getState() {
        return session;
    }

    @PostMapping("/guess")
    public GameSession guess(@RequestParam String letra) {

        session.adivinarLetra(letra);

        return session;
    }
}