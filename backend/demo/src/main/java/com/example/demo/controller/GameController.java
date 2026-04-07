package com.example.demo.controller;


import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.model.GameSession;
import com.example.demo.service.PokeUserService;
import com.example.demo.service.PokemonApiService;

@RestController
@RequestMapping("/game")
public class GameController {
 
    // Inyectamos el servicio de la APIpara obtener pokemons
    private final PokemonApiService pokemonApiService;
 
    // Inyectamos el servicio de usuarios para actualizar el score al finalizar la partida
    private final PokeUserService pokeUserService;

    // Cada usuario tiene su propia sesión identificada por su userId
    // ConcurrentHashMap es thread-safe para peticiones simultáneas
    private final Map<Long, GameSession> sessions = new ConcurrentHashMap<>();
 
    public GameController(PokemonApiService pokemonApiService, PokeUserService pokeUserService) {
        this.pokemonApiService = pokemonApiService;
        this.pokeUserService = pokeUserService;
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
        
        // scoreAplicado evita que se sume más de una vez si llegan peticiones duplicadas (en esto me ayudó la IA, no sabia que era algo que podía pasar)
        if (session.isGameOver() && !session.isScoreAplicado()) {
            session.setScoreAplicado(true);
            pokeUserService.addScoreM1(userId, session.getPuntosGanados());
            sessions.remove(userId);
        }

        return session;
    }

    @PostMapping("/guess-word")
    public GameSession guessWord(@RequestParam Long userId, @RequestParam String palabra) {
        GameSession session = sessions.get(userId);
        if (session == null) {
            throw new RuntimeException("No hay partida activa para este usuario");
        }
        session.adivinarPalabra(palabra);

        if (session.isGameOver() && !session.isScoreAplicado()) {
            session.setScoreAplicado(true);
            pokeUserService.addScoreM1(userId, session.getPuntosGanados());
            sessions.remove(userId);
        }

        return session;
    }

     // Si el usuario abandona la partida activa (navegar fuera, cerrar, recargar), pierde 25 puntos
    @PostMapping("/abandon")
    public void abandon(@RequestParam Long userId) {
        GameSession session = sessions.get(userId);
        if (session != null && !session.isGameOver()) {
            pokeUserService.addScoreM1(userId, -25);
        }
        sessions.remove(userId);
    }
 
    @PostMapping("/force-lose")
    public GameSession forceLose(@RequestParam Long userId) {
        GameSession session = sessions.get(userId);
        if (session == null) {
            throw new RuntimeException("No hay partida activa para este usuario");
        }

        if (!session.isGameOver()) {
            session.setIntentos(7);
            session.setGameOver(true);
            session.setGanado(false);
            session.setPuntosGanados(-25);
            session.setScoreAplicado(true);
            pokeUserService.addScoreM1(userId, -25);
            sessions.remove(userId);
        }

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
