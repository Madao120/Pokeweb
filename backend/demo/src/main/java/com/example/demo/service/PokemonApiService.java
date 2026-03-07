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

        return response.getName();
    }
}
