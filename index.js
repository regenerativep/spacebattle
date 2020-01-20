var express = require("express");
var WebSocket = require("ws");

var highestId = 0;
var startingPositions = null;
function resetPositions()
{
    projectileList = [];
    startingPositions = [
        { x: width / 2, y: 32 },
        { x: width / 2, y: height - 32}
    ];
    for(let i = 0; i < clientList.length; i++)
    {
        clientList[i].resetPosition();
    }
    //generate some asteroids
    function makeAsteroid(x, y)
    {
        projectileList.push(new Projectile("asteroid", x, y, Math.random() * 4, Math.random() * 4, null));
    }
    for(let i = 0; i < 4; i++)
    {

    }
    timeToPlay = timeToPlayReset;
}
class GameClient
{
    constructor(socket)
    {
        this.id = highestId++;
        this.socket = socket;
        this.resetPosition();
        this.forwardValue = false;
        this.rocketAccel = 0.02;
        this.angleAccelSeconds = 0.03;
        this.angleFriction = 0.0001;
        this.radius = 16;
        this.score = 0;
        this.shootCooldown = 0;
        this.shootCooldownReset = 60;
    }
    resetPosition()
    {
        this.x = startingPositions[0].x;
        this.y = startingPositions[0].y;
        startingPositions.splice(0, 1);
        this.vx = 0;
        this.vy = 0;
        this.vangle = 0;
        this.turnValue = 0;
        this.angle = 0;
    }
    update()
    {
        if(this.forwardValue)
        {
            this.vx += Math.cos(this.angle) * this.rocketAccel;
            this.vy += Math.sin(this.angle) * this.rocketAccel;
        }
        this.vangle = this.turnValue * this.angleAccelSeconds;
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
        if(this.shootCooldown > 0)
        {
            this.shootCooldown--;
        }
    }
    changeScore(newScore)
    {
        this.score = newScore;
        broadcast(JSON.stringify({
            type: "scoreUpdate",
            id: this.id,
            value: this.score
        }));
    }
    shoot()
    {
        if(this.shootCooldown <= 0)
        {
            let proj = new Projectile("bullet", this.x, this.y, this.vx + Math.cos(this.angle) * projectileSpeed, this.vy + Math.sin(this.angle) * projectileSpeed, this);
            projectileList.push(proj);
            this.shootCooldown = this.shootCooldownReset;
        }
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
        default:
            console.log(dataObj);
            break;
    }
}
class Projectile
{
    constructor(type, x, y, vx, vy, owner)
    {
        this.id = highestId++;
        this.type = type;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.ttl = 60;
        this.timeLived = 0;
        this.owner = owner;
        this.graceTicks = 30;
        this.updateTicksReset = 60;
        this.updateTicks = this.updateTicksReset;
        if(this.type == "bullet")
        {
            this.radius = 2;
        }
        else if(this.type == "asteroid")
        {
            this.radius = 32;
        }
        broadcast(JSON.stringify({
            type: "projectileCreate",
            projectileType: this.type,
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
                if(dist < (client.radius + this.radius) ** 2)
                {
                    //hit a player
                    if(client == this.owner)
                    {
                        let otherClient = clientList[1 - clientList.indexOf(this.owner)];
                        otherClient.changeScore(otherClient.score + 1);
                    }
                    else
                    {
                        let otherClient = clientList[1 - clientList.indexOf(client)];
                        otherClient.changeScore(otherClient.score + 1);
                    }
                    resetPositions();
                }
            }
        }
        for(let i = 0; i < projectileList.length; i++)
        {
            let proj = projectileList[i];
            if(proj != this)
            {
                let dist = (proj.x - this.x) ** 2 + (proj.y - this.y) ** 2;
                if(dist < (proj.radius + this.radus) ** 2)
                {
                    //hit a projectile
                    proj.destroy();
                    this.destroy();
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
        this.timeLived++;
        if(this.timeLived >= this.ttl)
        {
            this.destroy();
        }
    }
    destroy()
    {
        let ind = projectileList.indexOf(this);
        if(ind >= 0)
        {
            broadcast(JSON.stringify({
                type: "projectileDestroy",
                id: this.id
            }));
            projectileList.splice(ind, 1);
        }
    }
}
function resetScore()
{
    for(let i = 0; i < clientList.length; i++)
    {
        let client = clientList[i];
        client.changeScore(0);
    }
}

var webserver = null;
var gameserver = null;
var clientList = null;
var width = 640, height = 480;
var projectileList = [];
var projectileSpeed = 12;
var timeToPlay = 0;
var timeToPlayReset = 180;
function main()
{
    webserver = express();
    webserver.use(express.static("public"));
    let webserverPort = 8080;
    webserver.listen(webserverPort, () => { console.log("webserver listening on http://127.0.0.1:" + webserverPort + "/client.html"); });
    let wsPort = 5524;
    gameserver = new WebSocket.Server({ port: wsPort }, () => {
        console.log("websocket server running on port " + wsPort);
        clientList = [];
        resetPositions();
    });
    gameserver.on("connection", (socket, req) => {
        if(clientList >= 2) return; // no more players
        let client = new GameClient(socket);
        console.log("client connected " + client.id);
        socket.on("message", (data) => { receive(client, data); } );
        clientList.push(client);
        socket.send(JSON.stringify({
            type: "setId",
            id: client.id
        }));
        if(clientList.length == 2)
        {
            resetScore();
            resetPositions();
        }
    });
    setInterval(() => {
        if(timeToPlay <= 0)
        {
            for(let i = 0; i < clientList.length; i++)
            {
                clientList[i].update();
            }
            for(let i = 0; i < projectileList.length; i++)
            {
                projectileList[i].update();
            }
        }
        else
        {
            timeToPlay--;
        }
    }, 1000 / 60);
}
main();