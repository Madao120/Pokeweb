package com.example.demo.dto.user;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PokeUserResponse {

    //Automático
    private Long id;

    private String email;
    private String name;
    private String profilePictureUrl;
    private String password;
    
    private int globalScore;
    private int scoreM1;
}