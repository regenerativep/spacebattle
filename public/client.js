var ws = null;
var connected = false;
var myId = null;
var myShip = null;
var enemyShip = null;
var projectiles = [];

class SpaceShip
{
    constructor(id)
    {
        this.id = id;
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
    draw()
    {
        ellipse(this.x,this.y,10,10);
    }
}

var receivedActions = {
    setId: function(data)
    {
        myId = data.id;
    },
    shipUpdate: function(data)
    {
        if(myId == null)
        {
            return;
        }
        if(data.id == myId)
        {
            if(myShip == null)
            {
                myShip = new SpaceShip(data.id);
            }
            myShip.x = data.x;
            myShip.y = data.y;
            myShip.vx = data.vx;
            myShip.vy = data.vy;
        }
        else
        {
            if(enemyShip == null)
            {
                enemyShip = new SpaceShip(data.id);
            }
            enemyShip.x = data.x;
            enemyShip.y = data.y;
            enemyShip.vx = data.vx;
            enemyShip.vy = data.vy;
        }
        
    },
    projectileUpdate: function(data)
    {
        for(let i = 0; i < projectiles.length; i++)
        {
            let p = projectiles[i];
            if(p.id == data.id)
            {
                p.x = data.x;
                p.y = data.y;
            }
        }
    },
    projectileCreate: function(data)
    {
        projectiles.push({id: data.id, x: data.x, y: data.y, vx: data.vx, vy: data.vy})
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

function draw()
{
    
}

var wPress = false;
var aPress = false;
var dPress = false;
var spacePress = false;

function keyPressed()
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

function keyReleased()
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