package com.example.demo.service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.example.demo.dto.room.RoomStateDTO;
import com.example.demo.dto.room.RoomStateDTO.PlayerSessionDTO;
import com.example.demo.model.GameSession;
import com.example.demo.model.GameSessionM2;
import com.example.demo.model.GameSessionM3Multi;
import com.example.demo.model.Room;
import com.example.demo.model.Room.State;

@Service
public class RoomService {

    private final Map<String, Room> rooms = new ConcurrentHashMap<>();
    private final PokemonApiService pokemonApiService;
    private static final String ROOM_PASSWORD_REGEX = "^\\d{3,}$";

    public RoomService(PokemonApiService pokemonApiService) {
        this.pokemonApiService = pokemonApiService;
    }

    // ── Crear sala ────────────────────────────────────────────────────────────

    public Room createRoom(Long userId, String password) {
        if (userId == null) {
            throw new RuntimeException("USER_ID_REQUIRED");
        }
        if (password == null || !password.trim().matches(ROOM_PASSWORD_REGEX)) {
            throw new RuntimeException("INVALID_ROOM_PASSWORD");
        }
        String code = generateCode();
        Room room = new Room(code, password.trim(), userId);
        rooms.put(code, room);
        return room;
    }

    // ── Unirse ────────────────────────────────────────────────────────────────

    public Room joinRoom(String code, Long userId, String password) {
        Room room = getRoom(code);

        if (room.getState() == State.FINISHED)
            throw new RuntimeException("ROOM_FINISHED");
        if (room.getState() == State.PLAYING)
            throw new RuntimeException("ROOM_ALREADY_STARTED");
        if (!room.checkPassword(password))
            throw new RuntimeException("WRONG_PASSWORD");

        // Reconexión: ya estaba en la sala
        if (room.getPlayerIds().contains(userId)) return room;

        room.getPlayerIds().add(userId);
        room.getRoundScores().put(userId, 0);
        return room;
    }

    // ── Expulsar jugador (solo líder, solo en WAITING) ────────────────────────

    public Room kickPlayer(String code, Long leaderId, Long targetId) {
        Room room = getRoom(code);

        if (!room.getLeaderId().equals(leaderId))
            throw new RuntimeException("NOT_LEADER");
        if (room.getState() != State.WAITING)
            throw new RuntimeException("ROOM_NOT_WAITING");
        if (targetId.equals(leaderId))
            throw new RuntimeException("CANNOT_KICK_YOURSELF");

        room.getPlayerIds().remove(targetId);
        room.getRoundScores().remove(targetId);
        room.getModeVotes().remove(targetId);
        room.getPostRoundVotes().remove(targetId);
        return room;
    }

    // ── Transferir liderazgo (solo líder en WAITING) ─────────────────────────

    public Room transferLeader(String code, Long currentLeaderId, Long newLeaderId) {
        Room room = getRoom(code);

        if (!room.getLeaderId().equals(currentLeaderId))
            throw new RuntimeException("NOT_LEADER");
        if (room.getState() != State.WAITING)
            throw new RuntimeException("ROOM_NOT_WAITING");
        if (!room.getPlayerIds().contains(newLeaderId))
            throw new RuntimeException("NEW_LEADER_NOT_IN_ROOM");

        room.setLeaderId(newLeaderId);
        return room;
    }

    // ── Voto de modo (en lobby WAITING) ───────────────────────────────────────

    public Room voteMode(String code, Long userId, Room.GameMode mode) {
        Room room = getRoom(code);
        if (room.getState() != State.WAITING)
            throw new RuntimeException("ROOM_NOT_WAITING");
        if (!room.getPlayerIds().contains(userId))
            throw new RuntimeException("NOT_IN_ROOM");

        // Un usuario solo mantiene un voto activo; si cambia de modo, se reemplaza.
        room.getModeVotes().put(userId, mode);
        return room;
    }

    // ── Iniciar ronda (líder escoge modo) ─────────────────────────────────────

