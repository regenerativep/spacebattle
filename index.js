var express = require("express");
var WebSocket = require("ws");

var highestId = 0;
class GameClient
{
    constructor(socket)
    {
        this.id = highestId++;
        this.socket = socket;
        this.socket.on("message", (...params) => { this.receive(...params); })
        this.x = startingPositions[0].x;
        this.y = startingPositions[0].y;
        startingPositions.splice(0, 1);
        this.angle = 0;
        this.vx = 0;
        this.vy = 0;
        this.vangle = 0;
        this.turnValue = 0;
        this.forwardValue = false;
        this.rocketAccel = 0.1;
        this.angleAccel = 0.1;
    }
    update()
    {
        if(this.forwardValue)
        {
            this.vx += Math.cos(this.angle) * this.rocketAccel;
            this.vy += Math.sin(this.angle) * this.rocketAccel;
        }
        this.vangle += this.turnValue * this.angleAccel;

        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.vangle;

        //warp effect
        while(this.x < 0) this.x += width;
        while(this.x >= width) this.x -= width;
        while(this.y < 0) this.y += height;
        while(this.y >= height) this.y -= height;

        //send information
        for(let i = 0; i < clientList.length; i++)
        {
            clientList[i].socket.send(JSON.stringify({
                type: "entityUpdate",
                id: this.id,
                x: this.x,
                y: this.y,
                vx: this.vx,
                vy: this.vy
            }));
        }
    }
    receive(data)
    {
        switch(data.type)
        {
            case "setTurn":
                this.turnValue = data.value;
                break;
            case "setRocket":
                this.forwardValue = data.value;
                break;
            case "shoot":
                this.shoot();
                break;
        }
    }
}

var webserver = null;
var gameserver = null;
var clientList = null;
var width = 640, height = 480;
var startingPositions = [
    { x: width / 2, y: 32 },
    { x: width / 2, y: height - 32}
];
function main()
{
    webserver = express();
    webserver.use(express.static("public"));
    let webserverPort = 8080;
    webserver.listen(webserverPort, () => { console.log("webserver listening on http://127.0.0.1:" + webserverPort); });

    let wsPort = 5524;
    gameserver = new WebSocket.Server({ port: wsPort }, () => {
        console.log("websocket server running on port " + wsPort);
        clientList = [];
    });
    gameserver.on("connection", (socket, req) => {
        let client = new GameClient(socket);
        clientList.push(client);
        socket.send(JSON.stringify({
            type: "setId",
            id: client.id
        }));
    });
    setInterval(() => {
        for(let i = 0; i < clientList.length; i++)
        {
            clientList[i].update();
        }
    }, 1000 / 60);
}
main();