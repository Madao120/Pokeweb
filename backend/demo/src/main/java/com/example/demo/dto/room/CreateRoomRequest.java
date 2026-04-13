package com.example.demo.dto.room;

import lombok.Data;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

@Data
public class CreateRoomRequest {
    @NotNull(message = "USER_ID_REQUIRED")
    private Long userId;

    @Pattern(regexp = "^\\d{3,}$", message = "INVALID_ROOM_PASSWORD")
    private String password;
}
