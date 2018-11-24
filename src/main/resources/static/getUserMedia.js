var myHostName = window.location.hostname;
var peerConnection = null;
var connection = null;
var localVideo = null;
var remoteVideo = null;
var hash = null;

var mediaConstraints = {
    audio: true,
    video: true
};

function checkUserMedia() {
    if (navigator.mediaDevices === undefined) {
        navigator.mediaDevices = {};
    }

    if (navigator.mediaDevices.getUserMedia === undefined) {
        navigator.mediaDevices.getUserMedia = function(constraints) {
            var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
            if (!getUserMedia) {
                return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
            }
            return new Promise(function(resolve, reject) {
                getUserMedia.call(navigator, constraints, resolve, reject);
            });
        }
    }
}

function getLocalUserMedia() {
    checkUserMedia();
    navigator.mediaDevices.getUserMedia(mediaConstraints)
    .then(function(stream) {
        localVideo = document.getElementById("localVideo");
        if ("srcObject" in localVideo) {
            localVideo.srcObject = stream;
        } else {
            localVideo.src = window.URL.createObjectURL(stream);
        }
        localVideo.onloadedmetadata = function(e) {
            localVideo.play();
        };
    })
    .catch(function(err) {
        console.log(err.name + ": " + err.message);
    });
};

var configuration = {
    "iceServers" : [ {
        "url" : "stun:stun.l.google.com:19302"
    } ]
};

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);

    peerConnection.onaddstream = function (ev) {
        remoteVideo = document.getElementById("remoteVideo")
        remoteVideo.srcObject = ev.stream;
        //remoteVideo.src = URL.createObjectURL(ev.stream);
    }

    peerConnection.onicecandidate = function (ev) {
        if (ev.candidate) {
            sendMessage(
                {
                    type: "new_candidate",
                    candidate: event.candidate
                }
            );
        }
    }
    //peerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
}

function sendMessage(data) {
    connection.send(JSON.stringify(data));
};

function connectSock() {
    var url =  "http://" + myHostName + ":8081/signaling";
    connection = new WebSocket("ws://localhost:8081/signaling");

    connection.onopen = function (ev) {
        document.getElementById('test').innerText = 'onopen ';
        console.log('on   ' + ev);
        /*sendMessage({
            type : "login"
        });*/
    };

    connection.onerror = function (ev) {
        document.getElementById('test').innerText = 'onerror ' + ev.data  + '  ' + ev.toString();
        console.log(ev);
    }

    connection.onmessage = function (ev) {
        var msg = JSON.parse(ev.data);
        console.log(msg);
        switch (msg.type) {
            case 'new_candidate':
                var candidate = new RTCIceCandidate(msg.candidate);
                peerConnection.addIceCandidate(candidate);
                break;
            case 'peer_answer':
                var desc = new RTCSessionDescription(msg.sdp);
                peerConnection.setRemoteDescription(desc);
                break;
            case 'peer_offer':
                handlePeerOffer(msg);
                break;
            case 'created':
                document.location.hash = msg.hash;
                hash = msg.hash;
                document.getElementById('outNumberRoom').innerText = 'Номер комнаты  ' + hash;
                document.getElementById('enterRoom').setAttribute('disabled', '');
                break;
            case 'full':
                alert("В комнате уже 2 собеседника");
                break;
            case 'ok':
                start();
                createOffer();
        }
    }
}

function createOffer() {
    console.log("create offer")
    peerConnection.createOffer().then(function (offer) {
        return peerConnection.setLocalDescription(offer);
    })
    .then(function () {
        sendMessage({
            type : 'peer_offer',
            sdp : peerConnection.localDescription,
            hash : hash
            }
        );
    })
    .catch(console.log("error offer"));
}

function handlePeerOffer(msg) {
    console.log("create answer")
    createPeerConnection();
    var desc = new RTCSessionDescription(msg.sdp);
    peerConnection.setRemoteDescription(desc);
    peerConnection.createAnswer(function (description) {
        peerConnection.setLocalDescription(description);
        sendMessage({
            type : 'peer_answer',
            sdp : peerConnection.localDescription,
            hash : hash
        });
    });
}

function createRoom() {
    sendMessage({
        type : "create"
    });
}

function enterRoom() {
    var numberRoom = document.getElementById('numberRoom');
    sendMessage({
        type : 'enter',
        hash : numberRoom.value
    });
}

function start() {
    if (!peerConnection) {
        createPeerConnection();
    }
}

function closeVideoCall() {
    peerConnection.onaddstream = null;
    peerConnection.onicecandidate = null;
    peerConnection.onnegotiationneeded = null;

    remoteVideo.src = null;
    localVideo.src = null;

    peerConnection.close();
    peerConnection = null;
}

function hangUpCall() {
    sendMessage({
        type : "stop"
    });
    closeVideoCall();
}

window.onload = function (ev) {
    getLocalUserMedia();
    connectSock();
}