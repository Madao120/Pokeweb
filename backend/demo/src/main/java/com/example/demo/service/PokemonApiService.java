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
import com.example.demo.dto.pokemon.PokemonOptionM3;


@Service
public class PokemonApiService {

    // Variable para conectarnos a una API externa (PokeAPI)
    private final RestTemplate restTemplate = new RestTemplate();

    // Para un pokemon aleatorio
    private final Random random = new Random();
    private static final int MAX_POKEMON_ID = 1025;
    private volatile List<PokemonOptionM3> cachedPokemonCatalogM3;

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

    public List<PokemonOptionM3> getPokemonCatalogM3() {
        List<PokemonOptionM3> snapshot = cachedPokemonCatalogM3;
        if (snapshot != null && !snapshot.isEmpty()) {
            return snapshot;
        }

        synchronized (this) {
            if (cachedPokemonCatalogM3 != null && !cachedPokemonCatalogM3.isEmpty()) {
                return cachedPokemonCatalogM3;
            }

            String url = "https://pokeapi.co/api/v2/pokemon?limit=" + MAX_POKEMON_ID;
            Map response = restTemplate.getForObject(url, Map.class);
            if (response == null) {
                throw new RuntimeException("No se pudo obtener el catalogo de Pokemon para M3");
            }

            List<Map> results = (List<Map>) response.get("results");
            if (results == null) {
                throw new RuntimeException("Catalogo de Pokemon vacio para M3");
            }

            List<PokemonOptionM3> catalog = new ArrayList<>();
            for (Map result : results) {
                String name = (String) result.get("name");
                String detailUrl = (String) result.get("url");
                Long id = extractPokemonIdFromUrl(detailUrl);
                if (id == null || name == null || name.isBlank()) {
                    continue;
                }
                catalog.add(new PokemonOptionM3(id, name, buildOfficialArtworkUrl(id)));
            }

            catalog.sort((a, b) -> a.getName().compareToIgnoreCase(b.getName()));
            cachedPokemonCatalogM3 = Collections.unmodifiableList(catalog);
            return cachedPokemonCatalogM3;
        }
    }

    public PokemonOptionM3 getRandomPokemonOptionM3() {
        List<PokemonOptionM3> catalog = getPokemonCatalogM3();
        if (catalog.isEmpty()) {
            throw new RuntimeException("No hay Pokemon disponibles para M3");
        }
        PokemonOptionM3 option = catalog.get(random.nextInt(catalog.size()));
        return new PokemonOptionM3(option.getId(), option.getName(), option.getSpriteUrl());
    }

    private Long extractPokemonIdFromUrl(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        String normalized = url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
        int idx = normalized.lastIndexOf('/');
        if (idx < 0 || idx + 1 >= normalized.length()) {
            return null;
        }
        try {
            return Long.parseLong(normalized.substring(idx + 1));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String buildOfficialArtworkUrl(Long pokemonId) {
        return "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/"
            + pokemonId
            + ".png";
    }
}
