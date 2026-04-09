package com.example.demo.dto.game;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DailyRankingEntry {
    private Long id;
    private String name;
    private String profilePictureUrl;
    private int attempts;
    private int rank;
}
