package com.example.demo.dto;

import lombok.Data;

@Data
public class CreateRoomRequest {
    private Long userId;
    private String password;  // opcional, null = sala abierta
}
