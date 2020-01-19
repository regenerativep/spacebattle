var ws = null;
var connected = false;
var ship = null;
var enemyShip = null;

class spaceShip
{
    constructor()
    {
        this.id = -1;
        this.x = 0;
        this.y = 0;
        this.angle = 0;
        this.vx = 0;
        this.vy = 0;
        this.vangle = 0;
        this.turnValue = 0;
        this.forwardValue = false;
        this.rocketAccel = 0.1;
        this.angleAccel = 0.1;
    }
}

var receivedActions = {
    setId: function(data)
    {
        ship.id = data.id;
    },
    entityUpdate: function(data)
    {
        
    }
}

function connect(target)
{
    if(ws != null)
    {
        ws.close();
    }
    ws = new WebSocket(target);
    ws.onopen = function() {
        console.log("connected to " + target);
        ws.send(JSON.stringify({
            type: "join"
        }));
        connected = true;
    };
    ws.onclose = function() {
        console.log("disconnected from " + target);
    };
    ws.onmessage = function(ev) {
        let data = JSON.parse(ev.data);
        if(typeof receivedActions[data.type] !== "undefined")
        {
            receivedActions[data.type](data);
        }
    }
}

function setup()
{
    createCanvas(640,480);
    background(0);
    connect(/**address goes here or smth */);
}

var wPress = false;
var aPress = false;
var dPress = false;
var spacePress = false;

keyPressed()
{
    if(key=='w')
    {
        wPress = true;
        ws.send(JSON.stringify({
            type: "setForward",
            value: true
        }))
    }
    if(key=='a')
    {
        aPress = true;
        ws.send(JSON.stringify({
            type: "setTurn",
            value: 1
        }))
    }
    if(key=='d')
    {
        dPress = true;
        ws.send(JSON.stringify({
            type: "setTurn",
            value: -1
        }))
    }
    if(key==' ')
    {
        spacePress = true;
        ws.send(JSON.stringify({
            type: "shoot"
        }))
    }
}

keyReleased()
{
    if(key=='w')
    {
        wPress = false;
        ws.send(JSON.stringify({
            type: "setForward",
            value: false
        }))
    }
    if(key=='a')
    {
        aPress = false;
        if(!dPress)
        {
            ws.send(JSON.stringify({
                type: "setTurn",
                value: 0
            }))
        }
    }
    if(key=='d')
    {
        dPress = fasle;
        if(!aPress)
        {
            ws.send(JSON.stringify({
                type: "setTurn",
                value: 0
            }))
        }
    }
    if(key==' ')
    {
        spacePress = false;
    }
}