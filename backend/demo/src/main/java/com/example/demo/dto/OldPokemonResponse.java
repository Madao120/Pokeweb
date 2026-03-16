package com.example.demo.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class OldPokemonResponse {

    private int id;
    private String name;
    private int height;
    private int weight;

    private List<TypeSlot> types;
    private List<StatSlot> stats;

    private Sprites sprites;
}
