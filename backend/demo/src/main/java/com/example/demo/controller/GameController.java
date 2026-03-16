package com.example.demo.controller;


import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

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
public class GameController {
 
    private final PokemonApiService pokemonApiService;
 
    // Cada usuario tiene su propia sesión identificada por su userId
    // ConcurrentHashMap es thread-safe para peticiones simultáneas
    private final Map<Long, GameSession> sessions = new ConcurrentHashMap<>();
 
    public GameController(PokemonApiService pokemonApiService) {
        this.pokemonApiService = pokemonApiService;
    }
 
    // Inicia una nueva partida para el usuario
    @PostMapping("/start")
    public GameSession startGame(@RequestParam Long userId) {
        GameSession session = new GameSession(pokemonApiService.getRandomPokemon());
        sessions.put(userId, session);
        return session;
    }
 
    // Devuelve el estado actual de la partida del usuario
    @GetMapping("/state")
    public GameSession getState(@RequestParam Long userId) {
        return sessions.get(userId);
    }
 
    // El usuario adivina una letra
    @PostMapping("/guess")
    public GameSession guess(@RequestParam Long userId, @RequestParam String letra) {
        GameSession session = sessions.get(userId);
        if (session == null) {
            throw new RuntimeException("No hay partida activa para este usuario");
        }
        session.adivinarLetra(letra);
        return session;
    }
 
    // Endpoint que usaba el frontend antes — ahora redirige a startGame
    // Devuelve solo el nombre enmascarado para no exponer el pokemon
    @GetMapping("/random-pokemon")
    public GameSession randomPokemon(@RequestParam Long userId) {
        GameSession session = new GameSession(pokemonApiService.getRandomPokemon());
        sessions.put(userId, session);
        return session;
    }
}