    public Room startRound(String code, Long userId, Room.GameMode mode) {
        Room room = getRoom(code);

        if (!room.getLeaderId().equals(userId))
            throw new RuntimeException("NOT_LEADER");
        if (room.getState() != State.WAITING)
            throw new RuntimeException("ROOM_NOT_WAITING");
        if (room.getPlayerIds().size() < 2)
            throw new RuntimeException("NOT_ENOUGH_PLAYERS");

        room.setCurrentMode(mode);
        room.setState(State.PLAYING);
        room.configureRoundDuration(mode);
        room.setRoundStartTime(Instant.now().plusMillis(3000));
        room.getFinishOrder().clear();
        room.getFinishTimesMs().clear();
        room.getPostRoundVotes().clear();
        room.getLastRoundPoints().clear();

        if (mode == Room.GameMode.GUESS_SOUND) {
            var rounds = pokemonApiService.buildGuessSoundRounds(4);
            room.setSoundRounds(rounds);
            room.getPlayerIds().forEach(pid ->
                room.getPlayerSoundSessions().put(pid, new GameSessionM2(rounds))
            );
            room.getPlayerSessions().clear();
            room.getPlayerSpriteSessions().clear();
        } else if (mode == Room.GameMode.GUESS_SPRITE) {
            var pokemon = pokemonApiService.getRandomPokemonOptionM3();
            double focusX = 20 + ThreadLocalRandom.current().nextDouble() * 60;
            double focusY = 20 + ThreadLocalRandom.current().nextDouble() * 60;
            double zoomInicial = 3.1 + ThreadLocalRandom.current().nextDouble() * 1.8;

            room.getPlayerIds().forEach(pid ->
                room.getPlayerSpriteSessions().put(
                    pid,
                    new GameSessionM3Multi(pokemon, focusX, focusY, zoomInicial)
                )
            );
            room.getPlayerSessions().clear();
            room.getPlayerSoundSessions().clear();
        } else {
            // Crear una GameSession POR JUGADOR con el MISMO pokemon
            var pokemon = pokemonApiService.getRandomPokemon();
            room.getPlayerIds().forEach(pid ->
                room.getPlayerSessions().put(pid, new GameSession(pokemon))
            );
            room.getPlayerSoundSessions().clear();
            room.getPlayerSpriteSessions().clear();
        }

        return room;
    }

    // ── Adivinar letra ────────────────────────────────────────────────────────

    public RoomStateDTO guessLetter(String code, Long userId, String letra) {
        Room room = getRoom(code);

        if (room.getState() != State.PLAYING)
            throw new RuntimeException("ROOM_NOT_PLAYING");
        if (room.getCurrentMode() != Room.GameMode.HANGMAN)
            throw new RuntimeException("INVALID_GAME_MODE");
        if (!room.getPlayerIds().contains(userId))
            throw new RuntimeException("NOT_IN_ROOM");

        if (room.isCountdownActive()) {
            throw new RuntimeException("ROUND_COUNTDOWN_ACTIVE");
        }

        // Comprobar timer antes de procesar
        if (room.isTimeUp()) {
            return finishRoundByTimeout(room);
        }

        GameSession session = room.getPlayerSessions().get(userId);
        if (session == null || session.isGameOver())
            return toDTO(room, userId, null);

        session.adivinarLetra(letra);

        // Si el jugador terminó (ganó o agotó intentos) → registrar posición
        if (session.isGameOver() && !room.getFinishOrder().contains(userId)) {
            if (session.isGanado()) {
                room.getFinishOrder().add(userId);
            }
            // Si perdió (7 fallos) no entra en finishOrder → 0 puntos
        }

        // Comprobar si todos terminaron o se acabó el tiempo
        if (room.allFinished() || room.isTimeUp()) {
            return finishRound(room, userId);
        }

        return toDTO(room, userId, null);
    }

    public RoomStateDTO guessWord(String code, Long userId, String palabra) {
        Room room = getRoom(code);

        if (room.getState() != State.PLAYING)
            throw new RuntimeException("ROOM_NOT_PLAYING");
        if (room.getCurrentMode() != Room.GameMode.HANGMAN)
            throw new RuntimeException("INVALID_GAME_MODE");
        if (!room.getPlayerIds().contains(userId))
            throw new RuntimeException("NOT_IN_ROOM");
        if (room.isCountdownActive()) {
            throw new RuntimeException("ROUND_COUNTDOWN_ACTIVE");
        }
        if (room.isTimeUp()) {
            return finishRoundByTimeout(room);
        }

        GameSession session = room.getPlayerSessions().get(userId);
        if (session == null || session.isGameOver())
            return toDTO(room, userId, null);

        session.adivinarPalabra(palabra);

        if (session.isGameOver() && session.isGanado() && !room.getFinishOrder().contains(userId)) {
            room.getFinishOrder().add(userId);
        }

        if (room.allFinished() || room.isTimeUp()) {
            return finishRound(room, userId);
        }

        return toDTO(room, userId, null);
    }

