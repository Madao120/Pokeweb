package com.example.demo.dto.pokemon;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PokemonOptionM2 {
    private Long id;
    private String name;
    private String type1;
    private String type2;
    private String spriteUrl;
    private String cryUrl;
}
