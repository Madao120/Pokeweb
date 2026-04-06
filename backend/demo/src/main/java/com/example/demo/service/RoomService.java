package com.example.demo.service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.example.demo.dto.room.RoomStateDTO;
import com.example.demo.dto.room.RoomStateDTO.PlayerSessionDTO;
import com.example.demo.model.GameSession;
import com.example.demo.model.Room;
import com.example.demo.model.Room.State;

@Service
public class RoomService {

    private final Map<String, Room> rooms = new ConcurrentHashMap<>();
    private final PokemonApiService pokemonApiService;

    public RoomService(PokemonApiService pokemonApiService) {
        this.pokemonApiService = pokemonApiService;
    }

    // ── Crear sala ────────────────────────────────────────────────────────────

    public Room createRoom(Long userId, String password) {
        String code = generateCode();
        Room room = new Room(code, password, userId);
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

        // Crear una GameSession POR JUGADOR con el MISMO pokemon
        var pokemon = pokemonApiService.getRandomPokemon();
        room.getPlayerIds().forEach(pid ->
            room.getPlayerSessions().put(pid, new GameSession(pokemon))
        );

        room.setCurrentMode(mode);
        room.setState(State.PLAYING);
        room.setRoundStartTime(Instant.now());
        room.getFinishOrder().clear();
        room.getPostRoundVotes().clear();

        return room;
    }

    // ── Adivinar letra ────────────────────────────────────────────────────────

    public RoomStateDTO guessLetter(String code, Long userId, String letra) {
        Room room = getRoom(code);

        if (room.getState() != State.PLAYING)
            throw new RuntimeException("ROOM_NOT_PLAYING");
        if (!room.getPlayerIds().contains(userId))
            throw new RuntimeException("NOT_IN_ROOM");

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

    // ── Terminar ronda (todos acabaron o timeout) ─────────────────────────────

    private RoomStateDTO finishRound(Room room, Long requestingUserId) {
        room.setState(State.ROUND_FINISHED);
        room.calculateRoundPoints();
        return toDTO(room, requestingUserId, "¡Ronda terminada!");
    }

    private RoomStateDTO finishRoundByTimeout(Room room) {
        if (room.getState() == State.ROUND_FINISHED) {
            return toDTO(room, null, null);
        }
        // Marcar como gameOver a los que no terminaron
        room.getPlayerSessions().forEach((pid, session) -> {
            if (!session.isGameOver()) {
                session.setGameOver(true);
                session.setGanado(false);
            }
        });
        return finishRound(room, null);
    }

    // ── Nueva ronda (vuelve a WAITING con mismos jugadores) ───────────────────

    public Room newRound(String code, Long leaderId) {
        Room room = getRoom(code);
        if (!room.getLeaderId().equals(leaderId))
            throw new RuntimeException("NOT_LEADER");
        if (room.getState() != State.ROUND_FINISHED)
            throw new RuntimeException("ROUND_NOT_FINISHED");

        room.resetRound();  // limpia sesiones, finishOrder y vuelve a WAITING
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

    public RoomStateDTO toDTO(Room room, Long requestingUserId, String message) {
        RoomStateDTO dto = new RoomStateDTO();
        dto.setRoomCode(room.getRoomCode());
        dto.setState(room.getState().name());
        dto.setLeaderId(room.getLeaderId());
        dto.setPlayerIds(new ArrayList<>(room.getPlayerIds()));
        dto.setFinishOrder(new ArrayList<>(room.getFinishOrder()));
        dto.setRoundScores(new HashMap<>(room.getRoundScores()));
        dto.setRemainingMs(room.getRemainingMs());
        dto.setMessage(message);
        dto.setModeVotes(countModeVotes(room));
        dto.setPostRoundVotes(countPostRoundVotes(room));

        if (room.getCurrentMode() != null)
            dto.setGameMode(room.getCurrentMode().name());

        // Sesión individual del jugador que hace la petición
        if (requestingUserId != null) {
            GameSession mySession = room.getPlayerSessions().get(requestingUserId);
            if (mySession != null) {
                dto.setMySession(toSessionDTO(mySession));
                if (mySession.isGameOver()) {
                    dto.setPokemonName(mySession.getPokemon().getName());
                }
                dto.setPokemonType1(mySession.getPokemon().getType1());
                dto.setPokemonType2(mySession.getPokemon().getType2());
                dto.setPokemonGeneration(mySession.getPokemon().getGeneration());
            }
        }

        // Progreso de todos los jugadores
        Map<Long, String> maskedWords = new HashMap<>();
        Map<Long, Boolean> finished = new HashMap<>();
        room.getPlayerSessions().forEach((pid, s) -> {
            maskedWords.put(pid, s.getMaskedWord());
            finished.put(pid, s.isGameOver());
        });
        dto.setPlayerMaskedWords(maskedWords);
        dto.setPlayerFinished(finished);

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
        dto.setMostrarTipo1(s.isMostrarTipo1());
        dto.setMostrarGeneracion(s.isMostrarGeneracion());
        dto.setMostrarTipo2(s.isMostrarTipo2());
        dto.setGuessedLetters(new HashSet<>(s.getGuessedLetters()));
        return dto;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public Room getRoom(String code) {
        Room room = rooms.get(code.toUpperCase());
        if (room == null) throw new RuntimeException("ROOM_NOT_FOUND");
        return room;
    }

    private String generateCode() {
        String code;
        do {
            code = UUID.randomUUID().toString()
                    .replace("-", "")
                    .substring(0, 6)
                    .toUpperCase();
        } while (rooms.containsKey(code));
        return code;
    }
}