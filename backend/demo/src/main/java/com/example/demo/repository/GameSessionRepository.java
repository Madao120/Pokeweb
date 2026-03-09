package com.example.demo.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.model.GameSession;

public interface GameSessionRepository
        extends JpaRepository<GameSession, Long> {
}
