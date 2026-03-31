package com.example.demo.dto;
import lombok.Data;

@Data
public class KickPlayerRequest {
    private Long leaderId;
    private Long targetId;   // jugador a expulsar
}
