package com.example.demo.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.model.PokeUser;

public interface UserRepository extends JpaRepository<PokeUser, Long> {
    Optional<PokeUser> findByEmail(String email);
}

