package com.javawebrtc.signalingserver.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller("/")
public class ControllerClient {

    @GetMapping("/")
    public String getClientPage() {
        return "index.html";
    }
}
