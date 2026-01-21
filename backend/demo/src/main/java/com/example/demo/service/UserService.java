package com.example.demo.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import com.example.demo.dto.UserRequest;
import com.example.demo.model.PokeUser;
import com.example.demo.repository.UserRepository;

@Service
public class UserService{
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public PokeUser createUser(UserRequest request) {

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
        throw new RuntimeException("EMAIL_ALREADY_EXISTS");
        }

        PokeUser user = new PokeUser();
        user.setEmail(request.getEmail());
        user.setName(request.getName());
        user.setPassword(request.getPassword());
        user.setProfilePictureUrl(request.getProfilePictureUrl());
        user.setScore(0);

        return userRepository.save(user);
    }

    public Optional<PokeUser> getUser(Long id) {
        return userRepository.findById(id);
    }

    public PokeUser updateScore(Long id, int newScore) {
        PokeUser user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));

        user.setScore(newScore);
        return userRepository.save(user);
    }
}
