package com.example.demo.service;

import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.example.demo.dto.pokemon.PokemonM1;
import com.example.demo.dto.pokemon.PokemonM2;
import com.example.demo.dto.pokemon.PokemonOptionM2;


@Service
public class PokemonApiService {

    // Variable para conectarnos a una API externa (PokeAPI)
    private final RestTemplate restTemplate = new RestTemplate();

    // Para un pokemon aleatorio
    private final Random random = new Random();
    private static final int MAX_POKEMON_ID = 1025;

    public PokemonM1 getRandomPokemon() {

        int id = random.nextInt(MAX_POKEMON_ID) + 1;

        String url = "https://pokeapi.co/api/v2/pokemon/" + id;

        Map response = restTemplate.getForObject(url, Map.class);

        Map species = (Map) response.get("species");
        String name = species != null
            ? (String) species.get("name")
            : (String) response.get("name");

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
        if (id <= MAX_POKEMON_ID) return "Generation IX";

        return "Generation X";
    }

    public List<PokemonM2> buildGuessSoundRounds(int totalRounds) {
        List<PokemonM2> rounds = new ArrayList<>();
        Set<Long> usedCorrectPokemonIds = new HashSet<>();

        int attempts = 0;
        int maxAttempts = totalRounds * 60;
        while (rounds.size() < totalRounds && attempts < maxAttempts) {
            attempts++;
            PokemonOptionM2 correct = getRandomPokemonOptionM2();

            if (correct.getId() == null || usedCorrectPokemonIds.contains(correct.getId())) {
                continue;
            }
            if (correct.getCryUrl() == null || correct.getCryUrl().isBlank()) {
                continue;
            }

            List<PokemonOptionM2> wrongOptions = new ArrayList<>();
            Set<Long> usedInRound = new HashSet<>();
            usedInRound.add(correct.getId());

            int wrongAttempts = 0;
            while (wrongOptions.size() < 4 && wrongAttempts < 160) {
                wrongAttempts++;
                PokemonOptionM2 candidate = getRandomPokemonOptionM2();
                if (candidate.getId() == null || usedInRound.contains(candidate.getId())) {
                    continue;
                }
                usedInRound.add(candidate.getId());
                wrongOptions.add(candidate);
            }

            if (wrongOptions.size() < 4) {
                continue;
            }

            List<PokemonOptionM2> options = new ArrayList<>();
            options.add(correct);
            options.addAll(wrongOptions);
            Collections.shuffle(options, random);

            PokemonM2 round = new PokemonM2();
            round.setRonda(rounds.size() + 1);
            round.setSonido(correct.getCryUrl());
            round.setPokemonDelSonido(correct);
            round.setPokemonIncorrecto1(wrongOptions.get(0));
            round.setPokemonIncorrecto2(wrongOptions.get(1));
            round.setPokemonIncorrecto3(wrongOptions.get(2));
            round.setPokemonIncorrecto4(wrongOptions.get(3));
            round.setOpciones(options);
            round.setPokemonCorrectoId(correct.getId());
            rounds.add(round);
            usedCorrectPokemonIds.add(correct.getId());
        }

        if (rounds.size() < totalRounds) {
            throw new RuntimeException("No se pudieron generar rondas suficientes para GuessSound");
        }

        return rounds;
    }

    private PokemonOptionM2 getRandomPokemonOptionM2() {
        int id = random.nextInt(MAX_POKEMON_ID) + 1;
        String url = "https://pokeapi.co/api/v2/pokemon/" + id;

        Map response = restTemplate.getForObject(url, Map.class);
        if (response == null) {
            throw new RuntimeException("Respuesta vacia de PokeAPI");
        }

        Object idObj = response.get("id");
        Long pokemonId = idObj instanceof Number number ? number.longValue() : (long) id;
        String name = (String) response.get("name");

        String type1 = null;
        String type2 = null;
        List<Map> types = (List<Map>) response.get("types");
        if (types != null && !types.isEmpty()) {
            types.sort((a, b) -> {
                Number slotA = (Number) a.get("slot");
                Number slotB = (Number) b.get("slot");
                return Integer.compare(slotA == null ? 0 : slotA.intValue(), slotB == null ? 0 : slotB.intValue());
            });

            Map type1Map = (Map) types.get(0).get("type");
            type1 = type1Map == null ? null : (String) type1Map.get("name");

            if (types.size() > 1) {
                Map type2Map = (Map) types.get(1).get("type");
                type2 = type2Map == null ? null : (String) type2Map.get("name");
            }
        }

        Map sprites = (Map) response.get("sprites");
        String spriteUrl = null;
        if (sprites != null) {
            Map other = (Map) sprites.get("other");
            if (other != null) {
                Map officialArtwork = (Map) other.get("official-artwork");
                if (officialArtwork != null) {
                    spriteUrl = (String) officialArtwork.get("front_default");
                }
            }

            if (spriteUrl == null || spriteUrl.isBlank()) {
                spriteUrl = (String) sprites.get("front_default");
            }
        }

        String cryUrl = null;
        Map cries = (Map) response.get("cries");
        if (cries != null) {
            String latestCry = (String) cries.get("latest");
            String legacyCry = (String) cries.get("legacy");
            cryUrl = latestCry != null && !latestCry.isBlank() ? latestCry : legacyCry;
        }

        return new PokemonOptionM2(pokemonId, name, type1, type2, spriteUrl, cryUrl);
    }
}
