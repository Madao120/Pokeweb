package com.example.demo.dto.room;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class JoinRoomRequest {
    @NotNull(message = "USER_ID_REQUIRED")
    private Long userId;

    @Pattern(regexp = "^\\d{3,}$", message = "INVALID_ROOM_PASSWORD")
    private String password;
}
