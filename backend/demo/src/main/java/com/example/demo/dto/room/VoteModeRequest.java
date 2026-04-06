package com.example.demo.dto.room;

import lombok.Data;

@Data
public class VoteModeRequest {
    private Long userId;
    private String mode; // HANGMAN | futuros
}