    public RoomStateDTO guessSound(String code, Long userId, Long pokemonId) {
        Room room = getRoom(code);

        if (room.getState() != State.PLAYING)
            throw new RuntimeException("ROOM_NOT_PLAYING");
        if (room.getCurrentMode() != Room.GameMode.GUESS_SOUND)
            throw new RuntimeException("INVALID_GAME_MODE");
        if (!room.getPlayerIds().contains(userId))
            throw new RuntimeException("NOT_IN_ROOM");
        if (room.isCountdownActive()) {
            throw new RuntimeException("ROUND_COUNTDOWN_ACTIVE");
        }
        if (room.isTimeUp()) {
            return finishRoundByTimeout(room);
        }

        GameSessionM2 session = room.getPlayerSoundSessions().get(userId);
        if (session == null || session.isGameOver()) {
            return toDTO(room, userId, null);
        }

        session.adivinarPokemon(pokemonId);
        if (session.isGameOver()) {
            session.markCompleted(room.getElapsedRoundMs());
            room.getFinishTimesMs().putIfAbsent(userId, session.getCompletedAtMs());
        }

        if (room.allFinished() || room.isTimeUp()) {
            return finishRound(room, userId);
        }

        return toDTO(room, userId, null);
    }

    public RoomStateDTO guessSprite(String code, Long userId, Long pokemonId) {
        Room room = getRoom(code);

        if (room.getState() != State.PLAYING)
            throw new RuntimeException("ROOM_NOT_PLAYING");
        if (room.getCurrentMode() != Room.GameMode.GUESS_SPRITE)
            throw new RuntimeException("INVALID_GAME_MODE");
        if (!room.getPlayerIds().contains(userId))
            throw new RuntimeException("NOT_IN_ROOM");
        if (room.isCountdownActive()) {
            throw new RuntimeException("ROUND_COUNTDOWN_ACTIVE");
        }
        if (room.isTimeUp()) {
            return finishRoundByTimeout(room);
        }

        GameSessionM3Multi session = room.getPlayerSpriteSessions().get(userId);
        if (session == null || session.isGameOver()) {
            return toDTO(room, userId, null);
        }
        if (session.isGuessBlocked()) {
            throw new RuntimeException("GUESS_SPRITE_COOLDOWN_ACTIVE");
        }

        session.adivinarPokemon(pokemonId, room.getElapsedRoundMs());
        if (session.isGameOver() && session.isGanado()) {
            room.getFinishOrder().add(userId);
            room.getFinishTimesMs().putIfAbsent(userId, session.getCompletedAtMs());
        }

        if (room.allFinished() || room.isTimeUp()) {
            return finishRound(room, userId);
        }

        return toDTO(room, userId, null);
    }

    // ── Terminar ronda (todos acabaron o timeout) ─────────────────────────────

    private RoomStateDTO finishRound(Room room, Long requestingUserId) {
        room.setState(State.ROUND_FINISHED);
        if (room.getCurrentMode() == Room.GameMode.GUESS_SOUND) {
            calculateGuessSoundRoundPoints(room);
        } else {
            room.calculateRoundPoints();
        }
        return toDTO(room, requestingUserId, "¡Ronda terminada!");
    }

    private RoomStateDTO finishRoundByTimeout(Room room) {
        if (room.getState() == State.ROUND_FINISHED) {
            return toDTO(room, null, null);
        }
        if (room.getCurrentMode() == Room.GameMode.GUESS_SOUND) {
            long elapsedMs = room.getElapsedRoundMs();
            room.getPlayerSoundSessions().forEach((pid, session) -> {
                if (!session.isGameOver()) {
                    session.finishByTimeout(elapsedMs);
                } else if (session.getCompletedAtMs() == 0L) {
                    session.markCompleted(elapsedMs);
                }
                room.getFinishTimesMs().putIfAbsent(pid, session.getCompletedAtMs());
            });
        } else if (room.getCurrentMode() == Room.GameMode.GUESS_SPRITE) {
            room.getPlayerSpriteSessions().forEach((pid, session) -> {
                if (!session.isGameOver()) {
                    session.finishByTimeout();
                }
            });
        } else {
            // Marcar como gameOver a los que no terminaron
            room.getPlayerSessions().forEach((pid, session) -> {
                if (!session.isGameOver()) {
                    session.setGameOver(true);
                    session.setGanado(false);
                }
            });
        }
        return finishRound(room, null);
    }

