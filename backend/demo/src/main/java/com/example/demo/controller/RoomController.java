package com.example.demo.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import com.example.demo.dto.game.GuessLetterMessage;
import com.example.demo.dto.room.CreateRoomRequest;
import com.example.demo.dto.room.JoinRoomRequest;
import com.example.demo.dto.room.KickPlayerRequest;
import com.example.demo.dto.room.RoomStateDTO;
import com.example.demo.dto.room.TransferLeaderRequest;
import com.example.demo.dto.room.VoteModeRequest;
import com.example.demo.dto.room.VotePostRoundRequest;
import com.example.demo.model.Room;
import com.example.demo.service.RoomService;

/**
 * REST + WebSocket para multijugador.
 *
 * REST:
 *   POST   /rooms                        → crear sala
 *   POST   /rooms/{code}/join            → unirse
 *   POST   /rooms/{code}/kick            → expulsar jugador (líder)
 *   POST   /rooms/{code}/start           → iniciar ronda
 *   POST   /rooms/{code}/next-round      → nueva ronda (vuelve a sala)
 *   POST   /rooms/{code}/finish          → terminar partida completa
 *   GET    /rooms/{code}                 → estado actual (reconexión)
 *
 * WebSocket STOMP:
 *   Enviar a:      /app/room/{code}/guess
 *   Suscribirse:   /topic/room/{code}
 *   Suscribirse:   /topic/room/{code}/player/{userId}  (estado individual)
 */
@RestController
@RequestMapping("/rooms")
public class RoomController {

    private final RoomService roomService;
    private final SimpMessagingTemplate messaging;

    public RoomController(RoomService roomService, SimpMessagingTemplate messaging) {
        this.roomService = roomService;
        this.messaging   = messaging;
    }

