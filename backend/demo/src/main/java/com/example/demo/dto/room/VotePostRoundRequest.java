package com.example.demo.dto.room;

import lombok.Data;

@Data
public class VotePostRoundRequest {
    private Long userId;
    private String action; // REPEAT_MODE | CHANGE_MODE | FINISH_MATCH
}