    // ── Nueva ronda (vuelve a WAITING con mismos jugadores) ───────────────────

    public Room newRound(String code, Long leaderId) {
        Room room = getRoom(code);
        if (!room.getLeaderId().equals(leaderId))
            throw new RuntimeException("NOT_LEADER");
        if (room.getState() != State.ROUND_FINISHED)
            throw new RuntimeException("ROUND_NOT_FINISHED");

        room.resetRound(true);  // limpia sesiones, finishOrder y vuelve a WAITING
        return room;
    }

    public Room repeatCurrentMode(String code, Long leaderId) {
        Room room = getRoom(code);
        if (!room.getLeaderId().equals(leaderId))
            throw new RuntimeException("NOT_LEADER");
        if (room.getState() != State.ROUND_FINISHED)
            throw new RuntimeException("ROUND_NOT_FINISHED");
        if (room.getCurrentMode() == null)
            throw new RuntimeException("MODE_NOT_SELECTED");

        Room.GameMode currentMode = room.getCurrentMode();
        room.resetRound(false);
        room.getModeVotes().clear();
        return startRound(code, leaderId, currentMode);
    }

    public Room changeMode(String code, Long leaderId) {
        Room room = getRoom(code);
        if (!room.getLeaderId().equals(leaderId))
            throw new RuntimeException("NOT_LEADER");
        if (room.getState() != State.ROUND_FINISHED)
            throw new RuntimeException("ROUND_NOT_FINISHED");

        room.resetRound(true);
        return room;
    }

    // ── Voto de acción tras ronda (ROUND_FINISHED) ───────────────────────────

    public Room votePostRoundAction(String code, Long userId, Room.PostRoundAction action) {
        Room room = getRoom(code);
        if (room.getState() != State.ROUND_FINISHED)
            throw new RuntimeException("ROUND_NOT_FINISHED");
        if (!room.getPlayerIds().contains(userId))
            throw new RuntimeException("NOT_IN_ROOM");

        room.getPostRoundVotes().put(userId, action);
        return room;
    }

    // ── Terminar partida completa (solo líder) ────────────────────────────────

    public RoomStateDTO finishGame(String code, Long leaderId) {
        Room room = getRoom(code);
        if (!room.getLeaderId().equals(leaderId))
            throw new RuntimeException("NOT_LEADER");
        if (room.getState() != State.WAITING && room.getState() != State.ROUND_FINISHED)
            throw new RuntimeException("CANNOT_FINISH_NOW");

        room.setState(State.FINISHED);
        return toDTO(room, leaderId, "¡Partida terminada!");
    }

    // ── Ranking final ─────────────────────────────────────────────────────────

    private List<Long> buildFinalRanking(Room room) {
        return room.getPlayerIds().stream()
            .sorted(Comparator.comparingInt(
                pid -> -room.getRoundScores().getOrDefault(pid, 0)
            ))
            .collect(Collectors.toList());
    }

    // ── toDTO ─────────────────────────────────────────────────────────────────

    private void calculateGuessSoundRoundPoints(Room room) {
        int n = room.getPlayerIds().size();
        room.getLastRoundPoints().clear();
        room.getFinishOrder().clear();

        List<Long> rankedPlayers = room.getPlayerIds().stream()
            .sorted(
                Comparator
                    .comparingInt((Long pid) -> {
                        GameSessionM2 session = room.getPlayerSoundSessions().get(pid);
                        return session == null ? 0 : session.getVidasRestantes();
                    })
                    .reversed()
                    .thenComparingLong(pid -> room.getFinishTimesMs().getOrDefault(pid, Long.MAX_VALUE))
            )
            .collect(Collectors.toList());

        int rankedIndex = 0;
        for (Long pid : rankedPlayers) {
            GameSessionM2 session = room.getPlayerSoundSessions().get(pid);
            room.getFinishOrder().add(pid);

            int points = 0;
            if (session != null && session.getVidasRestantes() > 0) {
                points = (n - rankedIndex) * 2;
                rankedIndex++;
                room.getRoundScores().merge(pid, points, Integer::sum);
            }
            room.getLastRoundPoints().put(pid, points);
        }
    }