    // ── Crear sala ─────────────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<RoomStateDTO> createRoom(@RequestBody CreateRoomRequest req) {
        Room room = roomService.createRoom(req.getUserId(), req.getPassword());
        return ResponseEntity.ok(roomService.toDTO(room, req.getUserId(),
                "Sala creada. Código: " + room.getRoomCode()));
    }

    // ── Unirse ─────────────────────────────────────────────────────────────────

    @PostMapping("/{code}/join")
    public ResponseEntity<RoomStateDTO> joinRoom(
            @PathVariable String code,
            @RequestBody JoinRoomRequest req) {

        Room room = roomService.joinRoom(code, req.getUserId(), req.getPassword());
        RoomStateDTO dto = roomService.toDTO(room, req.getUserId(),
                "Jugador " + req.getUserId() + " se ha unido");

        broadcast(code, dto);
        return ResponseEntity.ok(dto);
    }

    // ── Expulsar jugador ───────────────────────────────────────────────────────

    @PostMapping("/{code}/kick")
    public ResponseEntity<RoomStateDTO> kickPlayer(
            @PathVariable String code,
            @RequestBody KickPlayerRequest req) {

        Room room = roomService.kickPlayer(code, req.getLeaderId(), req.getTargetId());
        RoomStateDTO dto = roomService.toDTO(room, req.getLeaderId(),
                "Jugador " + req.getTargetId() + " ha sido expulsado");

        broadcast(code, dto);
        return ResponseEntity.ok(dto);
    }

     // ── Transferir liderazgo ──────────────────────────────────────────────────

    @PostMapping("/{code}/leader")
    public ResponseEntity<RoomStateDTO> transferLeader(
            @PathVariable String code,
            @RequestBody TransferLeaderRequest req) {

        Room room = roomService.transferLeader(code, req.getCurrentLeaderId(), req.getNewLeaderId());
        RoomStateDTO dto = roomService.toDTO(room, req.getCurrentLeaderId(),
                "Nuevo líder: " + req.getNewLeaderId());

        broadcast(code, dto);
        return ResponseEntity.ok(dto);
    }

    // ── Votar modo ────────────────────────────────────────────────────────────

    @PostMapping("/{code}/vote-mode")
    public ResponseEntity<RoomStateDTO> voteMode(
            @PathVariable String code,
            @RequestBody VoteModeRequest req) {

        Room.GameMode mode = Room.GameMode.valueOf(req.getMode().toUpperCase());
        Room room = roomService.voteMode(code, req.getUserId(), mode);
        RoomStateDTO dto = roomService.toDTO(room, req.getUserId(),
                "Voto de modo registrado");
        broadcast(code, dto);
        return ResponseEntity.ok(dto);
    }


    // ── Iniciar ronda ──────────────────────────────────────────────────────────

    @PostMapping("/{code}/start")
    public ResponseEntity<RoomStateDTO> startRound(
            @PathVariable String code,
            @RequestParam Long userId,
            @RequestParam(defaultValue = "HANGMAN") String mode) {

        Room.GameMode gameMode = Room.GameMode.valueOf(mode);
        Room room = roomService.startRound(code, userId, gameMode);

        // Emitir estado global + estado individual a cada jugador
        room.getPlayerIds().forEach(pid -> {
            RoomStateDTO dto = roomService.toDTO(room, pid, "¡La ronda ha comenzado!");
            messaging.convertAndSend("/topic/room/" + code.toUpperCase() + "/player/" + pid, dto);
        });

        // Estado global (sin sesión individual) para quien no esté suscrito por player
        RoomStateDTO globalDto = roomService.toDTO(room, userId, "¡La ronda ha comenzado!");
        broadcast(code, globalDto);

        return ResponseEntity.ok(globalDto);
    }

    // ── Nueva ronda ────────────────────────────────────────────────────────────

    @PostMapping("/{code}/next-round")
    public ResponseEntity<RoomStateDTO> nextRound(
            @PathVariable String code,
            @RequestParam Long leaderId) {

        Room room = roomService.newRound(code, leaderId);
        RoomStateDTO dto = roomService.toDTO(room, leaderId,
                "Nueva ronda. El líder escogerá el modo de juego.");
        broadcast(code, dto);
        return ResponseEntity.ok(dto);
    }

    // ── Votar acción tras ronda ───────────────────────────────────────────────

    @PostMapping("/{code}/vote-post-round")
    public ResponseEntity<RoomStateDTO> votePostRound(
            @PathVariable String code,
            @RequestBody VotePostRoundRequest req) {

        Room.PostRoundAction action = Room.PostRoundAction.valueOf(req.getAction().toUpperCase());
        Room room = roomService.votePostRoundAction(code, req.getUserId(), action);
        RoomStateDTO dto = roomService.toDTO(room, req.getUserId(),
                "Voto post-ronda registrado");
        broadcast(code, dto);
        return ResponseEntity.ok(dto);
    }

    // ── Terminar partida ───────────────────────────────────────────────────────

    @PostMapping("/{code}/finish")
    public ResponseEntity<RoomStateDTO> finishGame(
            @PathVariable String code,
            @RequestParam Long leaderId) {

        RoomStateDTO dto = roomService.finishGame(code, leaderId);
        broadcast(code, dto);
        return ResponseEntity.ok(dto);
    }

    // ── Estado actual (reconexión) ─────────────────────────────────────────────

    @GetMapping("/{code}")
    public ResponseEntity<RoomStateDTO> getRoom(
            @PathVariable String code,
            @RequestParam(required = false) Long userId) {

        Room room = roomService.getRoom(code);
        return ResponseEntity.ok(roomService.toDTO(room, userId, null));
    }

    // ── WebSocket: adivinar letra ──────────────────────────────────────────────

    @MessageMapping("/room/{code}/guess")
    public void handleGuess(
            @DestinationVariable String code,
            GuessLetterMessage msg) {

        RoomStateDTO dto = roomService.guessLetter(code, msg.getUserId(), msg.getLetra());

        // Enviar estado individual al jugador que adivinó
        messaging.convertAndSend(
            "/topic/room/" + code.toUpperCase() + "/player/" + msg.getUserId(), dto);

        // Emitir progreso global a todos (sin sesión individual expuesta)
        broadcast(code, dto);
    }

    // ── Helper broadcast ───────────────────────────────────────────────────────

    private void broadcast(String code, RoomStateDTO dto) {
        messaging.convertAndSend("/topic/room/" + code.toUpperCase(), dto);
    }
}
