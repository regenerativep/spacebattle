var ws = null;
var connected = false;
var myId = null;
var myShip = null;
var enemyShip = null;
var projectiles = [];
var myScore = 0;
var enemyScore = 0;
var gameState = 0; //0 is not ready, 1 is ready
var timerStart = 0;

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
        this.rocketAccel = 0.01;
        this.angleAccel = 0.01;
    }
    draw(isFriendly)
    {
        push();
        translate(this.x,this.y);
        rotate(this.angle - Math.PI / 2);
        stroke(255);
        if(isFriendly){fill(100,100,255);}
        else{fill(255,100,100)}
        triangle(0,16,11,-10,-11,-10);
        pop();
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
            myShip.angle = data.angle;
            myShip.vangle = data.vangle;
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
            enemyShip.angle = data.angle;
            enemyShip.vangle = data.vangle;
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
        projectiles.push({id: data.id, x: data.x, y: data.y, vx: data.vx, vy: data.vy, type: data.projectileType, update: function() {
            this.x += this.vx;
            this.y += this.vy;
            while(this.x < 0) this.x += width;
            while(this.x >= width) this.x -= width;
            while(this.y < 0) this.y += height;
            while(this.y >= height) this.y -= height;
        } });
    },
    projectileDestroy: function(data)
    {
        for(let i = 0; i < projectiles.length; i++)
        {
            if(projectiles[i].id == data.id)
            {
                projectiles.splice(i,1);
            }
        }
    },
    scoreUpdate: function(data)
    {
        console.log("score update for id " + data.id);
        if(myId != null)
        {
            if(myId == data.id)
            {
                myScore = data.value;
            }
            else
            {
                enemyScore = data.value;
            }
        }
        projectiles = [];
        gameState = 0;
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
    connect("ws://74.104.152.134:5524");
    noLoop();
    setInterval(() => { draw(); }, 1000 / 60);
}

function displayScores()
{
    textSize(32);
    fill(255,100);
    textAlign(CENTER);
    text(myScore+" : "+enemyScore,width/2,40);
}

function displayCountdown()
{
    if(timerStart == 0){timerStart=millis();}
    let mil = millis() - timerStart;
    let timer = 3 - Math.floor(mil/1000);
    textSize(64);
    fill(255,200);
    textAlign(CENTER);
    text(timer,width/2,height/2);
    if(mil>=3000){gameState=1;}
}

function draw()
{
    background(0);
    displayScores();
    if(gameState==0)
    {
        displayCountdown();
    }
    else
    {
        timerStart=0;
    }
    if(myShip != null)
    {
        myShip.draw(true);
    }
    if(enemyShip != null)
    {
        enemyShip.draw(false);
    }
    for(let i = 0; i < projectiles.length; i++)
    {
        let p = projectiles[i];
        p.update();
        fill(255);
        if(p.type=="bullet"){ellipse(p.x,p.y,4,4);}
        if(p.type=="asteroid")
        {
            stroke(255);
            strokeWidth(2);
            fill(150);
            ellipse(p.x,p.y,32,32);
        }
    }
}

var wPress = false;
var aPress = false;
var dPress = false;
var spacePress = false;

function keyPressed()
{
    if(gameState==1)
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
                value: -1
            }))
        }
        if(key=='d')
        {
            dPress = true;
            ws.send(JSON.stringify({
                type: "setTurn",
                value: 1
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
}

function keyReleased()
{
    if(gameState == 1)
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
            dPress = false;
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
}