package com.example.demo.dto.game;

import java.util.List;

import com.example.demo.model.DailyHangmanSession;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DailyHangmanRoundResponse {
    private DailyHangmanSession session;
    private boolean canPlayToday;
    private boolean completedToday;
    private Integer attemptsToday;
    private String todayPokemonName;
    private String yesterdayPokemonName;
    private long millisUntilNextReset;
    private List<DailyRankingEntry> ranking;
}
