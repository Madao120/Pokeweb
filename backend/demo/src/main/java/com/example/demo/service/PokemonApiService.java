package com.example.demo.service;

import java.util.Random;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.example.demo.dto.PokemonResponse;

@Service
public class PokemonApiService {

    // Variable para conectarnos a una API externa (PokeAPI)
    private final RestTemplate restTemplate = new RestTemplate();

    // Para un pokemon aleatorio
    private final Random random = new Random();

    public String getRandomPokemon() {

        int id = random.nextInt(1025) + 1;

        String url = "https://pokeapi.co/api/v2/pokemon/" + id;

        PokemonResponse response =
                restTemplate.getForObject(url, PokemonResponse.class);

        String type1 = response.getTypes().get(0).getType().getName();

        String type2 = null;
        if (response.getTypes().size() > 1) {
            type2 = response.getTypes().get(1).getType().getName();
        }

        String generation = getGenerationFromId(id);

        return new PokemonData(
                response.getName(),
                type1,
                type2,
                generation
        );
    }

    private String getGenerationFromId(int id) {

        if (id <= 151) return "Kanto (Generation I)";
        if (id <= 251) return "Johto (Generation II)";
        if (id <= 386) return "Hoenn (Generation III)";
        if (id <= 493) return "Sinnoh (Generation IV)";
        if (id <= 649) return "Unova (Generation V)";
        if (id <= 721) return "Kalos (Generation VI)";
        if (id <= 809) return "Alola (Generation VII)";
        if (id <= 905) return "Galar (Generation VIII)";
        if (id <= 1025) return "Paldea (Generation IX)";

        return "Generation X"; // futura generación
    }
}
