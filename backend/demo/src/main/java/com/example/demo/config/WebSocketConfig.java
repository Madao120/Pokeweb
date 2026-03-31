package com.example.demo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

/**
 * Configura STOMP sobre WebSocket.
 *
 * El frontend se conecta a:  ws://localhost:8080/ws
 * Envía mensajes a:          /app/room/{code}/guess
 * Se suscribe a:             /topic/room/{code}
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")   // en producción restringir al dominio real
                .withSockJS();                   // fallback para navegadores sin WS nativo
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Prefijo para mensajes que van al servidor (handler @MessageMapping)
        registry.setApplicationDestinationPrefixes("/app");

        // Prefijo para mensajes que el servidor emite a los clientes
        registry.enableSimpleBroker("/topic");
    }
}