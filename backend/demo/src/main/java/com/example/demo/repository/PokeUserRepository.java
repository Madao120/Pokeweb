package com.example.demo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;

import com.example.demo.model.PokeUser;

public interface PokeUserRepository extends JpaRepository<PokeUser, Long> {
    Optional<PokeUser> findByEmail(String email);
    Optional<PokeUser> findByName(String name);
    Optional<PokeUser> findByEmailIgnoreCase(String email);
    Optional<PokeUser> findByNameIgnoreCase(String name);

    @Query("SELECT u FROM PokeUser u ORDER BY u.scoreM1 DESC, u.id ASC")
    List<PokeUser> findRankingByScoreM1(Pageable pageable);

    @Query("SELECT u FROM PokeUser u ORDER BY u.scoreM2 DESC, u.id ASC")
    List<PokeUser> findRankingByScoreM2(Pageable pageable);

    @Query("SELECT u FROM PokeUser u ORDER BY u.globalScore DESC, u.id ASC")
    List<PokeUser> findRankingByGlobalScore(Pageable pageable);

    long countByScoreM1GreaterThan(int scoreM1);
    long countByScoreM2GreaterThan(int scoreM2);

    long countByGlobalScoreGreaterThan(int globalScore);
}

