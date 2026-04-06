package com.example.demo.dto.room;

import lombok.Data;

@Data
public class JoinRoomRequest {
    private Long userId;
    private String password;  // null si la sala no tiene contraseña
}