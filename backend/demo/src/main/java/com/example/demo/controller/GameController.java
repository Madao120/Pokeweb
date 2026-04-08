package com.example.demo.controller;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.model.GameSession;
import com.example.demo.model.GameSessionM2;
import com.example.demo.model.GameSessionM3;
import com.example.demo.dto.pokemon.PokemonOptionM3;
import com.example.demo.service.PokeUserService;
import com.example.demo.service.PokemonApiService;

@RestController
@RequestMapping("/game")
public class GameController {

    private final PokemonApiService pokemonApiService;
    private final PokeUserService pokeUserService;

    // Active hangman sessions by user id.
    private final Map<Long, GameSession> sessions = new ConcurrentHashMap<>();

    // Active guess sound sessions by user id.
    private final Map<Long, GameSessionM2> sessionsM2 = new ConcurrentHashMap<>();

    // Active guess sprite sessions by user id.
    private final Map<Long, GameSessionM3> sessionsM3 = new ConcurrentHashMap<>();

    public GameController(PokemonApiService pokemonApiService, PokeUserService pokeUserService) {
        this.pokemonApiService = pokemonApiService;
        this.pokeUserService = pokeUserService;
    }

    @PostMapping("/start")
    public GameSession startGame(@RequestParam Long userId) {
        GameSession session = new GameSession(pokemonApiService.getRandomPokemon());
        sessions.put(userId, session);
        return session;
    }

    @GetMapping("/state")
    public GameSession getState(@RequestParam Long userId) {
        return sessions.get(userId);
    }

    @PostMapping("/guess")
    public GameSession guess(@RequestParam Long userId, @RequestParam String letra) {
        GameSession session = sessions.get(userId);
        if (session == null) {
            throw new RuntimeException("No hay partida activa para este usuario");
        }
        session.adivinarLetra(letra);

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

    // Legacy endpoint kept for compatibility with old frontend flow.
    @GetMapping("/random-pokemon")
    public GameSession randomPokemon(@RequestParam Long userId) {
        GameSession session = new GameSession(pokemonApiService.getRandomPokemon());
        sessions.put(userId, session);
        return session;
    }


    ////// MINIJUEGO 2 GUESSSOUND
    @PostMapping("/m2/start")
    public GameSessionM2 startGuessSoundGame(@RequestParam Long userId) {
        GameSessionM2 session = new GameSessionM2(pokemonApiService.buildGuessSoundRounds(4));
        sessionsM2.put(userId, session);
        return session;
    }

    @GetMapping("/m2/state")
    public GameSessionM2 getGuessSoundState(@RequestParam Long userId) {
        return sessionsM2.get(userId);
    }

    @PostMapping("/m2/guess")
    public GameSessionM2 guessSound(@RequestParam Long userId, @RequestParam Long pokemonId) {
        GameSessionM2 session = sessionsM2.get(userId);
        if (session == null) {
            throw new RuntimeException("No hay partida activa de GuessSound para este usuario");
        }

        session.adivinarPokemon(pokemonId);

        if (session.isGameOver() && !session.isScoreAplicado()) {
            session.setScoreAplicado(true);
            pokeUserService.addScoreM2(userId, session.getPuntosGanados());
            sessionsM2.remove(userId);
        }

        return session;
    }

    @PostMapping("/m2/abandon")
    public void abandonGuessSound(@RequestParam Long userId) {
        GameSessionM2 session = sessionsM2.get(userId);
        if (session != null && !session.isGameOver()) {
            pokeUserService.addScoreM2(userId, -25);
        }
        sessionsM2.remove(userId);
    }

    @PostMapping("/m2/force-lose")
    public GameSessionM2 forceLoseGuessSound(@RequestParam Long userId) {
        GameSessionM2 session = sessionsM2.get(userId);
        if (session == null) {
            throw new RuntimeException("No hay partida activa de GuessSound para este usuario");
        }

        if (!session.isGameOver()) {
            session.forzarDerrota();
            session.setScoreAplicado(true);
            pokeUserService.addScoreM2(userId, -25);
            sessionsM2.remove(userId);
        }

        return session;
    }


    ////// MINIJUEGO 3 GUESSSPRITE
    @PostMapping("/m3/start")
    public GameSessionM3 startGuessSpriteGame(@RequestParam Long userId) {
        double focusX = 20 + Math.random() * 60;
        double focusY = 20 + Math.random() * 60;
        double zoomInicial = 3.1 + Math.random() * 1.8;

        GameSessionM3 session = new GameSessionM3(
            pokemonApiService.getRandomPokemonOptionM3(),
            focusX,
            focusY,
            zoomInicial
        );
        sessionsM3.put(userId, session);
        return session;
    }

    @GetMapping("/m3/state")
    public GameSessionM3 getGuessSpriteState(@RequestParam Long userId) {
        return sessionsM3.get(userId);
    }

    @GetMapping("/m3/pokemon-list")
    public List<PokemonOptionM3> getGuessSpritePokemonList() {
        return pokemonApiService.getPokemonCatalogM3();
    }

    @PostMapping("/m3/guess")
    public GameSessionM3 guessSprite(@RequestParam Long userId, @RequestParam Long pokemonId) {
        GameSessionM3 session = sessionsM3.get(userId);
        if (session == null) {
            throw new RuntimeException("No hay partida activa de GuessSprite para este usuario");
        }

        session.adivinarPokemon(pokemonId);

        if (session.isGameOver() && !session.isScoreAplicado()) {
            session.setScoreAplicado(true);
            pokeUserService.addScoreM3(userId, session.getPuntosGanados());
            sessionsM3.remove(userId);
        }

        return session;
    }

    @PostMapping("/m3/abandon")
    public void abandonGuessSprite(@RequestParam Long userId) {
        GameSessionM3 session = sessionsM3.get(userId);
        if (session != null && !session.isGameOver()) {
            pokeUserService.addScoreM3(userId, -25);
        }
        sessionsM3.remove(userId);
    }

    @PostMapping("/m3/force-lose")
    public GameSessionM3 forceLoseGuessSprite(@RequestParam Long userId) {
        GameSessionM3 session = sessionsM3.get(userId);
        if (session == null) {
            throw new RuntimeException("No hay partida activa de GuessSprite para este usuario");
        }

        if (!session.isGameOver()) {
            session.forzarDerrota();
            session.setScoreAplicado(true);
            pokeUserService.addScoreM3(userId, -25);
            sessionsM3.remove(userId);
        }

        return session;
    }
}
