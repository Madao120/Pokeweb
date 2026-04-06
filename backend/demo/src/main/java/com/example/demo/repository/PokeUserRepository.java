package com.example.demo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.example.demo.model.PokeUser;

public interface PokeUserRepository extends JpaRepository<PokeUser, Long> {
    Optional<PokeUser> findByEmail(String email);
    Optional<PokeUser> findByName(String name);

    // Top 10 jugadores ordenados por scoreM1 descendente
    @Query("SELECT u FROM PokeUser u ORDER BY u.scoreM1 DESC LIMIT 10")
    List<PokeUser> findTop10ByScoreM1();
}

