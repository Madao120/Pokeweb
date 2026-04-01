package com.example.demo.dto;

import lombok.Data;

@Data
public class VoteModeRequest {
    private Long userId;
    private String mode; // HANGMAN | futuros
}
