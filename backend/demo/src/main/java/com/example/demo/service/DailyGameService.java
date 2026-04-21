package com.example.demo.service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

import com.example.demo.dto.game.DailyHangmanRoundResponse;
import com.example.demo.dto.game.DailyRankingEntry;
import com.example.demo.dto.game.DailySpriteRoundResponse;
import com.example.demo.model.DailyHangmanSession;
import com.example.demo.model.DailySpriteSession;
import com.example.demo.model.PokeUser;

@Service
public class DailyGameService {

    private final PokemonApiService pokemonApiService;
    private final PokeUserService pokeUserService;

    private final Map<Long, DailyHangmanSession> hangmanSessions = new ConcurrentHashMap<>();
    private final Map<Long, DailySpriteSession> spriteSessions = new ConcurrentHashMap<>();

    public DailyGameService(PokemonApiService pokemonApiService, PokeUserService pokeUserService) {
        this.pokemonApiService = pokemonApiService;
        this.pokeUserService = pokeUserService;
    }

    public DailyHangmanRoundResponse startDailyHangman(Long userId) {
        LocalDate today = LocalDate.now();
        PokeUser user = pokeUserService.getRequiredUser(userId);

        if (isCompletedToday(user.getDailyHangmanDate(), today)) {
            hangmanSessions.remove(userId);
            return buildDailyHangmanLockedResponse(userId, today, user);
        }

        DailyHangmanSession session = new DailyHangmanSession(pokemonApiService.getDailyPokemonM1(today, "DAILY_M1"));
        hangmanSessions.put(userId, session);
        return buildDailyHangmanPlayableResponse(userId, today, session);
    }

    public DailyHangmanRoundResponse guessDailyHangmanLetter(Long userId, String letra) {
        LocalDate today = LocalDate.now();
        PokeUser user = pokeUserService.getRequiredUser(userId);

        if (isCompletedToday(user.getDailyHangmanDate(), today)) {
            hangmanSessions.remove(userId);
            return buildDailyHangmanLockedResponse(userId, today, user);
        }

        DailyHangmanSession session = hangmanSessions.computeIfAbsent(
            userId,
            ignored -> new DailyHangmanSession(pokemonApiService.getDailyPokemonM1(today, "DAILY_M1"))
        );

        session.adivinarLetra(letra);
        if (session.isGameOver() && session.isGanado()) {
            pokeUserService.saveDailyHangmanResult(userId, today, session.getIntentos(), LocalDateTime.now());
            hangmanSessions.remove(userId);
            return buildDailyHangmanLockedResponse(userId, today, pokeUserService.getRequiredUser(userId));
        }

        return buildDailyHangmanPlayableResponse(userId, today, session);
    }

    public DailyHangmanRoundResponse guessDailyHangmanWord(Long userId, String palabra) {
        LocalDate today = LocalDate.now();
        PokeUser user = pokeUserService.getRequiredUser(userId);

        if (isCompletedToday(user.getDailyHangmanDate(), today)) {
            hangmanSessions.remove(userId);
            return buildDailyHangmanLockedResponse(userId, today, user);
        }

        DailyHangmanSession session = hangmanSessions.computeIfAbsent(
            userId,
            ignored -> new DailyHangmanSession(pokemonApiService.getDailyPokemonM1(today, "DAILY_M1"))
        );

        session.adivinarPalabra(palabra);
        if (session.isGameOver() && session.isGanado()) {
            pokeUserService.saveDailyHangmanResult(userId, today, session.getIntentos(), LocalDateTime.now());
            hangmanSessions.remove(userId);
            return buildDailyHangmanLockedResponse(userId, today, pokeUserService.getRequiredUser(userId));
        }

        return buildDailyHangmanPlayableResponse(userId, today, session);
    }

    public DailyHangmanRoundResponse getDailyHangmanState(Long userId) {
        LocalDate today = LocalDate.now();
        PokeUser user = pokeUserService.getRequiredUser(userId);

        if (isCompletedToday(user.getDailyHangmanDate(), today)) {
            hangmanSessions.remove(userId);
            return buildDailyHangmanLockedResponse(userId, today, user);
        }

        DailyHangmanSession session = hangmanSessions.get(userId);
        if (session == null) {
            return buildDailyHangmanPlayableResponse(userId, today, null);
        }
        return buildDailyHangmanPlayableResponse(userId, today, session);
    }

    public DailySpriteRoundResponse startDailySprite(Long userId) {
        LocalDate today = LocalDate.now();
        PokeUser user = pokeUserService.getRequiredUser(userId);

        if (isCompletedToday(user.getDailySpriteDate(), today)) {
            spriteSessions.remove(userId);
            return buildDailySpriteLockedResponse(userId, today, user);
        }

        DailySpriteSession session = createDailySpriteSession(today);
        spriteSessions.put(userId, session);
        return buildDailySpritePlayableResponse(userId, today, session);
    }

