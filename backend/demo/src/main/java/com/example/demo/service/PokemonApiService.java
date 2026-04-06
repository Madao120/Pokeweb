package com.example.demo.service;

import java.util.List;
import java.util.Map;
import java.util.Random;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.example.demo.dto.pokemon.PokemonM1;


@Service
public class PokemonApiService {

    // Variable para conectarnos a una API externa (PokeAPI)
    private final RestTemplate restTemplate = new RestTemplate();

    // Para un pokemon aleatorio
    private final Random random = new Random();

    public PokemonM1 getRandomPokemon() {

        int id = random.nextInt(1025) + 1;

        String url = "https://pokeapi.co/api/v2/pokemon/" + id;

        Map response = restTemplate.getForObject(url, Map.class);

        String name = (String) response.get("name");

        List<Map> types = (List<Map>) response.get("types");

        Map type1Map = (Map) types.get(0).get("type");
        String type1 = (String) type1Map.get("name");

        String type2 = null;

        if (types.size() > 1) {
            Map type2Map = (Map) types.get(1).get("type");
            type2 = (String) type2Map.get("name");
        }

        String generation = getGenerationFromId(id);

        return new PokemonM1(name, type1, type2, generation);
    }

    private String getGenerationFromId(int id) {

        if (id <= 151) return "Generation I";
        if (id <= 251) return "Generation II";
        if (id <= 386) return "Generation III";
        if (id <= 493) return "Generation IV";
        if (id <= 649) return "Generation V";
        if (id <= 721) return "Generation VI";
        if (id <= 809) return "Generation VII";
        if (id <= 905) return "Generation VIII";
        if (id <= 1025) return "Generation IX";

        return "Generation X";
    }
}