    public RoomStateDTO toDTO(Room room, Long requestingUserId, String message) {
        RoomStateDTO dto = new RoomStateDTO();
        dto.setRoomCode(room.getRoomCode());
        dto.setState(room.getState().name());
        dto.setLeaderId(room.getLeaderId());
        dto.setPlayerIds(new ArrayList<>(room.getPlayerIds()));
        dto.setFinishOrder(new ArrayList<>(room.getFinishOrder()));
        dto.setFinishTimesMs(new HashMap<>(room.getFinishTimesMs()));
        dto.setRoundScores(new HashMap<>(room.getRoundScores()));
        dto.setRemainingMs(room.getRemainingMs());
        dto.setCountdownRemainingMs(room.getCountdownRemainingMs());
        dto.setMessage(message);
        dto.setModeVotes(countModeVotes(room));
        dto.setPlayerModeVotes(buildPlayerModeVotes(room));
        dto.setPostRoundVotes(countPostRoundVotes(room));

        if (room.getCurrentMode() != null)
            dto.setGameMode(room.getCurrentMode().name());

        // Sesión individual del jugador que hace la petición
        if (requestingUserId != null) {
            if (room.getCurrentMode() == Room.GameMode.GUESS_SOUND) {
                GameSessionM2 mySoundSession = room.getPlayerSoundSessions().get(requestingUserId);
                if (mySoundSession != null) {
                    dto.setMySession(toSessionDTO(mySoundSession));
                }
            } else if (room.getCurrentMode() == Room.GameMode.GUESS_SPRITE) {
                GameSessionM3Multi mySpriteSession = room.getPlayerSpriteSessions().get(requestingUserId);
                if (mySpriteSession != null) {
                    dto.setMySession(toSessionDTO(mySpriteSession));
                    if (mySpriteSession.isGameOver()) {
                        dto.setPokemonName(mySpriteSession.getPokemon().getName());
                    }
                }
            } else {
                GameSession mySession = room.getPlayerSessions().get(requestingUserId);
                if (mySession != null) {
                    dto.setMySession(toSessionDTO(mySession));
                    applyTimeBasedHints(dto, room);
                    if (mySession.isGameOver()) {
                        dto.setPokemonName(mySession.getPokemon().getName());
                    }
                    dto.setPokemonType1(mySession.getPokemon().getType1());
                    dto.setPokemonType2(mySession.getPokemon().getType2());
                    dto.setPokemonGeneration(mySession.getPokemon().getGeneration());
                }
            }
        }

        // Progreso de todos los jugadores
        Map<Long, String> maskedWords = new HashMap<>();
        Map<Long, Boolean> finished = new HashMap<>();
        Map<Long, Integer> lives = new HashMap<>();
        Map<Long, Integer> hits = new HashMap<>();
        if (room.getCurrentMode() == Room.GameMode.GUESS_SOUND) {
            room.getPlayerSoundSessions().forEach((pid, s) -> {
                maskedWords.put(pid, "R" + s.getCurrentRoundNumber() + "/" + s.getTotalRounds());
                finished.put(pid, s.isGameOver());
                lives.put(pid, s.getVidasRestantes());
                hits.put(pid, s.getAciertos());
            });
        } else if (room.getCurrentMode() == Room.GameMode.GUESS_SPRITE) {
            room.getPlayerSpriteSessions().forEach((pid, s) -> {
                maskedWords.put(
                    pid,
                    s.isGanado() ? "ACERTADO" : s.getFallos() + "/" + s.getMaxFallos() + " fallos"
                );
                finished.put(pid, s.isGameOver());
                lives.put(pid, Math.max(0, s.getMaxFallos() - Math.min(s.getFallos(), s.getMaxFallos())));
                hits.put(pid, s.isGanado() ? 1 : 0);
            });
        } else {
            room.getPlayerSessions().forEach((pid, s) -> {
                maskedWords.put(pid, s.getMaskedWord());
                finished.put(pid, s.isGameOver());
            });
        }
        dto.setPlayerMaskedWords(maskedWords);
        dto.setPlayerFinished(finished);
        dto.setPlayerLives(lives);
        dto.setPlayerHits(hits);

        // Puntos de última ronda
        if (!room.getLastRoundPoints().isEmpty())
            dto.setLastRoundPoints(new HashMap<>(room.getLastRoundPoints()));

        // Ranking final
        if (room.getState() == State.FINISHED)
            dto.setFinalRanking(buildFinalRanking(room));

        return dto;
    }