    public DailySpriteRoundResponse guessDailySprite(Long userId, Long pokemonId) {
        LocalDate today = LocalDate.now();
        PokeUser user = pokeUserService.getRequiredUser(userId);

        if (isCompletedToday(user.getDailySpriteDate(), today)) {
            spriteSessions.remove(userId);
            return buildDailySpriteLockedResponse(userId, today, user);
        }

        DailySpriteSession session = spriteSessions.computeIfAbsent(userId, ignored -> createDailySpriteSession(today));
        session.adivinarPokemon(pokemonId);

        if (session.isGameOver() && session.isGanado()) {
            pokeUserService.saveDailySpriteResult(userId, today, session.getIntentos(), LocalDateTime.now());
            spriteSessions.remove(userId);
            return buildDailySpriteLockedResponse(userId, today, pokeUserService.getRequiredUser(userId));
        }

        return buildDailySpritePlayableResponse(userId, today, session);
    }

    public DailySpriteRoundResponse getDailySpriteState(Long userId) {
        LocalDate today = LocalDate.now();
        PokeUser user = pokeUserService.getRequiredUser(userId);

        if (isCompletedToday(user.getDailySpriteDate(), today)) {
            spriteSessions.remove(userId);
            return buildDailySpriteLockedResponse(userId, today, user);
        }

        DailySpriteSession session = spriteSessions.get(userId);
        if (session == null) {
            return buildDailySpritePlayableResponse(userId, today, null);
        }
        return buildDailySpritePlayableResponse(userId, today, session);
    }

    private DailySpriteSession createDailySpriteSession(LocalDate date) {
        double focusX = 20 + Math.random() * 60;
        double focusY = 20 + Math.random() * 60;
        double zoomInicial = 3.1 + Math.random() * 1.8;
        return new DailySpriteSession(
            pokemonApiService.getDailyPokemonM3(date, "DAILY_M3"),
            focusX,
            focusY,
            zoomInicial
        );
    }

    private DailyHangmanRoundResponse buildDailyHangmanPlayableResponse(Long userId, LocalDate today, DailyHangmanSession session) {
        return new DailyHangmanRoundResponse(
            session,
            true,
            false,
            null,
            null,
            pokemonApiService.getDailyPokemonM1(today.minusDays(1), "DAILY_M1").getName(),
            millisUntilNextReset(),
            pokeUserService.getDailyHangmanRanking(today, userId)
        );
    }

    private DailyHangmanRoundResponse buildDailyHangmanLockedResponse(Long userId, LocalDate today, PokeUser user) {
        DailyHangmanSession solvedSession = buildSolvedDailyHangmanSession(today, user);
        return new DailyHangmanRoundResponse(
            solvedSession,
            false,
            true,
            user.getDailyHangmanAttempts(),
            pokemonApiService.getDailyPokemonM1(today, "DAILY_M1").getName(),
            pokemonApiService.getDailyPokemonM1(today.minusDays(1), "DAILY_M1").getName(),
            millisUntilNextReset(),
            pokeUserService.getDailyHangmanRanking(today, userId)
        );
    }

    private DailySpriteRoundResponse buildDailySpritePlayableResponse(Long userId, LocalDate today, DailySpriteSession session) {
        return new DailySpriteRoundResponse(
            session,
            true,
            false,
            null,
            null,
            pokemonApiService.getDailyPokemonM3(today.minusDays(1), "DAILY_M3").getName(),
            millisUntilNextReset(),
            pokeUserService.getDailySpriteRanking(today, userId)
        );
    }

    private DailySpriteRoundResponse buildDailySpriteLockedResponse(Long userId, LocalDate today, PokeUser user) {
        return new DailySpriteRoundResponse(
            null,
            false,
            true,
            user.getDailySpriteAttempts(),
            pokemonApiService.getDailyPokemonM3(today, "DAILY_M3").getName(),
            pokemonApiService.getDailyPokemonM3(today.minusDays(1), "DAILY_M3").getName(),
            millisUntilNextReset(),
            pokeUserService.getDailySpriteRanking(today, userId)
        );
    }

    private boolean isCompletedToday(LocalDate playedDate, LocalDate today) {
        return playedDate != null && playedDate.equals(today);
    }

    private DailyHangmanSession buildSolvedDailyHangmanSession(LocalDate today, PokeUser user) {
        DailyHangmanSession solvedSession = new DailyHangmanSession(
            pokemonApiService.getDailyPokemonM1(today, "DAILY_M1")
        );
        solvedSession.setMaskedWord(solvedSession.getPokemon().getName().toLowerCase());
        solvedSession.setIntentos(user.getDailyHangmanAttempts());
        solvedSession.setGameOver(true);
        solvedSession.setGanado(true);
        solvedSession.setMostrarTipo1(true);
        solvedSession.setMostrarGeneracion(true);
        solvedSession.setMostrarTipo2(true);
        return solvedSession;
    }

    private long millisUntilNextReset() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime nextMidnight = LocalDateTime.of(now.toLocalDate().plusDays(1), LocalTime.MIDNIGHT);
        return Duration.between(now, nextMidnight).toMillis();
    }
}
