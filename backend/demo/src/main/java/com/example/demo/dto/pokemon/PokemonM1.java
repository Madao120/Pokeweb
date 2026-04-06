package com.example.demo.dto.pokemon;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PokemonM1 {
    private String name;
    private String type1;
    private String type2;
    private String generation;
}