    private Map<String, Integer> countModeVotes(Room room) {
        Map<String, Integer> out = new HashMap<>();
        room.getModeVotes().values().forEach(mode ->
                out.merge(mode.name(), 1, Integer::sum));
        return out;
    }

    private Map<Long, String> buildPlayerModeVotes(Room room) {
        Map<Long, String> out = new HashMap<>();
        room.getModeVotes().forEach((pid, mode) -> out.put(pid, mode.name()));
        return out;
    }

    private Map<String, Integer> countPostRoundVotes(Room room) {
        Map<String, Integer> out = new HashMap<>();
        room.getPostRoundVotes().values().forEach(action ->
                out.merge(action.name(), 1, Integer::sum));
        return out;
    }

    private PlayerSessionDTO toSessionDTO(GameSession s) {
        PlayerSessionDTO dto = new PlayerSessionDTO();
        dto.setMaskedWord(s.getMaskedWord());
        dto.setIntentos(s.getIntentos());
        dto.setGameOver(s.isGameOver());
        dto.setGanado(s.isGanado());
        dto.setMostrarTipo1(false);
        dto.setMostrarGeneracion(false);
        dto.setMostrarTipo2(false);
        dto.setGuessedLetters(new HashSet<>(s.getGuessedLetters()));
        return dto;
    }

    private PlayerSessionDTO toSessionDTO(GameSessionM2 s) {
        PlayerSessionDTO dto = new PlayerSessionDTO();
        dto.setGameOver(s.isGameOver());
        dto.setGanado(s.getVidasRestantes() > 0);
        dto.setCurrentRoundSound(s.getCurrentRound());
        dto.setCurrentRoundNumber(s.getCurrentRoundNumber());
        dto.setTotalRounds(s.getTotalRounds());
        dto.setTotalLives(s.getTotalLives());
        dto.setAciertos(s.getAciertos());
        dto.setFallos(s.getFallos());
        dto.setVidasRestantes(s.getVidasRestantes());
        dto.setUnresolvedRounds(s.getUnresolvedRounds());
        dto.setFinishedByTimeout(s.isFinishedByTimeout());
        dto.setCompletedAtMs(s.getCompletedAtMs());
        dto.setPuntosGanados(s.getPuntosGanados());
        dto.setUltimoAcierto(s.getUltimoAcierto());
        dto.setUltimoPokemonCorrecto(s.getUltimoPokemonCorrecto());
        return dto;
    }

    private PlayerSessionDTO toSessionDTO(GameSessionM3Multi s) {
        PlayerSessionDTO dto = new PlayerSessionDTO();
        dto.setGameOver(s.isGameOver());
        dto.setGanado(s.isGanado());
        dto.setFallos(s.getFallos());
        dto.setPuntosGanados(s.getPuntosGanados());
        dto.setPokemon(s.getPokemon());
        dto.setFocusX(s.getFocusX());
        dto.setFocusY(s.getFocusY());
        dto.setZoomActual(s.getZoomActual());
        dto.setMaxFallos(s.getMaxFallos());
        dto.setNextGuessAllowedAtMs(s.getNextGuessAllowedAtMs());
        dto.setCompletedAtMs(s.getCompletedAtMs());
        return dto;
    }

    private void applyTimeBasedHints(RoomStateDTO dto, Room room) {
        if (dto.getMySession() == null) return;
        long remainingMs = room.getRemainingMs();
        dto.getMySession().setMostrarTipo1(remainingMs <= 120_000L);
        dto.getMySession().setMostrarGeneracion(remainingMs <= 60_000L);
        dto.getMySession().setMostrarTipo2(remainingMs <= 30_000L);
    }

    public RoomStateDTO getRoomState(String code, Long userId) {
        Room room = getRoom(code);
        if (room.getState() == State.PLAYING && room.isTimeUp()) {
            return finishRoundByTimeout(room);
        }
        return toDTO(room, userId, null);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public Room getRoom(String code) {
        if (code == null || code.trim().isEmpty()) {
            throw new RuntimeException("ROOM_NOT_FOUND");
        }
        Room room = rooms.get(code.trim());
        if (room == null) throw new RuntimeException("ROOM_NOT_FOUND");
        return room;
    }

    private String generateCode() {
        String code;
        do {
            code = String.format("%06d", ThreadLocalRandom.current().nextInt(0, 1_000_000));
        } while (rooms.containsKey(code));
        return code;
    }
}
