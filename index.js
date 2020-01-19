var express = require("express");
var WebSocket = require("ws");

var highestId = 0;
class GameClient
{
    constructor(socket)
    {
        this.id = highestId++;
        this.socket = socket;
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
        this.angleAccel = 0.001;
        this.angleFriction = 0.0001;
        this.radius = 16;
    }
    update()
    {
        if(this.forwardValue)
        {
            this.vx += Math.cos(this.angle) * this.rocketAccel;
            this.vy += Math.sin(this.angle) * this.rocketAccel;
        }
        this.vangle += this.turnValue * this.angleAccel;
        if(this.vangle > this.angleFriction) this.vangle -= this.angleFriction;
        else if(this.vangle < -this.angleFriction) this.vangle += this.angleFriction;
        else this.vangle = 0;
        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.vangle;

        //warp effect
        while(this.x < 0) this.x += width;
        while(this.x >= width) this.x -= width;
        while(this.y < 0) this.y += height;
        while(this.y >= height) this.y -= height;
        //send information
        broadcast(JSON.stringify({
            type: "shipUpdate",
            id: this.id,
            x: this.x,
            y: this.y,
            angle: this.angle,
            vx: this.vx,
            vy: this.vy,
            vangle: this.vangle
        }));
    }
    
    shoot()
    {
        let proj = new Projectile(this.x, this.y, this.vx + Math.cos(this.angle) * projectileSpeed, this.vy + Math.sin(this.angle) * projectileSpeed, this);
        projectileList.push(proj);
    }
}
function broadcast(data)
{
    for(let i = 0; i < clientList.length; i++)
    {
        clientList[i].socket.send(data);
    }
}
function receive(who, data)
{
    let dataObj = JSON.parse(data);
    console.log(dataObj);
    switch(dataObj.type)
    {
        case "setTurn":
            who.turnValue = dataObj.value;
            break;
        case "setForward":
            who.forwardValue = dataObj.value;
            break;
        case "shoot":
            who.shoot();
            break;
    }
}
class Projectile
{
    constructor(x, y, vx, vy, owner)
    {
        this.id = highestId++;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.owner = owner;
        this.graceTicks = 30;
        this.updateTicksReset = 60;
        this.updateTicks = this.updateTicksReset;
        broadcast(JSON.stringify({
            type: "projectileCreate",
            id: this.id,
            x: this.x,
            y: this.y,
            vx: this.vx,
            vy: this.vy
        }));
    }
    update()
    {
        this.x += this.vx;
        this.y += this.vy;
        while(this.x < 0) this.x += width;
        while(this.x >= width) this.x -= width;
        while(this.y < 0) this.y += height;
        while(this.y >= height) this.y -= height;
        //collide
        if(this.graceTicks > 0)
        {
            this.graceTicks--;
        }
        for(let i = 0; i < clientList.length; i++)
        {
            let client = clientList[i];
            if(client != this.owner || this.graceTicks <= 0)
            {
                let dist = (client.x - this.x) ** 2 + (client.y - this.y) ** 2;
                if(dist < client.radius ** 2)
                {
                    //hit
                    console.log("someone was shot");
                }
            }
        }
        if(this.updateTicks > 0)
        {
            this.updateTicks--;
        }
        else
        {
            this.updateTicks = this.updateTicksReset;
            broadcast(JSON.stringify({
                type: "projectileUpdate",
                id: this.id,
                x: this.x,
                y: this.y
            }));
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
var projectileList = [];
var projectileSpeed = 4;
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
        console.log("client connected " + client.id);
        socket.on("message", (data) => { receive(client, data); } );
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
        for(let i = 0; i < projectileList.length; i++)
        {
            projectileList[i].update();
        }
    }, 1000 / 60);
}
main();