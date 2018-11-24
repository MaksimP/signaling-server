package com.javawebrtc.signalingserver.configuration;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import javax.json.Json;
import javax.json.JsonObject;
import javax.json.JsonObjectBuilder;
import java.io.IOException;
import java.io.StringReader;
import java.util.*;

@Component
public class SignalingSocketHandler extends TextWebSocketHandler {

    private static Map<String, Set<WebSocketSession>> rooms = new HashMap<>();

    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {

        String socketMessage = message.getPayload();
        JsonObject object = Json.createReader(new StringReader(socketMessage)).readObject();
        String type = object.getString("type");
        Set<WebSocketSession> webSocketSession;
        System.out.println("new    "  + message);

        switch (type) {
            case "login":
                System.out.println("login");
                break;
            case "create":
                webSocketSession = new HashSet<>();
                webSocketSession.add(session);

                String uuid = UUID.randomUUID().toString();
                rooms.put(uuid, webSocketSession);

                JsonObjectBuilder builder = Json.createObjectBuilder();
                builder.add("type", "created");
                builder.add("hash", uuid);
                JsonObject objectResponse = builder.build();

                session.sendMessage(new TextMessage(objectResponse.toString()));
                break;
            case "enter":
                String hash = object.getString("hash");
                if (rooms.get(hash).size() >= 2) {
                    sendMessage(session, "full");
                } else {
                    rooms.get(hash).add(session);
                    rooms.get(hash).parallelStream()
                            .filter(s -> s != session)
                            .forEach(s -> {
                                try {
                                    sendMessage(s, "ok");
                                } catch (IOException e) {
                                    e.printStackTrace();
                                }
                            });
                }
            case "peer_offer":
            case "peer_answer":
            case "new_candidate":
                rooms.get(object.getString("hash")).parallelStream()
                .filter(s -> s != session)
                .forEach(s -> {
                    try {
                        s.sendMessage(message);
                    } catch (IOException e) {
                        e.printStackTrace();
                    }
                });
        }
    }

    private void sendMessage(WebSocketSession session, String type) throws IOException {
        session.sendMessage(new TextMessage(Json.createObjectBuilder().add("type",
                type).build().toString()));
    }
}
