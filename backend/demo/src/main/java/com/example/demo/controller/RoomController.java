package com.example.demo.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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

import jakarta.validation.Valid;

@RestController
@RequestMapping("/rooms")
public class RoomController {

    private final RoomService roomService;
    private final SimpMessagingTemplate messaging;

    public RoomController(RoomService roomService, SimpMessagingTemplate messaging) {
        this.roomService = roomService;
        this.messaging = messaging;
    }

    @PostMapping
    public ResponseEntity<RoomStateDTO> createRoom(@Valid @RequestBody CreateRoomRequest req) {
        Room room = roomService.createRoom(req.getUserId(), req.getPassword());
        RoomStateDTO dto = roomService.toDTO(
            room,
            req.getUserId(),
            "Sala creada. Codigo: " + room.getRoomCode()
        );
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{code}/join")
    public ResponseEntity<RoomStateDTO> joinRoom(
            @PathVariable String code,
            @Valid @RequestBody JoinRoomRequest req) {

        Room room = roomService.joinRoom(code, req.getUserId(), req.getPassword());
        RoomStateDTO dto = roomService.toDTO(room, req.getUserId(), "Jugador unido a la sala");
        broadcastRoomState(code, room, "Jugador unido a la sala");
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{code}/kick")
    public ResponseEntity<RoomStateDTO> kickPlayer(
            @PathVariable String code,
            @RequestBody KickPlayerRequest req) {

        Room room = roomService.kickPlayer(code, req.getLeaderId(), req.getTargetId());
        RoomStateDTO dto = roomService.toDTO(room, req.getLeaderId(), "Jugador expulsado");
        broadcastRoomState(code, room, "Jugador expulsado");
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{code}/leader")
    public ResponseEntity<RoomStateDTO> transferLeader(
            @PathVariable String code,
            @RequestBody TransferLeaderRequest req) {

        Room room = roomService.transferLeader(code, req.getCurrentLeaderId(), req.getNewLeaderId());
        RoomStateDTO dto = roomService.toDTO(room, req.getCurrentLeaderId(), "Nuevo lider asignado");
        broadcastRoomState(code, room, "Nuevo lider asignado");
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{code}/vote-mode")
    public ResponseEntity<RoomStateDTO> voteMode(
            @PathVariable String code,
            @RequestBody VoteModeRequest req) {

        Room.GameMode mode = Room.GameMode.valueOf(req.getMode().toUpperCase());
        Room room = roomService.voteMode(code, req.getUserId(), mode);
        RoomStateDTO dto = roomService.toDTO(room, req.getUserId(), "Voto de modo registrado");
        broadcastRoomState(code, room, "Voto de modo registrado");
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{code}/start")
    public ResponseEntity<RoomStateDTO> startRound(
            @PathVariable String code,
            @RequestParam Long userId,
            @RequestParam(defaultValue = "HANGMAN") String mode) {

        Room.GameMode gameMode = Room.GameMode.valueOf(mode.toUpperCase());
        Room room = roomService.startRound(code, userId, gameMode);
        RoomStateDTO dto = roomService.toDTO(room, userId, "La ronda ha comenzado");
        broadcastRoomState(code, room, "La ronda ha comenzado");
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{code}/guess-letter")
    public ResponseEntity<RoomStateDTO> guessLetter(
            @PathVariable String code,
            @RequestParam Long userId,
            @RequestParam String letra) {

        RoomStateDTO dto = roomService.guessLetter(code, userId, letra);
        Room room = roomService.getRoom(code);
        broadcastRoomState(code, room, dto.getMessage());
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{code}/guess-word")
    public ResponseEntity<RoomStateDTO> guessWord(
            @PathVariable String code,
            @RequestParam Long userId,
            @RequestParam String palabra) {

        RoomStateDTO dto = roomService.guessWord(code, userId, palabra);
        Room room = roomService.getRoom(code);
        broadcastRoomState(code, room, dto.getMessage());
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{code}/guess-sound")
    public ResponseEntity<RoomStateDTO> guessSound(
            @PathVariable String code,
            @RequestParam Long userId,
            @RequestParam Long pokemonId) {

        RoomStateDTO dto = roomService.guessSound(code, userId, pokemonId);
        Room room = roomService.getRoom(code);
        broadcastRoomState(code, room, dto.getMessage());
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{code}/guess-sprite")
    public ResponseEntity<RoomStateDTO> guessSprite(
            @PathVariable String code,
            @RequestParam Long userId,
            @RequestParam Long pokemonId) {

        RoomStateDTO dto = roomService.guessSprite(code, userId, pokemonId);
        Room room = roomService.getRoom(code);
        broadcastRoomState(code, room, dto.getMessage());
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{code}/next-round")
    public ResponseEntity<RoomStateDTO> nextRound(
            @PathVariable String code,
            @RequestParam Long leaderId) {

        Room room = roomService.newRound(code, leaderId);
        RoomStateDTO dto = roomService.toDTO(
            room,
            leaderId,
            "Nueva ronda. El lider escogera el modo de juego."
        );
        broadcastRoomState(code, room, "Nueva ronda. El lider escogera el modo de juego.");
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{code}/repeat")
    public ResponseEntity<RoomStateDTO> repeatRound(
            @PathVariable String code,
            @RequestParam Long leaderId) {

        Room room = roomService.repeatCurrentMode(code, leaderId);
        RoomStateDTO dto = roomService.toDTO(room, leaderId, "Se repite el mismo modo");
        broadcastRoomState(code, room, "Se repite el mismo modo");
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{code}/change-mode")
    public ResponseEntity<RoomStateDTO> changeMode(
            @PathVariable String code,
            @RequestParam Long leaderId) {

        Room room = roomService.changeMode(code, leaderId);
        RoomStateDTO dto = roomService.toDTO(room, leaderId, "Vuelta a la sala");
        broadcastRoomState(code, room, "Vuelta a la sala");
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{code}/vote-post-round")
    public ResponseEntity<RoomStateDTO> votePostRound(
            @PathVariable String code,
            @RequestBody VotePostRoundRequest req) {

        Room.PostRoundAction action = Room.PostRoundAction.valueOf(req.getAction().toUpperCase());
        Room room = roomService.votePostRoundAction(code, req.getUserId(), action);
        RoomStateDTO dto = roomService.toDTO(room, req.getUserId(), "Voto post-ronda registrado");
        broadcastRoomState(code, room, "Voto post-ronda registrado");
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{code}/finish")
    public ResponseEntity<RoomStateDTO> finishGame(
            @PathVariable String code,
            @RequestParam Long leaderId) {

        RoomStateDTO dto = roomService.finishGame(code, leaderId);
        Room room = roomService.getRoom(code);
        broadcastRoomState(code, room, dto.getMessage());
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/{code}")
    public ResponseEntity<RoomStateDTO> getRoom(
            @PathVariable String code,
            @RequestParam(required = false) Long userId) {

        Room room = roomService.getRoom(code);
        String previousState = room.getState().name();
        RoomStateDTO dto = roomService.getRoomState(code, userId);
        if (!previousState.equals(room.getState().name())) {
            broadcastRoomState(code, room, dto.getMessage());
        }
        return ResponseEntity.ok(dto);
    }

    @MessageMapping("/room/{code}/guess")
    public void handleGuess(
            @DestinationVariable String code,
            GuessLetterMessage msg) {

        roomService.guessLetter(code, msg.getUserId(), msg.getLetra());
        Room room = roomService.getRoom(code);
        broadcastRoomState(code, room, null);
    }

    private void broadcastRoomState(String code, Room room, String message) {
        String normalizedCode = code.toUpperCase();
        RoomStateDTO globalDto = roomService.toDTO(room, null, message);
        messaging.convertAndSend("/topic/room/" + normalizedCode, globalDto);

        room.getPlayerIds().forEach(pid -> {
            RoomStateDTO playerDto = roomService.toDTO(room, pid, message);
            messaging.convertAndSend("/topic/room/" + normalizedCode + "/player/" + pid, playerDto);
        });
    }
}
