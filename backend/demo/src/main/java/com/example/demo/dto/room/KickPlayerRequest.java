package com.example.demo.dto.room;

import lombok.Data;

@Data
public class KickPlayerRequest {
    private Long leaderId;
    private Long targetId;   // jugador a expulsar
}