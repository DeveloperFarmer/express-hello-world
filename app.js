(() => {
  //THIS IS THE SERVER CODE
  const fs = require("fs");
  let express = require("express");
  const http = require('http');
  //var uuid = require('uuid-random');//generates special uuid, but uuid is really long (36 characters)
  const WebSocket = require('ws');
  const { serialize } = require('v8');//used for calculating bytes
  let app = express();

  function UUID() {//generate 6 character special ID for each client
    var firstPart = (Math.random() * 46656) | 0;
    var secondPart = (Math.random() * 46656) | 0;
    firstPart = ("000" + firstPart.toString(36)).slice(-3);
    secondPart = ("000" + secondPart.toString(36)).slice(-3);
    return firstPart + secondPart;
  }

  //Important server stuff
  var mainserverURL = 'http://devrocketermain.devrocketer.repl.co/';//url link of the main server that controls teleporting, all dimensions connect to this server
  var arenaserverURL = 'https://devrocketerarena.devrocketer.repl.co/';//url link of arena, needed for world record cuz world record is stored in arena project
  var serverURLs = ["https://devrocketerarena.devrocketer.repl.co/", "https://devrocketerdune.devrocketer.repl.co/", "https://devrocketersanc.devrocketer.repl.co/", "https://devrocketercavern.devrocketer.repl.co/", "https://devrocketercr.devrocketer.repl.co/", "https://devrocketer2tdm.devrocketer.repl.co/", "https://devrocketereditor.devrocketer.repl.co/"];//list of urls of all servers of all dimensions

  var gamemode = process.env.gamemode;//environmental variable contains type of gamemode, e.g. arena, dune, cavern, sanc, cr, 2tdm, editor
  if (gamemode == "arena") {
    var startGameSize = 8000; //map size
  }
  else if (gamemode == "2tdm") {
    var startGameSize = 9000;
    let array = ["red", "green", "blue", "purple"];//possible team colors
    let correspondingColor = {
      red: ["#F04F54", "#D23136"],
      green: ["#00E06C", "#00C24E"],
      blue: ["#00B0E1", "#0092C3"],
      purple: ["#BE7FF5", "#A061D7"],
    }
    var team1 = array[Math.floor(Math.random() * array.length)];
    var team2 = array[Math.floor(Math.random() * array.length)];
    function chooseUntilDifferent() {
      if (team2 == team1) {
        team2 = array[Math.floor(Math.random() * array.length)];
        chooseUntilDifferent()
      }
    }
    chooseUntilDifferent()
    var baseSize = 1500;//if change this value, MUST change in client code too
    var defStats = {
      droneLimit: 20,
      reloadRecover: 10,
      bulletHealth: 50,
      bulletDamage: 1,
      bulletTimer: 100,
      bulletSpeed: 20,
      barrelWidth: 40,
      defenderFOV: 1500,
    }
    var defenders = {//base defenders that spawn players
      1: {
        x: baseSize / 2,
        y: 643,
        width: 200,
        color: correspondingColor[team1][0],
        outline: correspondingColor[team1][1],
        angle: 0,
        reload: 0,
        droneCount: 0,
        team: team1,
        target: "",
      },
      2: {
        x: baseSize / 2,
        y: 3214,
        width: 200,
        color: correspondingColor[team1][0],
        outline: correspondingColor[team1][1],
        angle: 0,
        reload: 0,
        droneCount: 0,
        team: team1,
        target: "",
      },
      3: {
        x: baseSize / 2,
        y: 5785,
        width: 200,
        color: correspondingColor[team1][0],
        outline: correspondingColor[team1][1],
        angle: 0,
        reload: 0,
        droneCount: 0,
        team: team1,
        target: "",
      },
      4: {
        x: baseSize / 2,
        y: 8356,
        width: 200,
        color: correspondingColor[team1][0],
        outline: correspondingColor[team1][1],
        angle: 0,
        reload: 0,
        droneCount: 0,
        team: team1,
        target: "",
      },
      5: {
        x: startGameSize - baseSize / 2,
        y: 643,
        width: 200,
        color: correspondingColor[team2][0],
        outline: correspondingColor[team2][1],
        angle: 0,
        reload: 0,
        droneCount: 0,
        team: team2,
        target: "",
      },
      6: {
        x: startGameSize - baseSize / 2,
        y: 3214,
        width: 200,
        color: correspondingColor[team2][0],
        outline: correspondingColor[team2][1],
        angle: 0,
        reload: 0,
        droneCount: 0,
        team: team2,
        target: "",
      },
      7: {
        x: startGameSize - baseSize / 2,
        y: 5785,
        width: 200,
        color: correspondingColor[team2][0],
        outline: correspondingColor[team2][1],
        angle: 0,
        reload: 0,
        droneCount: 0,
        team: team2,
        target: "",
      },
      8: {
        x: startGameSize - baseSize / 2,
        y: 8356,
        width: 200,
        color: correspondingColor[team2][0],
        outline: correspondingColor[team2][1],
        angle: 0,
        reload: 0,
        droneCount: 0,
        team: team2,
        target: "",
      },
    }
  }
  else if (gamemode == "dune") {
    var startGameSize = 6000;
  }
  else if (gamemode == "cavern") {
    var startGameSize = 15000;
  }
  else if (gamemode == "cr") {
    var startGameSize = 16500;
  }
  else if (gamemode == "sanc") {
    var startGameSize = 3000;
  }
  else if (gamemode == "editor") {
    var startGameSize = 6000;
    var safeZone = 2000;//if you change this, MUST change this on client code too
    var safezoneleft = startGameSize / 2 - safeZone / 2;
    var safezoneright = startGameSize / 2 + safeZone / 2;
  }
  var gameSize = startGameSize; //this one can change when more players join (but disabled for now)

  app.get("/", function(req, res) {//someone connect to this server (get request)
    //   res.sendFile(__dirname + "/index.html");
    res.send('bruh why...')
  });
  app.post("/", function(req, res) {//received player data from main server (someone wants to teleport to this server!) (post request)
    let chunk = '';
    req.on('data', function(data) {
      chunk += data;
    });
    req.on('end', function() {//all data sent
      //console.log("Received body data:");
      //console.log(chunk.toString());
      chunk = JSON.parse(chunk)
      if (chunk[0] == "gpc") {//main server send global player count
        if (chunk[2] == process.env.teleportingPassword) {
          globalPlayerCount = chunk[1];
          console.log("received new global player count")
          //["gpc",playercount,password]//example of packet received
          //broadcast new global player count
          if (gamemode != "cr" && gamemode != "cavern") {
            var packet = JSON.stringify(["gpc", globalPlayerCount]);
            wss.broadcast(packet);
          }
        }
      }
      //user is logging in/signing up an account
      else if (chunk[0] == "foundaccLogin") {//logging in
        if (chunk[3] == process.env.teleportingPassword) {
          //["foundaccLogin",accountFound,socketid,process.env.teleportingPassword]
          var packet = JSON.stringify(["accountView", chunk[1]]);
          lookup[chunk[2]].send(packet)
          //var packet = JSON.stringify(["newNotification", "Successfully logged in!", "green"]);
          lookup[chunk[2]].send(packet)
          clientAccountIDs[chunk[2]] = chunk[1]._id;
        }
      }
      else if (chunk[0] == "noacc") {//logging in but no acc found
        if (chunk[2] == process.env.teleportingPassword) {
          //["noacc",socketid,process.env.teleportingPassword]
          var packet = JSON.stringify(["newNotification", "Account does not exist.", "red"]);
          lookup[chunk[1]].send(packet)
        }
      }
      else if (chunk[0] == "foundaccSignup") {//sign up but acc exists
        if (chunk[3] == process.env.teleportingPassword) {
          //["foundaccSignup",accountFound,socketid,process.env.teleportingPassword]
          var packet = JSON.stringify(["accountView", chunk[1]]);
          lookup[chunk[2]].send(packet)
          var packet = JSON.stringify(["newNotification", "The account already exists. Successfully logged in.", "green"]);
          lookup[chunk[2]].send(packet)
          clientAccountIDs[chunk[2]] = chunk[1]._id;
        }
      }
      else if (chunk[0] == "accSignup") {//signed up
        if (chunk[3] == process.env.teleportingPassword) {
          //["accSignup",accountObj,socketid,process.env.teleportingPassword, result.insertedId]
          var packet = JSON.stringify(["accountView", chunk[1]]);
          lookup[chunk[2]].send(packet)
          var packet = JSON.stringify(["newNotification", "Successfully signed up!", "green"]);
          lookup[chunk[2]].send(packet)
          clientAccountIDs[chunk[2]] = chunk[4];
        }
      }
      else if (chunk[0] == "editAcc") {//edited acc
        if (chunk[3] == process.env.teleportingPassword) {
          //["editAcc",result2,id,process.env.teleportingPassword]
          var packet = JSON.stringify(["accountView", chunk[1]]);
          lookup[chunk[2]].send(packet)
        }
      }
      else if (chunk[0] == "newAch") {//edited acc
        if (chunk[2] == process.env.teleportingPassword) {
          //["newAch",id,process.env.teleportingPassword]
          var packet = JSON.stringify(["newNotification", "New achievement unlocked!", "gold"]);
          lookup[chunk[1]].send(packet)
        }
      }
      else if (chunk[0] == "highscore") {//edited acc
        if (chunk[2] == process.env.teleportingPassword) {
          //"highscore",id,process.env.teleportingPassword
          var packet = JSON.stringify(["newNotification", "New high score achieved!", "gold"]);
          lookup[chunk[1]].send(packet)
        }
      }
      else if (chunk[0] == "wr") {//check if world record (sent from other gamemodes to arena)
        if (gamemode == "arena") {
          if (chunk[1] == process.env.teleportingPassword) {
            checkIfNewWorldRecord(chunk[2])
          }
        }
      }
      else if (chunk[0] == "respawnXp") {//someone respawning in arena
        if (chunk[1] == process.env.teleportingPassword) {
          deadPlayers[chunk[3]] = chunk[2];//store score 
          console.log("received dead player")
        }
      }
      //main server send player data of player that wants to teleport
      else if (chunk[3] == process.env.teleportingPassword) {//prevent hackers from illegally teleporting here
        var thisplayer = chunk[0];
        var thisplayerID = chunk[2];
        teleportedPlayers[thisplayerID] = thisplayer;//store teleported player and wait for that dude to connect
        //[playerlist[id],"dune",id,password]//example packet received from main server
      }
    });
    res.send('received player data!')
  });
  var teleportedPlayers = {};

  var lookup = {};//needed to send stuff to specific clients
  var findIpUsingId = {};//allow respawning with score, cuz switching servers change ID

  process.on('uncaughtException', function(err) {//when there's an error, tell main server
    var errmsg = 'Caught exception in ' + gamemode + ': ' + err.stack;
    var packetToMainServer = ["err", process.env.teleportingPassword, errmsg];//send password to verify
    var axios = require("axios");
    axios.post(mainserverURL, packetToMainServer)
      .then(function(response) {
        //console.log(response);
        console.log("sent err")
      })
      .catch(function(error) {
        console.log("Error when sending error to main server...");
      });
  });

  //quadtree code
  //what is quadtree:
  //if u do collision detection by checking each object with all other objects, lag will increase exponentialy with each new object
  //quadtree collision detection fixes this issue by doing this
  //the objects are placed into different lists based on position, and collision detection is only checked for objects near it
  //objects are split into "boxes" and if a box is too full, the box becomes 4 smaller boxes. But there is a limit too the number of splits
  //special thanks for the quadtree code: https://github.com/timohausmann/quadtree-js
  class Quadtree {
    constructor(bounds, max_objects, max_levels, level) {
      this.max_objects = max_objects || 10;
      this.max_levels = max_levels || 4;
      //
      this.level = level || 0;
      this.bounds = bounds;

      this.objects = [];
      this.nodes = [];
    }
  }

  //Split the node into 4 subnodes
  Quadtree.prototype.split = function() {
    let nextLevel = this.level + 1,
      subWidth = this.bounds.width / 2,
      subHeight = this.bounds.height / 2,
      x = this.bounds.x,
      y = this.bounds.y;

    //top right node
    this.nodes[0] = new Quadtree(
      {
        x: x + subWidth,
        y: y,
        width: subWidth,
        height: subHeight,
      },
      this.max_objects,
      this.max_levels,
      nextLevel
    );

    //top left node
    this.nodes[1] = new Quadtree(
      {
        x: x,
        y: y,
        width: subWidth,
        height: subHeight,
      },
      this.max_objects,
      this.max_levels,
      nextLevel
    );

    //bottom left node
    this.nodes[2] = new Quadtree(
      {
        x: x,
        y: y + subHeight,
        width: subWidth,
        height: subHeight,
      },
      this.max_objects,
      this.max_levels,
      nextLevel
    );

    //bottom right node
    this.nodes[3] = new Quadtree(
      {
        x: x + subWidth,
        y: y + subHeight,
        width: subWidth,
        height: subHeight,
      },
      this.max_objects,
      this.max_levels,
      nextLevel
    );
  };

  //Determine which node the object belongs to
  Quadtree.prototype.getIndex = function(pRect) {
    let indexes = [],
      verticalMidpoint = this.bounds.x + this.bounds.width / 2,
      horizontalMidpoint = this.bounds.y + this.bounds.height / 2;

    let startIsNorth = pRect.y < horizontalMidpoint,
      startIsWest = pRect.x < verticalMidpoint,
      endIsEast = pRect.x + pRect.width > verticalMidpoint,
      endIsSouth = pRect.y + pRect.height > horizontalMidpoint;

    //top-right quad
    if (startIsNorth && endIsEast) {
      indexes.push(0);
    }

    //top-left quad
    if (startIsWest && startIsNorth) {
      indexes.push(1);
    }

    //bottom-left quad
    if (startIsWest && endIsSouth) {
      indexes.push(2);
    }

    //bottom-right quad
    if (endIsEast && endIsSouth) {
      indexes.push(3);
    }

    return indexes;
  };

  //Insert the object into the node. If the node exceeds the capacity, it will split and add all objects to their corresponding subnodes

  Quadtree.prototype.insert = function(pRect) {
    let i = 0,
      indexes;

    //if we have subnodes, call insert on matching subnodes
    if (this.nodes.length) {
      indexes = this.getIndex(pRect);

      for (i = 0; i < indexes.length; i++) {
        this.nodes[indexes[i]].insert(pRect);
      }
      return;
    }

    //otherwise, store object here
    this.objects.push(pRect);

    //max_objects reached
    if (
      this.objects.length > this.max_objects &&
      this.level < this.max_levels
    ) {
      //split if we don't already have subnodes
      if (!this.nodes.length) {
        this.split();
      }

      //add all objects to their corresponding subnode
      for (i = 0; i < this.objects.length; i++) {
        indexes = this.getIndex(this.objects[i]);
        for (let k = 0; k < indexes.length; k++) {
          this.nodes[indexes[k]].insert(this.objects[i]);
        }
      }

      //clean up this node
      this.objects = [];
    }
  };

  //Return all objects that could collide with the given object
  Quadtree.prototype.retrieve = function(pRect) {
    let indexes = this.getIndex(pRect),
      returnObjects = this.objects;

    //if we have subnodes, retrieve their objects
    if (this.nodes.length) {
      for (var i = 0; i < indexes.length; i++) {
        returnObjects = returnObjects.concat(
          this.nodes[indexes[i]].retrieve(pRect)
        );
      }
    }

    //remove duplicates
    returnObjects = returnObjects.filter(function(item, index) {
      return returnObjects.indexOf(item) >= index;
    });

    return returnObjects;
  };

  //clear the quadtree
  Quadtree.prototype.clear = function() {
    this.objects = [];

    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes.length) {
        this.nodes[i].clear();
      }
    }

    this.nodes = [];
  };

  //export for commonJS or browser
  if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
    module.exports = Quadtree;
  } else {
    window.Quadtree = Quadtree;
  }

  //end of quadtree functions. those functions can be used in the game code below

  //ACCOUNTS
  let clientAccountIDs = {};//store account ids

  function addAchievement(playerlist, id, achievementID, addstars) {
    if (!playerlist[id].sentAch.includes(achievementID)) {//havent sent this achivement before
      playerlist[id].sentAch.push(achievementID);//add to list of sent ach
      var packetToMainServer = ["ach", process.env.teleportingPassword, gamemode, playerlist[id].accountID, achievementID, addstars, id];//send password to verify
      axios.post(mainserverURL, packetToMainServer)
        .then(function(response) {
          //console.log(response);
          console.log("sent ach")
        })
        .catch(function(error) {
          console.log("Connectivity error");
          //remove from sent ach list
          /*
            const index = playerlist[id].sentAch.indexOf(achievementID);
            if (index > -1) { // only splice array when item is found
              playerlist[id].sentAch.splice(index, 1); // 2nd parameter means remove one item only
            }
            */
          var packet = JSON.stringify(["newNotification",
            "Server error occured when trying to retrieve your achievements.", "orange"]);
          lookup[id].send(packet);
        });
    }
  }
  function addHighScore(player, id) {
    var packetToMainServer = ["highscore", process.env.teleportingPassword, gamemode, player.accountID, player.score, id];//send password to verify
    axios.post(mainserverURL, packetToMainServer)
      .then(function(response) {
        //console.log(response);
        console.log("sent high score")
      })
      .catch(function(error) {
        console.log("Connectivity error");
        var packet = JSON.stringify(["newNotification",
          "Server error occured when trying to retrieve your high score.", "orange"]);
        lookup[id].send(packet);
      });
  }


  //curly braces represent an object, which is a javascript term for a list of things that have properties. Theses are different from arrays, which are square brackets
  //the actual lists for objects:
  var playerUpgrade = {};
  //ARENA
  const players = {};
  const shapes = {};
  const bots = {};
  var botID = 0;
  const botbullets = {};
  var shapeID = 0;
  const bullets = {};
  var bulletID = 0;
  const defbullets = {};
  var defbulletID = 0;
  const portals = {}; //arena to dune
  const cavernportals = {}; //crossroads to cavern
  const sancportals = {}; //arena to sanctuary
  var portalID = 0;
  var leaderboard = {};//store the leaderboard to check if it changed before sending to client

  var globalPlayerCount = 0;//global player count across all servers
  var prevplayercount = -1;//previous player count to track if player count changed, then send to main server to update global player count
  var timeSinceLastPlayerCount = 50;//time between sending new player count is 50 * 30 milliseconds. prevents botter from crashing server
  var maxtime = 50;//should be same number as above

  //white portal in dune
  const enterDunePortal = {
    x: gameSize / 2,
    y: gameSize / 2,
    name: "portal",
    width: 200, //width and height is half of total width and height including portal aura
    height: 200,
    color: "white",
    color2: "white", //color of aura
    outline: "lightgrey",
    angleDegrees: 0,
  };

  //crossroads portal locations
  const portalLocations = [{ x: 1650, y: 1650, portalHere: "no", }, { x: 2850, y: 2250, portalHere: "no", }, { x: 5250, y: 1950, portalHere: "no", }, { x: 7050, y: 1950, portalHere: "no", }, { x: 1650, y: 5850, portalHere: "no", }, { x: 3750, y: 5850, portalHere: "no", }, { x: 6150, y: 3450, portalHere: "no", }, { x: 6150, y: 5250, portalHere: "no", }, { x: 7950, y: 4650, portalHere: "no", }, { x: 5850, y: 6150, portalHere: "no", }, { x: 4950, y: 7950, portalHere: "no", }, { x: 3150, y: 7650, portalHere: "no", }, { x: 750, y: 8250, portalHere: "no", },];//portals spawn at fixed positions
  //crossroads maze wall locations
  if (gamemode == "cr") {
    var mazewalls = { 1: { x: 0, y: 0, w: 1500, h: 8100, }, 2: { x: 0, y: 8400, w: 1500, h: 8100, }, 3: { x: 15000, y: 0, w: 1500, h: 8100, }, 4: { x: 15000, y: 8400, w: 1500, h: 8100, }, 5: { x: 1500, y: 0, w: 6600, h: 1500, }, 6: { x: 8400, y: 0, w: 6600, h: 1500, }, 7: { x: 1500, y: 15000, w: 6600, h: 1500, }, 8: { x: 8400, y: 15000, w: 6600, h: 1500, }, 9: { x: 1800, y: 1800, w: 1200, h: 300, }, 10: { x: 2700, y: 2100, w: 300, h: 300, }, 11: { x: 1800, y: 2400, w: 1200, h: 300, }, 12: { x: 1800, y: 2700, w: 300, h: 900, }, 13: { x: 1800, y: 3900, w: 300, h: 600, }, 14: { x: 1800, y: 4500, w: 900, h: 300, }, 15: { x: 2400, y: 3000, w: 300, h: 1500, }, 16: { x: 2700, y: 3000, w: 300, h: 300, }, 17: { x: 3600, y: 1800, w: 900, h: 300, }, 18: { x: 3600, y: 2100, w: 300, h: 600, }, 19: { x: 3300, y: 2400, w: 300, h: 300, }, 20: { x: 4200, y: 2100, w: 300, h: 600, }, 21: { x: 4500, y: 2400, w: 600, h: 300, }, 22: { x: 4800, y: 1800, w: 1200, h: 300, }, 23: { x: 5700, y: 2100, w: 300, h: 900, }, 24: { x: 6000, y: 2400, w: 2700, h: 300, }, 25: { x: 6300, y: 2700, w: 300, h: 1200, }, 26: { x: 6000, y: 3600, w: 300, h: 300, }, 27: { x: 6600, y: 1800, w: 2700, h: 300, }, 28: { x: 9000, y: 2100, w: 300, h: 600, }, 29: { x: 10200, y: 1800, w: 1200, h: 300, }, 30: { x: 12900, y: 1800, w: 1800, h: 300, }, 31: { x: 4500, y: 3000, w: 600, h: 300, }, 32: { x: 4500, y: 3300, w: 300, h: 600, }, 33: { x: 4800, y: 3600, w: 300, h: 1500, }, 34: { x: 4200, y: 4800, w: 600, h: 300, }, 35: { x: 4200, y: 5100, w: 300, h: 600, }, 36: { x: 4200, y: 6000, w: 300, h: 300, }, 37: { x: 3000, y: 4200, w: 1500, h: 300, }, 38: { x: 3000, y: 4500, w: 300, h: 1500, }, 39: { x: 3300, y: 5700, w: 600, h: 300, }, 40: { x: 3600, y: 4800, w: 300, h: 900, }, 41: { x: 1800, y: 5100, w: 1200, h: 300, }, 42: { x: 1800, y: 5400, w: 300, h: 300, }, 43: { x: 1800, y: 5700, w: 900, h: 300, }, 44: { x: 2400, y: 6000, w: 300, h: 1500, }, 45: { x: 2700, y: 6900, w: 1200, h: 300, }, 46: { x: 3600, y: 6600, w: 300, h: 300, }, 47: { x: 3000, y: 6300, w: 1800, h: 300, }, 48: { x: 1800, y: 6300, w: 300, h: 900, }, 49: { x: 1800, y: 7800, w: 1800, h: 300, }, 50: { x: 2700, y: 8100, w: 300, h: 900, }, 51: { x: 2100, y: 8400, w: 300, h: 1200, }, 52: { x: 1800, y: 9600, w: 1800, h: 300, }, 53: { x: 3300, y: 8700, w: 300, h: 600, }, 54: { x: 3600, y: 9000, w: 300, h: 300, }, 55: { x: 1800, y: 10800, w: 300, h: 600, }, 56: { x: 1800, y: 11700, w: 600, h: 300, }, 57: { x: 2400, y: 11400, w: 600, h: 300, }, 58: { x: 2400, y: 11700, w: 300, h: 1200, }, 59: { x: 1800, y: 12600, w: 300, h: 2100, }, 60: { x: 2100, y: 13200, w: 600, h: 300, }, 61: { x: 2400, y: 13800, w: 300, h: 900, }, 62: { x: 2700, y: 14400, w: 300, h: 300, }, 63: { x: 6900, y: 3000, w: 1800, h: 300, }, 64: { x: 6900, y: 3600, w: 300, h: 900, }, 65: { x: 5400, y: 4500, w: 2700, h: 300, }, 66: { x: 8100, y: 3600, w: 600, h: 300, }, 67: { x: 7800, y: 3900, w: 600, h: 300, }, 68: { x: 9000, y: 3300, w: 300, h: 300, }, 69: { x: 9000, y: 3600, w: 900, h: 300, }, 70: { x: 9600, y: 4200, w: 300, h: 600, }, 71: { x: 10800, y: 2400, w: 600, h: 300, }, 72: { x: 10800, y: 2700, w: 300, h: 1200, }, 73: { x: 10500, y: 3600, w: 300, h: 300, }, 74: { x: 12000, y: 2100, w: 300, h: 900, }, 75: { x: 11400, y: 3000, w: 1500, h: 300, }, 76: { x: 12600, y: 2400, w: 300, h: 600, }, 77: { x: 11700, y: 3300, w: 300, h: 600, }, 78: { x: 14400, y: 2100, w: 300, h: 600, }, 79: { x: 12300, y: 3600, w: 1500, h: 300, }, 80: { x: 12300, y: 3900, w: 300, h: 600, }, 81: { x: 13500, y: 3900, w: 300, h: 600, }, 82: { x: 14400, y: 3300, w: 300, h: 600, }, 83: { x: 14100, y: 3600, w: 300, h: 1200, }, 84: { x: 10500, y: 4200, w: 1500, h: 300, }, 85: { x: 11700, y: 4500, w: 300, h: 2100, }, 86: { x: 10800, y: 4800, w: 900, h: 300, }, 87: { x: 10800, y: 5100, w: 300, h: 900, }, 88: { x: 10500, y: 5400, w: 300, h: 300, }, 89: { x: 12000, y: 6000, w: 600, h: 300, }, 90: { x: 12300, y: 6300, w: 300, h: 300, }, 91: { x: 12300, y: 4800, w: 300, h: 900, }, 92: { x: 14100, y: 5100, w: 300, h: 300, }, 93: { x: 14400, y: 5100, w: 300, h: 1200, }, 94: { x: 13200, y: 6000, w: 900, h: 300, }, 95: { x: 13200, y: 6300, w: 300, h: 600, }, 96: { x: 13800, y: 6600, w: 900, h: 300, }, 97: { x: 14400, y: 6900, w: 300, h: 2400, }, 98: { x: 13200, y: 7200, w: 600, h: 300, }, }//the first 8 walls are for creating the 4 eternal corridors at the sides of the crossroads
  }
  else if (gamemode == "cavern") {
    var mazewalls = { 1: { x: gameSize / 2 - 300 * 2.5, y: gameSize / 2 - 300 * 2.5, w: 300, h: 300, }, 2: { x: gameSize / 2 - 300 * 1.5, y: gameSize / 2 - 300 * 2.5,w: 300, h: 300, }, 3: { x: gameSize / 2 + 300 * 0.5, y: gameSize / 2 - 300 * 2.5, w: 300, h: 300, }, 4: { x: gameSize / 2 + 300 * 1.5, y: gameSize / 2 - 300 * 2.5, w: 300, h: 300, }, 5: { x: gameSize / 2 - 300 * 2.5, y: gameSize / 2 + 300 * 1.5, w: 300, h: 300, }, 6: { x: gameSize / 2 - 300 * 1.5, y: gameSize / 2 + 300 * 1.5, w: 300, h: 300, }, 7: { x: gameSize / 2 + 300 * 0.5, y: gameSize / 2 + 300 * 1.5, w: 300, h: 300, }, 8: { x: gameSize / 2 + 300 * 1.5, y: gameSize / 2 + 300 * 1.5, w: 300, h: 300, }, 9: { x: gameSize / 2 - 300 * 2.5, y: gameSize / 2 - 300 * 1.5, w: 300, h: 300, }, 10: { x: gameSize / 2 - 300 * 2.5, y: gameSize / 2 + 300 * 0.5, w: 300, h: 300, }, 11: { x: gameSize / 2 + 300 * 1.5, y: gameSize / 2 - 300 * 1.5, w: 300, h: 300, }, 12: { x: gameSize / 2 + 300 * 1.5, y: gameSize / 2 + 300 * 0.5, w: 300, h: 300, }, }
  }
  //x is x value of top left corner of maze wall
  //width is total width of maze wall
  const enterCrPortal = {
    x: 4800,
    y: 4500,
    name: "portal",
    width: 200, //width and height is half of total width and height including portal aura
    height: 200,
    color: "white",
    outline: "white", //color of aura
    angleDegrees: 0,
  };

  //sanctuary spawner
  const sancspawner = {
    x: gameSize / 2,
    y: gameSize / 2,
    name: "sanc spawner",
    width: 350,
    basewidth1: 168,
    basewidth2: 112,
    basewidth3: 56,
    basewidth4: 308,
    basewidth5: 252,
    basewidth6: 406,
    color: "#934c93",
    outline: "#660066",
    barrelColor: "#999999",
    barrelOutline: "#7B7B7B",
    baseColor: "#5F676C",
    baseOutline: "#41484E",
    auraColor: "rgba(158, 73, 158,.3)",
    auraWidth: 1100,
    angle: 0,
    sides: 6,
  };

  if (gamemode == "cavern") {
    //spawn cavern protector
    let botX = Math.floor(Math.random() * gameSize);
    let botY = Math.floor(Math.random() * gameSize);
    bots[1] = {
      x: botX,
      y: botY,
      name: "Cavern Protector",
      width: 250,
      score: 1000000000,
      health: Infinity,
      maxhealth: Infinity,
      damage: 100,
      speed: 9,
      hit: 0,
      attackers: {},
      fov: 1500,
      angle: 0,
      barrels: {
        barrelOne: {
          barrelWidth: 170,
          barrelHeight: 350,
          additionalAngle: 0,
          x: 0,
          barrelMoveIncrement: 0,
          barrelType: "bullet",
          reloadRecover: 100, //delay between bullets
          bulletHealth: 50,
          bulletDamage: 3,
          bulletTimer: 40,
          bulletSpeed: 30,
          barrelHeightChange: 0,
          shootingState: "no",
          reload: 0,
          recoil: 1,
        },
        barrelTwo: {
          barrelWidth: 100,
          barrelHeight: 500,
          additionalAngle: 0,
          x: 0,
          barrelMoveIncrement: 0,
          barrelType: "bullet",
          reloadRecover: 50, //delay between bullets
          bulletHealth: 50,
          bulletDamage: 3,
          bulletTimer: 30,
          bulletSpeed: 40,
          barrelHeightChange: 0,
          shootingState: "no",
          reload: 0,
          recoil: 1,
        },
      },
      shooting: "no",
      hive: 0,
      side: 8,
    };
    for (let i = 0; i < 8; i++) {//add 8 front trap barrels to cavern protector
      bots[1].barrels[i] = {
        barrelWidth: 100,
        barrelHeight: 270 + i * 20,
        additionalAngle: 0,
        x: 0,
        barrelMoveIncrement: 0,
        barrelType: "trap",
        trapDistBeforeStop: 30,
        reloadRecover: 100, //delay between bullets
        bulletHealth: 200,
        bulletDamage: 3,
        bulletTimer: 100,
        bulletSpeed: 30,
        barrelHeightChange: 0,
        shootingState: "no",
        reload: 50,
        recoil: 1,
      };
    }
    for (let i = 8; i < 16; i++) {//add 8 side trap barrels to cavern protector (around it)
      bots[1].barrels[i] = {
        barrelWidth: 100,
        barrelHeight: 350,
        additionalAngle: i * 45 + 22.5,
        x: 0,
        barrelMoveIncrement: 0,
        barrelType: "trap",
        trapDistBeforeStop: 15,
        reloadRecover: 30, //delay between bullets
        bulletHealth: 200,
        bulletDamage: 10,
        bulletTimer: 100,
        bulletSpeed: 30,
        barrelHeightChange: 0,
        shootingState: "no",
        reload: 0,
        recoil: 1,
      };
    }
  }

  //for keeping track number of bots in each hive
  let firstHive = 0;
  let secondHive = 0;
  let thirdHive = 0;
  let fourthHive = 0;
  let rockHive = 0;

  //unlike the other dead lists, this one doesnt clear each loop. it allows players to respawn with score
  let deadPlayers = {};
  let respawnScoreDivision = 2;
  let respawnScoreLimit = 10e10;

  //delta time calculation variables
  let timeLapsed = 0;
  let currentLoopTime = 0;
  let prevLoopTime = 0;
  let delta = 1;

  //global variables needed for code for sending stuff to client
  let items = {};
  let previtems = {};//store the previous items sent to client, and then only send the different items. to reduce bandwidth usage
  let prevportals = {};//store the previous portals sent to client

  let peopleWithToken = [];

  let clientIP = {};

  //shooting recoil
  let recoilReduction = 0.9; //amount reduced every loop, 1 means stay the same
  //movement acceleration
  let accelerationIncrement = 1; //amount added when accelerating and decelerating
  //fov increase per level
  let fovincrease = 0.002;

  //quadtree lists for all the things that need collision detection, e.g. dune players no need collision detection
  //this is not the actual lists
  let bulletTree = new Quadtree({
    x: 0,
    y: 0,
    width: gameSize,
    height: gameSize,
  },
    5,
    10
  );
  let defbulletTree = new Quadtree({
    x: 0,
    y: 0,
    width: gameSize,
    height: gameSize,
  },
    5,
    10
  );
  let botbulletTree = new Quadtree({
    x: 0,
    y: 0,
    width: gameSize,
    height: gameSize,
  },
    5,
    10
  );
  let shapeTree = new Quadtree(
    {
      x: 0,
      y: 0,
      width: gameSize,
      height: gameSize,
    });//specify max obj and max level (max obj is number of obj before box splits, max level is max number of splits)
  let botTree = new Quadtree({
    x: 0,
    y: 0,
    width: gameSize,
    height: gameSize,
  },
    5,
    10
  );
  let playerTree = new Quadtree({
    x: 0,
    y: 0,
    width: gameSize,
    height: gameSize,
  });
  let portalTree = new Quadtree({
    x: 0,
    y: 0,
    width: gameSize,
    height: gameSize,
  });
  let cavernportalTree = new Quadtree({
    x: 0,
    y: 0,
    width: gameSize,
    height: gameSize,
  });
  let sancportalTree = new Quadtree({
    x: 0,
    y: 0,
    width: gameSize,
    height: gameSize,
  });
  let mazewallTree = new Quadtree({
    x: 0,
    y: 0,
    width: gameSize,
    height: gameSize,
  });
  //put it in quadtree. since maze walls do not change, quadtree does not need to change
  if (gamemode == "cavern" || gamemode == "cr") {
    for (const id in mazewalls) {
      mazewallTree.insert({
        x: mazewalls[id].x,//maze wall x position is at top left corner
        y: mazewalls[id].y,
        width: mazewalls[id].w,
        height: mazewalls[id].h,
        id: id,
      });
    }
  }

  //RETRIEVE THE WORLD RECORD LEADERBOARD FROM THE WORLDRECORD.JSON FILE
  let worldrecord = "error";
  // read JSON object from file everytime when the server starts
  fs.readFile("worldrecord.json", "utf-8", (err, data) => {
    if (err) {
      throw err;
    }
    // parse JSON object
    worldrecord = JSON.parse(data.toString()); //refers to the world record holder, which contains information of score, name and tank used
  });

  const axios = require("axios");
  const pako = require("pako"); //used for compressing files to make them small
  //const snappy = require('snappy')

  if (gamemode == "arena") {
    //get featured youtuber
    //REMEBER TO ADD MORE BRACKETS BELOW IF ADD MORE YOTUBERS
    var youtuberlist = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {},]; //three youtubers
    var numberOfYoutubers = 10; //number of youtubers
    var youtuberIcon = "";
    var youtuberName = "Loading...";
    var youtuberURL = "";
    var APIkey = process.env.youtubeAPI; //need API key to use youtube api
    async function getYouTuberProfile(number) {
      if (number == 0) {
        var channelID = "UCY7pAmJbxsr0UDbFSrlwmWg"; //CHROMA
      } else if (number == 1) {
        var channelID = "UCR3TYz9jr83qlgul4HjX7Kg"; //THREETRIANGLEX
      } else if (number == 2) {
        var channelID = "UCT6nOb6Zsjz8Thrse6Nuimw"; //PIUFAN
      } else if (number == 3) {
        var channelID = "UCd1Wnx9x00t08lSk3D2EQVA"; //BASIC6
      } else if (number == 4) {
        var channelID = "UCMqZAjUGGDWusw81NFzHemg"; //TRICKY
      } else if (number == 5) {
        var channelID = "UChWggjsAG1qqtaDPJNSYF2g"; //L4AT
      } else if (number == 6) {
        var channelID = "UCathp8bGhwcOQbEhYRF2zMA"; //Rubid (routerXdd)
      } else if (number == 7) {
        var channelID = "UCUMU9JdDorONUQZOaoSTX2w"; //Pentamancer
      } else if (number == 8) {
        var channelID = "UCEhA2fS2ltcnx17jkX4oAzQ";//the arras police
      } else if (number == 9){
        var channelID = "UCn8GpEdUX8BNYWqjNPLodXQ";//orochi.ex3
      }
      const url = "https://www.googleapis.com/youtube/v3/channels?part=snippet&id=" + channelID + "&key=" + APIkey; //get youtube stuff using this url
      const response = await axios.get(url);
      youtuberlist[number].youtuberIcon =
        response.data.items[0].snippet.thumbnails.high.url; //instead of high, use default for lower resolution
      youtuberlist[number].youtuberName = response.data.items[0].snippet.title;
      youtuberlist[number].youtuberURL = response.data.items[0].snippet.customUrl;
    }
    for (let i = 0; i < numberOfYoutubers; i++) {
      getYouTuberProfile(i);
    }
  }

  function checkIfNewWorldRecord(player) {
    if (gamemode == "arena") {//world record is stored in arena!!!
      for (let index in worldrecord) {
        if (player.score > worldrecord[index].score) {
          let tempplayerlist = {
            score: player.score,
            name: player.name,
            tank: player.tankType + "-" + player.bodyType,
          };
          worldrecord.splice(index, 0, tempplayerlist);//add to list
          worldrecord.pop();//remove last player on world record
          const fs = require("fs");
          // convert JSON object to a string
          const data = JSON.stringify(worldrecord);
          fs.writeFile("worldrecord.json", data, (err) => {
            if (err) {
              throw err;
            }
          });
          break
        }
      }
    }
    else if (gamemode != "editor") {//if this is not arena and tank editor, tell the arena server to check if this is a world record
      var packetToMainServer = ["wr", process.env.teleportingPassword, player];
      axios.post(arenaserverURL, packetToMainServer)
        .then(function(response) {
          //console.log(response);
          console.log("sent acc 1")
        })
        .catch(function(error) {
          console.log("Connectivity error");
        });
    }
  }

  function chatRemovalAfterSomeTime(playerlist, playerid) {
    for (let i = 0; i < playerlist[playerid].chats.length; i++) {
      playerlist[playerid].chats[i].time++;
      if (playerlist[playerid].chats[i].time == 200) {
        //remove message
        playerlist[playerid].chats.shift(); //remove oldest message
      }
    }
  }
  function barrelAnimationForShooting(playerlist, playerid) {
    let animationTime = 10; //but change of 2 per loop, so time is actually 5
    let amountChangePerLoop = 2;
    for (const i in playerlist[playerid].barrels) {
      if (playerlist[playerid].barrels[i].reloadRecover < animationTime / amountChangePerLoop) {
        animationTime = playerlist[playerid].barrels[i].reloadRecover * amountChangePerLoop;
      }
      if (playerlist[playerid].barrels[i].shootingState == "decreasing") {
        //if player just shot a bullet
        playerlist[playerid].barrels[i].barrelHeightChange += amountChangePerLoop; //decrease barrel height
        if (playerlist[playerid].barrels[i].barrelHeightChange >= animationTime) {
          //max barrel height reduction of 10
          playerlist[playerid].barrels[i].shootingState = "increasing";
        }
      } else if (playerlist[playerid].barrels[i].shootingState == "increasing") {
        playerlist[playerid].barrels[i].barrelHeightChange -= amountChangePerLoop; //increase barrel height
        if (playerlist[playerid].barrels[i].barrelHeightChange <= 0) {
          //if barrel is back to normal
          playerlist[playerid].barrels[i].barrelHeightChange = 0;
          playerlist[playerid].barrels[i].shootingState = "no";
        }
      }
    }
    for (const i in playerlist[playerid].bodybarrels) {
      if (playerlist[playerid].bodybarrels[i].reloadRecover < animationTime / amountChangePerLoop) {
        animationTime = playerlist[playerid].bodybarrels[i].reloadRecover * amountChangePerLoop;
      }
      if (playerlist[playerid].bodybarrels[i].shootingState == "decreasing") {
        //if player just shot a bullet
        playerlist[playerid].bodybarrels[i].barrelHeightChange += amountChangePerLoop; //decrease barrel height
        if (playerlist[playerid].bodybarrels[i].barrelHeightChange >= animationTime) {
          //max barrel height reduction of 10
          playerlist[playerid].bodybarrels[i].shootingState = "increasing";
        }
      } else if (playerlist[playerid].bodybarrels[i].shootingState == "increasing") {
        playerlist[playerid].bodybarrels[i].barrelHeightChange -= amountChangePerLoop; //increase barrel height
        if (playerlist[playerid].bodybarrels[i].barrelHeightChange <= 0) {
          //if barrel is back to normal
          playerlist[playerid].bodybarrels[i].barrelHeightChange = 0;
          playerlist[playerid].bodybarrels[i].shootingState = "no";
        }
      }
    }
  }

  function addDeadObject(list, id, objtype, teleporting) {
    if (objtype == "bot") {
      //if this is a bot, reduce the number of bots in the variable
      if (list[id].hive == 1) {
        firstHive--;
      } else if (list[id].hive == 2) {
        secondHive--;
      } else if (list[id].hive == 3) {
        thirdHive--;
      } else if (list[id].hive == 4) {
        fourthHive--;
      } else if (list[id].hive == 5) {
        rockHive--;
      }
      //spawn 3 crashers when pursuers die
      if (list[id].name == "Pursuer") {
        for (let i = 0; i < 3; i++) {
          spawnBot(list[id].x, list[id].y, "Crasher", 3, 30, 300, 30, 0.05, 15, 1000, 3, {})
        }
      }
      else if (list[id].name == "Cluster") {
        spawnBot(list[id].x, list[id].y, "Champion", 5, 80, 10000, 200, 0.5, 15, 500, 3, {})
      }
    } else if (objtype == "player") {
      var thisclientip = findIpUsingId[id];//use ip, not id, cuz id changes when switching servers

      if (list[id].developer == "no" && !teleporting) {
        //if not a developer
        if (gamemode == "arena") {
          deadPlayers[thisclientip] = list[id].score; //add player score to permanent list of dead players so he can respawn next time with score
        }
        else {//send score to arena
          var packetToMainServer = ["deadplayer", process.env.teleportingPassword, list[id].score, thisclientip, list[id].gm];//send password to verify that this is an actual teleport
          axios.post(mainserverURL, packetToMainServer)
            .then(function(response) {
              //console.log(response);
              console.log("sent dead player")
            })
            .catch(function(error) {
              console.log("Connectivity error");
            });
        }
        checkIfNewWorldRecord(list[id]);
      }
      addHighScore(list[id], id);
    } else if (objtype == "bullet" && (list[id].bulletType == "drone" || list[id].bulletType == "minion")) {
      let barrelID = list[id].barrelId;
      if (list[id].AI == "yes") {
        //if have AI
        if (typeof list[id].owner.bodybarrels[barrelID] !== "undefined") {
          //prevent error when tank barrel changd or tank no longer exists
          if (list[id].owner.bodybarrels[barrelID].droneCount != 0) {//may happen if upgrade tank
            list[id].owner.bodybarrels[barrelID].droneCount--; //reduce drone count if it's a drone
          }
        }
      } else {
        if (typeof list[id].owner.barrels[barrelID] !== "undefined") {
          //prevent error when tank barrel changd or tank no longer exists
          if (list[id].owner.barrels[barrelID].droneCount != 0) {
            list[id].owner.barrels[barrelID].droneCount--; //reduce drone count if it's a drone
          }
        }
      }
      //remove drone from list of drones
      let droneArray = list[id].owner.dronesControlling;
      const droneindex = droneArray.indexOf(parseInt(id, 10)); //parseInt changes it to a number from a string
      if (droneindex > -1) {
        // only splice array when item is found
        list[id].owner.dronesControlling.splice(droneindex, 1); // 2nd parameter means remove one item only
      }
    } else if (objtype == "defbullet") {//base defender's bullet
      list[id].owner.droneCount--;
    }
  }

  function movePlayer(
    player,
    playerid,
    AIshapeDetect,
    AIplayerDetect,
    AIbotDetect,
    mapSize,
    shapeList,
    playerList,
    botList
  ) {
    if (player.autorotate == "yes") {//auto-rotate on
      player.angle += (2 * Math.PI / 180);//convert 2 degree from degree to radians
    } else if (player.fastautorotate == "yes") {//fast-auto-rotate on
      player.angle += (4 * Math.PI / 180);
    }

    //check whether player is moving in more than one direction
    let movingSpeed = player.speed; //default speed if player's speed
    if (player.amountAddWhenMoveX != 0 && player.amountAddWhenMoveY != 0) {
      movingSpeed = player.speed / Math.sqrt(2); //if moving in more than one direction, speed in X and Y axis becomes lesser so that overall speed remains the same
    }

    //player acceleration and deceleration
    if (player.amountAddWhenMoveX > 0) {
      //if player is moving right
      if (player.currentspeedX < movingSpeed) {
        //if current speed is not max speed
        if (player.currentspeedX < 0) {
          //if player recently changed direction
          player.currentspeedX = 0;
        }
        if (movingSpeed - player.currentspeedX >= accelerationIncrement) {
          player.currentspeedX += accelerationIncrement;
        } else {
          player.currentspeedX = movingSpeed;
        }
      }
    }
    if (player.amountAddWhenMoveY > 0) {
      //if player is moving down
      if (player.currentspeedY < movingSpeed) {
        //if current speed is not max speed
        if (player.currentspeedY < 0) {
          //if player recently changed direction
          player.currentspeedY = 0;
        }
        if (movingSpeed - player.currentspeedY >= accelerationIncrement) {
          player.currentspeedY += accelerationIncrement;
        } else {
          player.currentspeedY = movingSpeed;
        }
      }
    }
    if (player.amountAddWhenMoveX < 0) {
      //if player is moving left
      if (-player.currentspeedX < movingSpeed) {
        //if current speed is not max speed
        if (player.currentspeedX > 0) {
          //if player recently changed direction
          player.currentspeedX = 0;
        }
        if (player.currentspeedX + movingSpeed >= accelerationIncrement) {
          player.currentspeedX -= accelerationIncrement;
        } else {
          player.currentspeedX = -movingSpeed;
        }
      }
    }
    if (player.amountAddWhenMoveY < 0) {
      //if player is moving up
      if (-player.currentspeedY < movingSpeed) {
        //if current speed is not max speed
        if (player.currentspeedY > 0) {
          //if player recently changed direction
          player.currentspeedY = 0;
        }
        if (player.currentspeedY + movingSpeed >= accelerationIncrement) {
          player.currentspeedY -= accelerationIncrement;
        } else {
          player.currentspeedY = -movingSpeed;
        }
      }
    }
    if (player.amountAddWhenMoveX == 0) {
      //if player is not moving
      if (player.currentspeedX != 0) {
        if (player.currentspeedX > 0) {
          if (player.currentspeedX >= accelerationIncrement) {
            player.currentspeedX -= accelerationIncrement;
          } else {
            player.currentspeedX = 0;
          }
        } else {
          if (-player.currentspeedX >= accelerationIncrement) {
            player.currentspeedX += accelerationIncrement;
          } else {
            player.currentspeedX = 0;
          }
        }
      }
    }
    if (player.amountAddWhenMoveY == 0) {
      if (player.currentspeedY != 0) {
        if (player.currentspeedY > 0) {
          if (player.currentspeedY >= accelerationIncrement) {
            player.currentspeedY -= accelerationIncrement;
          } else {
            player.currentspeedY = 0;
          }
        } else {
          if (-player.currentspeedY >= accelerationIncrement) {
            player.currentspeedY += accelerationIncrement;
          } else {
            player.currentspeedY = 0;
          }
        }
      }
    }

    //check for collision with borders IF MOVE
    let upCollide = player.y + player.height + player.currentspeedY * delta;
    let rightCollide = player.x + player.width + player.currentspeedX * delta;
    let downCollide = player.y - player.height + player.currentspeedY * delta;
    let leftCollide = player.x - player.width + player.currentspeedX * delta;
    //check up and down collision
    if (upCollide <= mapSize && downCollide >= 0) {
      player.y = player.y + player.currentspeedY * delta; //move player
    } else {
      //stop movement for up and down
      player.currentspeedY = 0;
    }
    //check left and right collision
    if (rightCollide <= mapSize && leftCollide >= 0) {
      player.x = player.x + player.currentspeedX * delta; //move player
    } else {
      //stop movement for left and right
      player.currentspeedX = 0;
    }
    //check for collision if never move, this can happen if player is at edge of arena and arena become smaller due to less people
    let upCollides = player.y + player.height;
    let rightCollides = player.x + player.width;
    let downCollides = player.y - player.height;
    let leftCollides = player.x - player.width;
    if (upCollides >= mapSize) {
      player.y -= 10 * delta;
    }
    if (downCollides <= 0) {
      player.y += 10 * delta;
    }
    if (rightCollides >= mapSize) {
      player.x -= 10 * delta;
    }
    if (leftCollides <= 0) {
      player.x += 10 * delta;
    }

    //do spawn protection stuff
    if (player.spawnProtection < player.spawnProtectionDuration) {
      //if have spawn protection
      player.spawnProtection++;
    }
    if (
      player.spawnProtection < player.spawnProtectionDuration &&
      (player.currentspeedY != 0 || player.currentspeedX != 0)
    ) {
      //if have spawn protection and player is moving, turn it off
      player.spawnProtection = player.spawnProtectionDuration;
    }

    //rotate player towards nearest shape or player if it has AI, e.g. mono
    //thisfor player AI, bullet AI is in a separate code
    for (const barrelid in player.bodybarrels) {
      //body barrels have AI, not weapon barrels
      let barrel = player.bodybarrels[barrelid];
      if (barrel.barrelType != "aura") {
        //if it is an AI barrel and not an aura
        let nearestdist = -1;
        let nearestobj = "nothing";
        if (AIshapeDetect == "yes") {
          //if AI detection for shape is allowed for this location
          for (const shapeId in shapeList) {
            let a = shapeList[shapeId].x - player.x;
            let b = shapeList[shapeId].y - player.y;
            let c = Math.sqrt(a * a + b * b);
            if (c <= player.AIdetectRange) {
              if (nearestdist == -1) {
                nearestdist = c;
                nearestobj = shapeList[shapeId];
              } else {
                if (nearestdist > c) {
                  nearestdist = c;
                  nearestobj = shapeList[shapeId];
                }
              }
            }
          }
        }
        if (AIplayerDetect == "yes") {
          for (const playerId in playerList) {
            if (playerId != playerid) {
              //if players are not the same player
              let a = playerList[playerId].x - player.x;
              let b = playerList[playerId].y - player.y;
              let c = Math.sqrt(a * a + b * b);
              if (c <= player.AIdetectRange) {
                if (nearestdist == -1) {
                  nearestdist = c;
                  nearestobj = playerList[playerId];
                } else {
                  if (nearestdist > c) {
                    nearestdist = c;
                    nearestobj = playerList[playerId];
                  }
                }
              }
            }
          }
        }
        if (AIbotDetect == "yes") {
          for (const botId in botList) {
            let a = botList[botId].x - player.x;
            let b = botList[botId].y - player.y;
            let c = Math.sqrt(a * a + b * b);
            if (c <= player.AIdetectRange) {
              if (nearestdist == -1) {
                nearestdist = c;
                nearestobj = botList[botId];
              } else {
                if (nearestdist > c) {
                  nearestdist = c;
                  nearestobj = botList[botId];
                }
              }
            }
          }
        }
        if (nearestobj != "nothing" && nearestdist != -1) {
          //if there is a target
          barrel.shooting = "yes";
          player.AImousex = nearestobj.x;
          player.AImousey = nearestobj.y;
          //find angle towards nearest target, then convert to degrees and plus 90 to change axis so it is pointing correctly then change back to radians
          let angleToTarget =
            (((Math.atan2(nearestobj.y - player.y, nearestobj.x - player.x) /
              Math.PI) *
              180 +
              90) /
              180) *
            Math.PI;
          if (barrel.additionalAngle != angleToTarget) {
            //if player not facing target
            if (barrel.additionalAngle > angleToTarget) {
              barrel.additionalAngle -=
                (barrel.additionalAngle - angleToTarget) / 5; //rotate player based on difference between angles. The furthere away the distance, the faster the rotation
              if (barrel.additionalAngle - angleToTarget < 0.01) {
                //if distance is very small
                barrel.additionalAngle = angleToTarget;
              }
            } else {
              barrel.additionalAngle +=
                (angleToTarget - barrel.additionalAngle) / 5; //rotate player based on difference between angles. The furthere away the distance, the faster the rotation
              if (angleToTarget - barrel.additionalAngle < 0.01) {
                //if distance is very small
                barrel.additionalAngle = angleToTarget;
              }
            }
          }
          //old code where player immediately faced target instead of turning towards target
          //player.angle = (((Math.atan2(nearestobj.y - player.y, nearestobj.x - player.x) * 180) /Math.PI +90) *Math.PI) /180;
        } else {
          barrel.shooting = "no";
          player.AImousex = player.x;
          player.AImousey = player.y;
        }
      }
    }
  }

  function bulletAI(
    bulletlist,
    bulletid,
    AIshapeDetect,
    AIplayerDetect,
    AIbotDetect,
    shapeList,
    playerList,
    botList
  ) {
    //this is for bulletAI, player AI is the code above
    let bullet = bulletlist[bulletid];
    if (
      bullet.barrels &&
      bullet.owner.barrels.hasOwnProperty(bullet.barrelId)
    ) {
      //if bullet has barrel, e.g. mines, and player hasnt upgraded
      if (bullet.owner.barrels[bullet.barrelId].haveAI == "yes") {
        let nearestdist = -1;
        let nearestobj = "nothing";
        if (AIshapeDetect == "yes") {
          //if AI detection for shape is allowed for this location
          for (const shapeId in shapeList) {
            let a = shapeList[shapeId].x - bullet.x;
            let b = shapeList[shapeId].y - bullet.y;
            let c = Math.sqrt(a * a + b * b);
            if (c <= bullet.owner.barrels[bullet.barrelId].AIdetectRange) {
              if (nearestdist == -1) {
                nearestdist = c;
                nearestobj = shapeList[shapeId];
              } else {
                if (nearestdist > c) {
                  nearestdist = c;
                  nearestobj = shapeList[shapeId];
                }
              }
            }
          }
        }
        if (AIplayerDetect == "yes") {
          for (const playerId in playerList) {
            if (playerId != bullet.ownerId) {
              //if players are not the same player
              let a = playerList[playerId].x - bullet.x;
              let b = playerList[playerId].y - bullet.y;
              let c = Math.sqrt(a * a + b * b);
              if (c <= bullet.owner.barrels[bullet.barrelId].AIdetectRange) {
                if (nearestdist == -1) {
                  nearestdist = c;
                  nearestobj = playerList[playerId];
                } else {
                  if (nearestdist > c) {
                    nearestdist = c;
                    nearestobj = playerList[playerId];
                  }
                }
              }
            }
          }
        }
        if (AIbotDetect == "yes") {
          for (const botId in botList) {
            let a = botList[botId].x - bullet.x;
            let b = botList[botId].y - bullet.y;
            let c = Math.sqrt(a * a + b * b);
            if (c <= bullet.owner.barrels[bullet.barrelId].AIdetectRange) {
              if (nearestdist == -1) {
                nearestdist = c;
                nearestobj = botList[botId];
              } else {
                if (nearestdist > c) {
                  nearestdist = c;
                  nearestobj = botList[botId];
                }
              }
            }
          }
        }
        if (nearestobj != "nothing" && nearestdist != -1) {
          //if there is a target
          bullet.shooting = "yes";
          //find angle towards nearest target, then convert to degrees and plus 90 to change axis so it is pointing correctly, then change back to radians
          let angleToTarget =
            (((Math.atan2(nearestobj.y - bullet.y, nearestobj.x - bullet.x) *
              180) /
              Math.PI +
              90) *
              Math.PI) /
            180;

          for (const barrelId in bullet.barrels) {
            if (bullet.barrels[barrelId].additionalAngle != angleToTarget) {
              //if player not facing target
              if (bullet.barrels[barrelId].additionalAngle > angleToTarget) {
                bullet.barrels[barrelId].additionalAngle -=
                  (bullet.barrels[barrelId].additionalAngle - angleToTarget) /
                  5; //rotate player based on difference between angles. The furthere away the distance, the faster the rotation
                if (
                  bullet.barrels[barrelId].additionalAngle - angleToTarget <
                  0.01
                ) {
                  //if distance is very small
                  bullet.barrels[barrelId].additionalAngle = angleToTarget;
                }
              } else {
                bullet.barrels[barrelId].additionalAngle +=
                  (angleToTarget - bullet.barrels[barrelId].additionalAngle) /
                  5; //rotate player based on difference between angles. The furthere away the distance, the faster the rotation
                if (
                  angleToTarget - bullet.barrels[barrelId].additionalAngle <
                  0.01
                ) {
                  //if distance is very small
                  bullet.barrels[barrelId].additionalAngle = angleToTarget;
                }
              }
            }
          }
        } else {
          bullet.shooting = "no";
        }
      }
    }
  }
  function updateStatsSkillPoint(playerlist, id, skillPointArrayNumber) {
    //stat multipliers //upgrade points
    if (skillPointArrayNumber == 0) {
      //heal (delay + speed)
      playerlist[id].statMultiplier[skillPointArrayNumber] *= 1.05; //used only when upgrading
      playerlist[id].healthRegenTime *= 1.05; //change the actual current stat
      playerlist[id].healthRegenSpeed *= 1.05;
    } else if (skillPointArrayNumber == 1) {
      //max health
      playerlist[id].statMultiplier[skillPointArrayNumber] *= 1.05;
      playerlist[id].maxhealth *= 1.05;
    } else if (skillPointArrayNumber == 2) {
      //body damage
      playerlist[id].statMultiplier[skillPointArrayNumber] *= 1.05;
      playerlist[id].damage *= 1.05;
    } else if (skillPointArrayNumber == 3) {
      //bullet speed
      playerlist[id].statMultiplier[skillPointArrayNumber] *= 1.03//1.025;
      for (const barrel in playerlist[id].barrels) {
        playerlist[id].barrels[barrel].bulletSpeed *= 1.03//1.025;
      }
      for (const barrel in playerlist[id].bodybarrels) {
        playerlist[id].bodybarrels[barrel].bulletSpeed *= 1.03//1.025;
      }
    } else if (skillPointArrayNumber == 4) {
      //bullet damage
      playerlist[id].statMultiplier[skillPointArrayNumber] *= 1.05;
      for (const barrel in playerlist[id].barrels) {
        playerlist[id].barrels[barrel].bulletDamage *= 1.05;
      }
      for (const barrel in playerlist[id].bodybarrels) {
        playerlist[id].bodybarrels[barrel].bulletDamage *= 1.05;
      }
    } else if (skillPointArrayNumber == 5) {
      //weapon reload
      playerlist[id].statMultiplier[skillPointArrayNumber] /= 1.05;
      for (const barrel in playerlist[id].barrels) {
        playerlist[id].barrels[barrel].reloadRecover /= 1.05;
      }
      for (const barrel in playerlist[id].bodybarrels) {
        playerlist[id].bodybarrels[barrel].reloadRecover /= 1.05;
      }
    } else if (skillPointArrayNumber == 6) {
      //movement speed
      playerlist[id].statMultiplier[skillPointArrayNumber] *= 1.015;
      playerlist[id].speed *= 1.015;
    } else if (skillPointArrayNumber == 7) {
      //FoV
      playerlist[id].statMultiplier[skillPointArrayNumber] *= 1.0225//1.025;
      playerlist[id].fovMultiplier *= 1.0225//1.025;
    }
  }
  function playerLevel(playerlist, id) {
    //exponential equation used for calculating score needed for each level: 1.05^x * 9000 - 9000, round down. if change the exponential equation, also change on client side for drawing score bar
    const player = playerlist[id];
    if (player.score > 0) {
      //if score more than 0
      if (
        Math.floor(Math.log((player.score + 9000) / 9000) / Math.log(1.06)) >
        player.level
      ) {
        //check if player's level increased based on exponential equation
        player.level++;
        //add skill point for certain levels:
        let skillPointsList = [
          1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72, 74, 76, 78, 80, 82, 84, 86, 88, 90, 92, 94, 96, 98, 100, 102, 104, 106, 108, 110, 112, 114, 116, 118, 120, 122, 124, 126, 128, 130, 132, 134, 136, 138, 140, 142, 144, 146, 148, 150, 152, 154, 156, 158, 160, 162, 164, 166, 168, 170, 172, 174, 176, 178, 180, 182, 184, 186, 188, 190, 192, 194, 196, 198, 200, 202, 204, 206, 208, 210,
        ]; //levels which you can upgrade
        if (skillPointsList.includes(player.level)) {
          player.unusedPoints++;
        }
        if (player.level <= 160) {
          //size dont increase if player level is more than 160
          let sizeGrowthPerLevel = 0.25;
          player.width += sizeGrowthPerLevel; //increase player size
          player.height += sizeGrowthPerLevel;
          player.fovMultiplier += fovincrease;
          for (const barrel in player.barrels) {
            player.barrels[barrel].barrelHeight =
              player.barrels[barrel].barrelHeight *
              (player.height / (player.height - sizeGrowthPerLevel)); //height of barrel grows proportional to body
            player.barrels[barrel].barrelWidth =
              (player.barrels[barrel].barrelWidth * player.width) /
              (player.width - sizeGrowthPerLevel); //width of barrel grows as specified in code, because if it grows proportional to the body, there will be problems with the new location of the barrels for tanks like twin tank
            player.barrels[barrel].x =
              player.width * player.barrels[barrel].barrelMoveIncrement;
          }
          for (const barrel in player.bodybarrels) {
            player.bodybarrels[barrel].barrelHeight =
              player.bodybarrels[barrel].barrelHeight *
              (player.height / (player.height - sizeGrowthPerLevel)); //height of barrel grows proportional to body
            player.bodybarrels[barrel].barrelWidth =
              (player.bodybarrels[barrel].barrelWidth * player.width) /
              (player.width - sizeGrowthPerLevel); //width of barrel grows as specified in code, because if it grows proportional to the body, there will be problems with the new location of the barrels for tanks like twin tank
            player.bodybarrels[barrel].x =
              player.width * player.bodybarrels[barrel].barrelMoveIncrement;
            if (player.bodybarrels[barrel].hasOwnProperty("y")) {
              //aura need y value
              player.bodybarrels[barrel].y =
                player.width * player.bodybarrels[barrel].barrelMoveIncrementY;
            }
          }
        }
        if (player.level == 100) {
          if (player.tankType == "basic" && player.bodyType == "node") {
            //achievement for level 100 with no upgrades
            addAchievement(playerlist, id, 9, 300);
          }
        }
      }
      if (player.score > 100000000) {
        //achievement for 100m score
        addAchievement(playerlist, id, 6, 150);
      } else if (player.score > 10000000) {
        //achievement for 10m score
        addAchievement(playerlist, id, 5, 75);
      } else if (player.score > 1000000) {
        //achievement for 1m score
        addAchievement(playerlist, id, 4, 50);
      }
    }
  }
  function playerBotCollide(playerList, id) {
    if (
      playerList[id].spawnProtection >= playerList[id].spawnProtectionDuration
    ) {
      //if player dont have spawn protection
      //get nearby bots from quadtree list
      let elements = botTree.retrieve({
        x: playerList[id].x - playerList[id].width,
        y: playerList[id].y - playerList[id].width,
        width: playerList[id].width * 2,
        height: playerList[id].width * 2,
      });
      elements.forEach((thing) => {
        let dunebotId = thing.id;
        if (
          playerList.hasOwnProperty(id) &&
          bots.hasOwnProperty(dunebotId)
        ) {
          //check if dunebot still exists as might have been killed previously in this loop
          let DistanceBetween = Math.sqrt(
            (playerList[id].x - bots[dunebotId].x) *
            (playerList[id].x - bots[dunebotId].x) +
            (playerList[id].y - bots[dunebotId].y) *
            (playerList[id].y - bots[dunebotId].y)
          ); //calculate distance between center of bullet and center of dunebot, dunebot treated as a circle
          if (
            DistanceBetween <=
            playerList[id].width + bots[dunebotId].width
          ) {
            //crashed
            playerList[id].hit++;
            playerList[id].health -= bots[dunebotId].damage;
            playerList[id].healthRegenTimeChange =
              playerList[id].healthRegenTime; //reset time to next health regeneration
            bots[dunebotId].hit++;
            bots[dunebotId].health -= playerList[id].damage;
            var anglehit = Math.atan2(
              playerList[id].y - bots[dunebotId].y,
              playerList[id].x - bots[dunebotId].x
            );
            //move the player away from bot
            playerList[id].x += Math.cos(anglehit) * DistanceBetween / 20 * delta;
            playerList[id].y += Math.sin(anglehit) * DistanceBetween / 20 * delta;

            if (bots[dunebotId].name == "Leech") {
              //lifesteal: gains health based on damage dealt
              bots[dunebotId].health += bots[dunebotId].damage * 10;
            } else if (bots[dunebotId].name == "Grower") {//removed from game
              //grows when deal damage
              if (bots[dunebotId].width < 300) {
                //size limit
                bots[dunebotId].width += 1;
                bots[dunebotId].height += 1;
              }
            }

            //check if player attacked this bot before
            let attackedBotBefore = "no";
            for (const attackerid in bots[dunebotId].attackers) {
              if (bots[dunebotId].attackers[attackerid] == playerList[id]) {
                attackedBotBefore = "yes";
              }
            }
            if (attackedBotBefore == "no") {
              //if havent attacked shape before, add player to list of people who attacked the shape
              bots[dunebotId].attackers[id] = playerList[id];
            }

            if (playerList[id].health <= 0) {
              //playre died
              bots[dunebotId].score += playerList[id].score;
              var packet = JSON.stringify(["youDied",
                bots[dunebotId].name,
                playerList[id],
                respawnScoreDivision,
                respawnScoreLimit]);
              lookup[id].send(packet);
              addDeadObject(playerList, id, "player");
              delete playerList[id];
            }
          }
        }
      });
    }
  }

  function moveShape(id, shapelist) {
    //check for collision with borders
    let upCollides = shapelist[id].y + shapelist[id].height;
    let rightCollides = shapelist[id].x + shapelist[id].width;
    let downCollides = shapelist[id].y - shapelist[id].height;
    let leftCollides = shapelist[id].x - shapelist[id].width;
    if (upCollides >= gameSize) {
      shapelist[id].centerOfRotationY -= 5 * delta;
    }
    if (downCollides <= 0) {
      shapelist[id].centerOfRotationY += 5 * delta;
    }
    if (rightCollides >= gameSize) {
      shapelist[id].centerOfRotationX -= 5 * delta;
    }
    if (leftCollides <= 0) {
      shapelist[id].centerOfRotationX += 5 * delta;
    }

    //move shape in cicular path
    shapelist[id].motionAngle += shapelist[id].speed; //add angle to move the shape
    shapelist[id].x =
      shapelist[id].centerOfRotationX +
      Math.cos(shapelist[id].motionAngle) * shapelist[id].pathRadius;
    shapelist[id].y =
      shapelist[id].centerOfRotationY +
      Math.sin(shapelist[id].motionAngle) * shapelist[id].pathRadius;
    //make shape rotate
    shapelist[id].angle += shapelist[id].rotateSpeed;
    //if shape no health, give score to everyone who dealed damage to it, and then remove the shape
    if (shapelist[id].health <= 0) {
      let scoreToGive = Math.round(
        shapelist[id].score / Object.keys(shapelist[id].attackers).length
      ); //split score among all killers
      for (let attackerid in shapelist[id].attackers) {
        shapelist[id].attackers[attackerid].score += scoreToGive;

        //give achievements
        if (shapelist[id].hasOwnProperty("red")) {
          //if it is a radiant shape
          if (players.hasOwnProperty(attackerid)) {
            //check if the attacker is a player
            //add radiant killer achievement to player's account
            addAchievement(players, attackerid, 3, 35);
          }
        }
        if (shapelist[id].sides >= 10) {
          //if shape have 10 or more sides
          if (players.hasOwnProperty(attackerid)) {
            //check if the attacker is a player
            //add bomber achievement to player's account
            addAchievement(players, attackerid, 8, 50);
          }
        }
      }
      addDeadObject(shapelist, id, "shape");
      delete shapelist[id];
    } else {
      //check for collision with other shapes
      //get nearby shapes from quadtree list
      var elements = shapeTree.retrieve({
        x: shapelist[id].x - shapelist[id].width,
        y: shapelist[id].y - shapelist[id].width,
        width: shapelist[id].width * 2,
        height: shapelist[id].width * 2,
      });
      elements.forEach((thing) => {
        let shapeId = thing.id;
        if (shapelist.hasOwnProperty(shapeId)) {
          //if shape still alive
          let DistanceBetween = Math.sqrt(
            (shapelist[id].x - shapelist[shapeId].x) *
            (shapelist[id].x - shapelist[shapeId].x) +
            (shapelist[id].y - shapelist[shapeId].y) *
            (shapelist[id].y - shapelist[shapeId].y)
          ); //calculate distance between center of bullet and center of shape, shape treated as a circle
          //below check if id not equal shapeId not make sure that the shapes are not the same shape
          if (
            DistanceBetween <= shapelist[id].width + shapelist[shapeId].width &&
            id != shapeId
          ) {
            //crashed
            if (shapelist[id].weight <= shapelist[shapeId].weight) {
              //if this shape is lighter or same mass
              //only do if shape id less than other shape to ensure that this collision detection doesn't happen twice
              let anglehit = Math.atan2(
                shapelist[id].y - shapelist[shapeId].y,
                shapelist[id].x - shapelist[shapeId].x
              );
              //the above calculates the angle between shapes and move one of them
              let speedMove =
                shapelist[id].width +
                shapelist[shapeId].width -
                DistanceBetween; //smaller number means move slower
              shapelist[id].centerOfRotationX +=
                Math.cos(anglehit) * speedMove * delta;
              shapelist[id].centerOfRotationY +=
                Math.sin(anglehit) * speedMove * delta;
            }
          }
        }
      });
    }
  }
  function radiantShapes(objList, id) {//radiant shape colors are now on client code to reduce lag, but this is still needed for cavern portals
    if (objList[id].hasOwnProperty("red")) {
      //if shape is radiant
      let animationSpeed = 2;
      if (objList[id].rgbstate == 0) {
        objList[id].rgbstate = 1;
      } else if (objList[id].rgbstate == 1) {
        if (objList[id].red > 200) {
          objList[id].red -= animationSpeed;
        }
        objList[id].green += animationSpeed;
        if (objList[id].green >= 150) {
          objList[id].rgbstate = 2; //change to next state
        }
      } else if (objList[id].rgbstate == 2) {
        objList[id].blue += animationSpeed;
        if (objList[id].green > 0) {
          objList[id].green -= animationSpeed;
        }
        if (objList[id].red > 0) {
          objList[id].red -= animationSpeed;
        }
        if (objList[id].blue >= 200) {
          objList[id].rgbstate = 3; //change state
        }
      } else if (objList[id].rgbstate == 3) {
        objList[id].blue -= animationSpeed;
        objList[id].red += animationSpeed;
        if (objList[id].blue <= 0 && objList[id].red >= 255) {
          objList[id].rgbstate = 1; //change state
          objList[id].red = 255;
          objList[id].blue = 0;
        }
      }
    }
  }
  function playerWithMaze(playerlist, playerid, type) {
    var wallelements = mazewallTree.retrieve({
      x: playerlist[playerid].x - playerlist[playerid].width,
      y: playerlist[playerid].y - playerlist[playerid].width,
      width: playerlist[playerid].width * 2,
      height: playerlist[playerid].width * 2,
    });
    for (const id in wallelements) {
      if (playerlist.hasOwnProperty(playerid)) {
        //collision detection for a circle with a rectangle
        var testX = playerlist[playerid].x;
        var testY = playerlist[playerid].y;
        //check which maze edge is closest
        if (playerlist[playerid].x < wallelements[id].x) {
          testX = wallelements[id].x; //left edge
          var sideCollide = "left";
        } else if (
          playerlist[playerid].x >
          wallelements[id].x + wallelements[id].width
        ) {
          //width refers to total width
          testX = wallelements[id].x + wallelements[id].width; // right edge
          var sideCollide = "right";
        }
        if (playerlist[playerid].y < wallelements[id].y) {
          testY = wallelements[id].y; // top edge
          var sideCollide = "top";
        } else if (
          playerlist[playerid].y >
          wallelements[id].y + wallelements[id].height
        ) {
          testY = wallelements[id].y + wallelements[id].height; // bottom edge
          var sideCollide = "bottom";
        }
        // get distance from closest edges
        var distX = playerlist[playerid].x - testX;
        var distY = playerlist[playerid].y - testY;
        var distance = Math.sqrt(distX * distX + distY * distY);

        // if the distance is less than the radius, collision!
        if (distance <= playerlist[playerid].width) {
          //collided
          if (type == "bullet") {
            if (playerlist[playerid].bulletType == "bullet") {//delete bullet that touch walls
              addDeadObject(playerlist, playerid, "bullet");
              delete playerlist[playerid];
            }
            else if (playerlist[playerid].bulletType != "aura") {//traps, mines, drones
              var amountToMove = playerlist[playerid].width - distance;
              if (sideCollide == "left") {
                playerlist[playerid].x -= amountToMove;
              }
              else if (sideCollide == "right") {
                playerlist[playerid].x += amountToMove;
              }
              else if (sideCollide == "top") {
                playerlist[playerid].y -= amountToMove;
              }
              else if (sideCollide == "bottom") {
                playerlist[playerid].y += amountToMove;
              }
            }
          }
          else if (type == "player") {
            var amountToMove = playerlist[playerid].width - distance;
            if (sideCollide == "left") {
              playerlist[playerid].x -= amountToMove;
            }
            else if (sideCollide == "right") {
              playerlist[playerid].x += amountToMove;
            }
            else if (sideCollide == "top") {
              playerlist[playerid].y -= amountToMove;
            }
            else if (sideCollide == "bottom") {
              playerlist[playerid].y += amountToMove;
            }
          }
          else if (type == "shape") {
            var amountToMove = (playerlist[playerid].width - distance) / 5;//smoothly move away from wall, prevent vibrating for large shapes
            if (sideCollide == "left") {
              playerlist[playerid].centerOfRotationX -= amountToMove;
            }
            else if (sideCollide == "right") {
              playerlist[playerid].centerOfRotationX += amountToMove;
            }
            else if (sideCollide == "top") {
              playerlist[playerid].centerOfRotationY -= amountToMove;
            }
            else if (sideCollide == "bottom") {
              playerlist[playerid].centerOfRotationY += amountToMove;
            }
          }
        }
      }
    }
  }
  function moveBullet(
    bulletList,
    bulletId,
    collisionDetectShape,
    collisionDetectPlayer,
    collisionDetectBullet,
    collisionDetectBot,
    mapSize,
    playerlist,
    shapelist,
  ) {
    //move bullets
    if (bulletList[bulletId].bulletType != "drone" && bulletList[bulletId].bulletType != "minion") {
      //if not drone
      bulletList[bulletId].y += Math.sin(bulletList[bulletId].moveAngle - 0.5 * Math.PI) * bulletList[bulletId].amountAddWhenMove * delta;
      bulletList[bulletId].x += Math.cos(bulletList[bulletId].moveAngle - 0.5 * Math.PI) * bulletList[bulletId].amountAddWhenMove * delta;
    } else {
      if (bulletList[bulletId].bulletType == "minion") {//minion shoot bullets
        spawnBullets(bulletId, bulletList, bulletList, gamemode);

        var mousePositionOnCanvasX =
          bulletList[bulletId].owner.x - bulletList[bulletId].owner.mousex;
        var mousePositionOnCanvasY =
          bulletList[bulletId].owner.y - bulletList[bulletId].owner.mousey;
        var distFromMouse = Math.sqrt(
          (mousePositionOnCanvasX - bulletList[bulletId].x) *
          (mousePositionOnCanvasX - bulletList[bulletId].x) +
          (mousePositionOnCanvasY - bulletList[bulletId].y) *
          (mousePositionOnCanvasY - bulletList[bulletId].y)
        );

        if (distFromMouse < bulletList[bulletId].minDist) {//minion too near to mouse
          var droneangle = Math.atan2(
            mousePositionOnCanvasY - bulletList[bulletId].y,
            mousePositionOnCanvasX - bulletList[bulletId].x
          );
          if ((bulletList[bulletId].minDist - distFromMouse) < bulletList[bulletId].amountAddWhenMove) {
            var speed = bulletList[bulletId].minDist - distFromMouse;
          }
          else {
            var speed = bulletList[bulletId].amountAddWhenMove;
          }
          bulletList[bulletId].y +=
            Math.round(
              Math.sin(droneangle - Math.PI) *
              speed
            ) * delta;
          bulletList[bulletId].x +=
            Math.round(
              Math.cos(droneangle - Math.PI) *
              speed
            ) * delta;
          bulletList[bulletId].moveAngle = droneangle - Math.PI; //change drone angle
        }
      }
      //if it is a drone
      if (bulletList[bulletId].AI == "no") {
        var mousePositionOnCanvasX =
          bulletList[bulletId].owner.x - bulletList[bulletId].owner.mousex;
        var mousePositionOnCanvasY =
          bulletList[bulletId].owner.y - bulletList[bulletId].owner.mousey;
      } else {
        var mousePositionOnCanvasX = bulletList[bulletId].owner.AImousex;
        var mousePositionOnCanvasY = bulletList[bulletId].owner.AImousey;
      }
      var droneangle = Math.atan2(
        mousePositionOnCanvasY - bulletList[bulletId].y,
        mousePositionOnCanvasX - bulletList[bulletId].x
      );
      var droneDistanceFromMouseWhenIdle = 1.5; //relative to drone size
      if (
        (bulletList[bulletId].y != mousePositionOnCanvasY ||
          bulletList[bulletId].x != mousePositionOnCanvasX) &&
        (bulletList[bulletId].owner.droneMode == "moving" ||
          (bulletList[bulletId].owner.droneMode == "repel" &&
            bulletList[bulletId].AI == "yes")) &&
        (bulletList[bulletId].bulletType != "minion" || distFromMouse > bulletList[bulletId].minDist)
      ) {
        //if drone not at mouse position
        //if drone have not reached the mouse and is moving towards it
        bulletList[bulletId].y +=
          Math.round(
            Math.sin(droneangle) * bulletList[bulletId].amountAddWhenMove
          ) * delta;
        bulletList[bulletId].x +=
          Math.round(
            Math.cos(droneangle) * bulletList[bulletId].amountAddWhenMove
          ) * delta;
        bulletList[bulletId].moveAngle = droneangle; //change drone angle
        var distFromMouse = Math.sqrt(
          (mousePositionOnCanvasX - bulletList[bulletId].x) *
          (mousePositionOnCanvasX - bulletList[bulletId].x) +
          (mousePositionOnCanvasY - bulletList[bulletId].y) *
          (mousePositionOnCanvasY - bulletList[bulletId].y)
        );
        if (distFromMouse <= bulletList[bulletId].amountAddWhenMove) {
          //if very near to mouse
          bulletList[bulletId].y = mousePositionOnCanvasY;
          bulletList[bulletId].x = mousePositionOnCanvasX;
        }
      } else if (
        (bulletList[bulletId].y != mousePositionOnCanvasY ||
          bulletList[bulletId].x != mousePositionOnCanvasX) &&
        bulletList[bulletId].owner.droneMode == "repel"
      ) {
        //if drone is repelling
        //if drone have not reached the mouse and is repelling away
        if (bulletList[bulletId].AI == "no") {
          //if not AI
          bulletList[bulletId].y +=
            Math.round(
              Math.sin(droneangle - Math.PI) *
              bulletList[bulletId].amountAddWhenMove
            ) * delta;
          bulletList[bulletId].x +=
            Math.round(
              Math.cos(droneangle - Math.PI) *
              bulletList[bulletId].amountAddWhenMove
            ) * delta;
          bulletList[bulletId].moveAngle = droneangle - Math.PI; //change drone angle
        }
      } else {
        //drone reached mouse
        //make the drone spread out around the mouse
        var totalDroneCount = 0;
        for (var barrelID in bulletList[bulletId].owner.barrels) {
          //for each barrel
          if (
            bulletList[bulletId].owner.barrels[barrelID].hasOwnProperty(
              "droneLimit"
            )
          ) {
            totalDroneCount +=
              bulletList[bulletId].owner.barrels[barrelID].droneLimit;
          }
        }
        for (var barrelID in bulletList[bulletId].owner.bodybarrels) {
          //for each barrel
          if (
            bulletList[bulletId].owner.bodybarrels[barrelID].hasOwnProperty(
              "droneLimit"
            )
          ) {
            totalDroneCount +=
              bulletList[bulletId].owner.bodybarrels[barrelID].droneLimit;
          }
        }
        var droneIndex = bulletList[bulletId].owner.dronesControlling.indexOf(
          parseInt(bulletId, 10)
        ); //parseInt change it from string to number
        var circularAngle = (360 / totalDroneCount) * droneIndex;
        //move it to a distance away from the mouse, so all the drones form a circle around the mouse
        //calculate the position
        var posx = Math.round(
          Math.cos((circularAngle * Math.PI) / 180) *
          bulletList[bulletId].width *
          droneDistanceFromMouseWhenIdle +
          mousePositionOnCanvasX
        );
        var posy = Math.round(
          Math.sin((circularAngle * Math.PI) / 180) *
          bulletList[bulletId].width *
          droneDistanceFromMouseWhenIdle +
          mousePositionOnCanvasY
        );
        var posangle = Math.atan2(
          mousePositionOnCanvasY - bulletList[bulletId].y,
          mousePositionOnCanvasX - bulletList[bulletId].x
        ); //angle that drone is pointing
        if (bulletList[bulletId].y != posy || bulletList[bulletId].x != posx) {
          //if drone not at idle position
          //get angle of current position to the above position, and move drone towards it
          var idleangle = Math.atan2(
            posy - bulletList[bulletId].y,
            posx - bulletList[bulletId].x
          );
          //move the drone towards that position
          bulletList[bulletId].y +=
            Math.round(
              Math.sin(idleangle) * bulletList[bulletId].amountAddWhenMove
            ) * delta;
          bulletList[bulletId].x +=
            Math.round(
              Math.cos(idleangle) * bulletList[bulletId].amountAddWhenMove
            ) * delta;
          var distFromIdle = Math.sqrt(
            (posx - bulletList[bulletId].x) * (posx - bulletList[bulletId].x) +
            (posy - bulletList[bulletId].y) * (posy - bulletList[bulletId].y)
          );
          if (distFromIdle <= bulletList[bulletId].amountAddWhenMove) {
            //if very near to idle position
            bulletList[bulletId].y = posy;
            bulletList[bulletId].x = posx;
          }
        }
        bulletList[bulletId].moveAngle = posangle;
        bulletList[bulletId].owner.droneMode = "idle"; //set state to idle. this will be changed if mouse moves
      }
    }
    if (bulletList[bulletId].bulletType == "minion") {
      bulletList[bulletId].moveAngle = 0;
      for (let barid in bulletList[bulletId].barrels) {
        bulletList[bulletId].barrels[barid].additionalAngle = (((Math.atan2(bulletList[bulletId].owner.y - bulletList[bulletId].owner.mousey - bulletList[bulletId].y, bulletList[bulletId].owner.x - bulletList[bulletId].owner.mousex - bulletList[bulletId].x) *
          180) /
          Math.PI +
          90) *
          Math.PI) /
          180;
      }
    }
    bulletList[bulletId].timer--;
    if (bulletList[bulletId].growth == "yes") {
      //bullet growth
      bulletList[bulletId].width++;
      bulletList[bulletId].height++;
    }
    //if the bulletList[bulletId] is a trap
    if (
      bulletList[bulletId].bulletType == "trap" ||
      bulletList[bulletId].bulletType == "mine"
    ) {
      bulletList[bulletId].dist--;
      if (bulletList[bulletId].dist <= 10) {
        //distance for decelerating
        //stop trap from moving anymore
        bulletList[bulletId].amountAddWhenMove /= 1.1; //the smaller the number, the slower the deceleration.
        if (bulletList[bulletId].amountAddWhenMove < 0.01) {
          //very slow movement
          bulletList[bulletId].amountAddWhenMove = 0; //stop movement
        }
      }
      if (bulletList[bulletId].bulletType == "mine") {
        spawnBullets(bulletId, bulletList, bulletList, gamemode);
      }
    } else if (bulletList[bulletId].bulletType == "aura") {
      var barrel = bulletList[bulletId].owner.bodybarrels[bulletList[bulletId].barrelId];
      if (typeof barrel !== "undefined" && barrel.barrelType == "aura") {
        //make aura face tank direction, neccessary for tanks such as heliosphere
        bulletList[bulletId].x =
          bulletList[bulletId].owner.x +
          barrel.x *
          Math.cos(
            bulletList[bulletId].owner.angle -
            Math.PI / 2 +
            barrel.additionalAngle
          ) +
          barrel.y *
          Math.cos(bulletList[bulletId].owner.angle + barrel.additionalAngle);
        bulletList[bulletId].y =
          bulletList[bulletId].owner.y +
          barrel.x *
          Math.sin(
            bulletList[bulletId].owner.angle -
            Math.PI / 2 +
            barrel.additionalAngle
          ) +
          barrel.y *
          Math.sin(bulletList[bulletId].owner.angle + barrel.additionalAngle);
        //make aura grow when player grows
        bulletList[bulletId].width = bulletList[bulletId].owner.width * barrel.auraSize;
        bulletList[bulletId].height = bulletList[bulletId].owner.height * barrel.auraSize;
        if (barrel.auraID != bulletId) {//if barrel removed or barrel no longer an aura e.g. upgrade tank
          addDeadObject(bulletList, bulletId, "bullet");
          delete bulletList[bulletId];
        }
      }
      else {//barrel no longer exists, remove old aura
        addDeadObject(bulletList, bulletId, "bullet");
        delete bulletList[bulletId];
      }
    }
    //check if passive mode turned on
    if (
      bulletList[bulletId].owner.passive == "yes" &&
      bulletList[bulletId].passive != "yes"
    ) {
      bulletList[bulletId].passive = "yes";
    } else if (
      bulletList[bulletId].owner.passive == "no" &&
      bulletList[bulletId].passive != "no"
    ) {
      bulletList[bulletId].passive = "no";
    }
    //next, check for collision with borders
    var upCollide = bulletList[bulletId].y + bulletList[bulletId].height;
    var rightCollide = bulletList[bulletId].x + bulletList[bulletId].width;
    var downCollide = bulletList[bulletId].y - bulletList[bulletId].height;
    var leftCollide = bulletList[bulletId].x - bulletList[bulletId].width;
    if (
      (upCollide >= mapSize ||
        downCollide <= 0 ||
        rightCollide >= mapSize ||
        leftCollide <= 0) &&
      bulletList[bulletId].bulletType != "aura" &&
      bulletList[bulletId].bulletType != "bullet"
    ) {//this loop is meant for non bullets and non auras
      //separate from the if and else if statements below so that timers and stuff still can run
      //for drones traps mines minions etc.
      if (upCollide >= mapSize) {
          bulletList[bulletId].y -= (upCollide - mapSize);
        }
        if (downCollide <= 0) {
          bulletList[bulletId].y += (0 - downCollide);
        }
        if (rightCollide >= mapSize) {
          bulletList[bulletId].x -= (rightCollide - mapSize);
        }
        if (leftCollide <= 0) {
          bulletList[bulletId].x += (0 - leftCollide);
        }
    }

    if (
      (upCollide >= mapSize ||
        downCollide <= 0 ||
        rightCollide >= mapSize ||
        leftCollide <= 0) &&
      bulletList[bulletId].bulletType == "bullet"
    ) {
      //remove bulletList[bulletId] if touch sides of arena AND it is not an aura
      addDeadObject(bulletList, bulletId, "bullet");
      delete bulletList[bulletId];//delete bullet
    } else if (
      (bulletList[bulletId].health <= 0 ||
        bulletList[bulletId].timer <= 0) && (bulletList[bulletId].bulletType != "aura" || !players.hasOwnProperty(bulletList[bulletId].ownerId))
    ) { //dont remove aura unless parent tank does not exist
      //if bulletList[bulletId] no more health or already moved the max distance
      //remove bulletList[bulletId]
      addDeadObject(bulletList, bulletId, "bullet");
      delete bulletList[bulletId];
    } else if ((bulletList[bulletId].bulletType == "drone" || bulletList[bulletId].bulletType == "minion") && !bulletList[bulletId].owner.dronesControlling.includes(Number(bulletId))) {
      //outdated minion or drone due to upgrading tank
      //need to use Number to convert string id to number
      addDeadObject(bulletList, bulletId, "bullet");
      delete bulletList[bulletId];
    } else if (bulletList[bulletId].passive == "no") {
      //if never crash with borders, and passive mode off, check for collision with shapes and players
      if (collisionDetectShape == "yes") {
        //get elements near object (quadtree)
        var elements = shapeTree.retrieve({
          x: bulletList[bulletId].x - bulletList[bulletId].width,
          y: bulletList[bulletId].y - bulletList[bulletId].width,
          width: bulletList[bulletId].width * 2,
          height: bulletList[bulletId].width * 2,
        });
        elements.forEach((thing) => {
          var shapeId = thing.id;
          if (shapelist.hasOwnProperty(shapeId)) {
            //if shape still alive
            var DistanceBetween = Math.sqrt(
              (bulletList[bulletId].x - shapelist[shapeId].x) *
              (bulletList[bulletId].x - shapelist[shapeId].x) +
              (bulletList[bulletId].y - shapelist[shapeId].y) *
              (bulletList[bulletId].y - shapelist[shapeId].y)
            ); //calculate distance between center of bulletList[bulletId] and center of shape, shape treated as a circle
            if (
              DistanceBetween <=
              bulletList[bulletId].width + shapelist[shapeId].width
            ) {
              //crashed
              if (bulletList[bulletId].knockback == "yes") {
                shapelist[shapeId].centerOfRotationY +=
                  Math.sin(
                    (((bulletList[bulletId].moveAngle * 180) / Math.PI - 90) *
                      Math.PI) /
                    180
                  ) * 0.5;
                shapelist[shapeId].centerOfRotationX +=
                  Math.cos(
                    (((bulletList[bulletId].moveAngle * 180) / Math.PI - 90) *
                      Math.PI) /
                    180
                  ) * 0.5;
                //knockback's bullets push shapes backwards by 0.5
              }
              if (bulletList[bulletId].suction == "yes") {
                var anglehit = Math.atan2(
                  bulletList[bulletId].y - shapelist[shapeId].y,
                  bulletList[bulletId].x - shapelist[shapeId].x
                );
                var speedMove = 5 * (1 - shapelist[shapeId].weight); //smaller number means move slower
                shapelist[shapeId].centerOfRotationX +=
                  Math.cos(anglehit) * speedMove * delta;
                shapelist[shapeId].centerOfRotationY +=
                  Math.sin(anglehit) * speedMove * delta;
                //juggernaut's aura suction
              }
              if (bulletList[bulletId].bulletType == "trap" || bulletList[bulletId].bulletType == "mine" || bulletList[bulletId].bulletType == "drone" || bulletList[bulletId].bulletType == "minion") {
                var anglehit = Math.atan2(
                  bulletList[bulletId].y - shapelist[shapeId].y,
                  bulletList[bulletId].x - shapelist[shapeId].x
                );
                bulletList[bulletId].x +=
                  Math.cos(anglehit) * DistanceBetween / 30 * delta;
                bulletList[bulletId].y +=
                  Math.sin(anglehit) * DistanceBetween / 30 * delta;
              }
              shapelist[shapeId].hit++;
              bulletList[bulletId].hit++;
              shapelist[shapeId].health -= bulletList[bulletId].damage; //shape damaged
              //bulletList[bulletId].health -= shapelist[shapeId].damage;
              bulletList[bulletId].health -= bulletList[bulletId].penetration;
              //bulletList[bulletId] also damaged

              //check if player attacked this shape before
              var attackedShapeBefore = "no";
              for (const attackerid in shapelist[shapeId].attackers) {
                if (
                  shapelist[shapeId].attackers[attackerid] ==
                  bulletList[bulletId].owner
                ) {
                  attackedShapeBefore = "yes";
                }
              }
              if (attackedShapeBefore == "no") {
                //if havent attacked shape before, add player to list of people who attacked the shape
                shapelist[shapeId].attackers[bulletList[bulletId].ownerId] =
                  bulletList[bulletId].owner;
              }
            }
          }
        });
      }
      if (collisionDetectPlayer == "yes") {
        //player deetction coed doesnt use quadtree because it doesnt lag a lot
        //get nearby players from quadtree list
        var elements = playerTree.retrieve({
          x: bulletList[bulletId].x - bulletList[bulletId].width,
          y: bulletList[bulletId].y - bulletList[bulletId].width,
          width: bulletList[bulletId].width * 2,
          height: bulletList[bulletId].width * 2,
        });
        elements.forEach((thing) => {
          var playerId = thing.id;
          if (playerlist.hasOwnProperty(playerId)) {
            //if player still exists
            if (bulletList[bulletId].owner != playerlist[playerId] && bulletList[bulletId].owner.developer != "yes" && playerlist[playerId].developer == "no" && (bulletList[bulletId].team != playerlist[playerId].team || bulletList[bulletId].team == "none")) {
              //developers cannot kill other players, and developers cannot be killed
              //team must be different OR both players are ffa (and not eternal tanks)
              if (
                playerlist[playerId].spawnProtection >=
                playerlist[playerId].spawnProtectionDuration
              ) {
                //if player dont have spawn protection
                var DistanceBetween = Math.sqrt(
                  (bulletList[bulletId].x - playerlist[playerId].x) *
                  (bulletList[bulletId].x - playerlist[playerId].x) +
                  (bulletList[bulletId].y - playerlist[playerId].y) *
                  (bulletList[bulletId].y - playerlist[playerId].y)
                ); //calculate distance between center of bulletList[bulletId] and center of player
                if (
                  DistanceBetween <=
                  bulletList[bulletId].width + playerlist[playerId].width
                ) {
                  //crashed
                  if (bulletList[bulletId].knockback == "yes") {
                    playerlist[playerId].y +=
                      Math.sin(
                        (((bulletList[bulletId].moveAngle * 180) / Math.PI -
                          90) *
                          Math.PI) /
                        180
                      ) * 15;
                    playerlist[playerId].x +=
                      Math.cos(
                        (((bulletList[bulletId].moveAngle * 180) / Math.PI -
                          90) *
                          Math.PI) /
                        180
                      ) * 15;
                    //knockback's bullets push players backwards by 15
                  }
                  if (bulletList[bulletId].suction == "yes") {
                    var anglehit = Math.atan2(
                      bulletList[bulletId].y - playerlist[playerId].y,
                      bulletList[bulletId].x - playerlist[playerId].x
                    );
                    var speedMove = 5; //smaller number means move slower
                    playerlist[playerId].x +=
                      Math.cos(anglehit) * speedMove * delta;
                    playerlist[playerId].y +=
                      Math.sin(anglehit) * speedMove * delta;
                    //juggernaut's aura suction
                  }
                  playerlist[playerId].hit++;
                  bulletList[bulletId].hit++;
                  playerlist[playerId].health -= bulletList[bulletId].damage; //player damaged
                  //bulletList[bulletId].health -= playerlist[playerId].damage; //bulletList[bulletId] also damaged
                  bulletList[bulletId].health -= bulletList[bulletId].penetration;
                  playerlist[playerId].healthRegenTimeChange =
                    playerlist[playerId].healthRegenTime; //reset time to next health regeneration
                  //remove player if zero health
                  if (playerlist[playerId].health <= 0) {
                    bulletList[bulletId].owner.score +=
                      Math.round(playerlist[playerId].score / 2); //owner of bulletList[bulletId] get half of player's score
                    var packet = JSON.stringify(["newNotification",
                      "You killed " + playerlist[playerId].name,
                      "dimgrey"]);
                    lookup[bulletList[bulletId].ownerId].send(packet);//send kill notification before deleting dead player so that can still access dead player's name
                    //add kill achievement to player's account
                    addAchievement(
                      playerlist,
                      bulletList[bulletId].ownerId,
                      2,
                      20
                    );
                    var packet = JSON.stringify(["youDied",
                      bulletList[bulletId].owner.name,
                      playerlist[playerId],
                      respawnScoreDivision,
                      respawnScoreLimit]);
                    lookup[playerId].send(packet);
                    addDeadObject(playerlist, playerId, "player");
                    delete playerlist[playerId]; //player killed
                    console.log("someone died");
                  }
                }
              }
            }
            else if (bulletList[bulletId].heal == "yes"){//healing aura heal everyone except enemies
              if (playerlist[playerId].health < playerlist[playerId].maxhealth) {
                //too op lol
                //playerlist[playerId].health += playerlist[playerId].healthRegenSpeed;
                playerlist[playerId].health += 0.15;
              }
            }
          }
        });
      }
      //this bullet loop is compulsory as it moves traps when overlap, but collisiondetectbullet determines whether damage is received
      //get bullets near the bullet (quadtree)

      if (bulletList[bulletId].bulletType != "aura") {//auras cause a lot of lag when retrieve when they overlap, e.g heliosphere
        var elements = bulletTree.retrieve({
          x: bulletList[bulletId].x - bulletList[bulletId].width,
          y: bulletList[bulletId].y - bulletList[bulletId].width,
          width: bulletList[bulletId].width * 2,
          height: bulletList[bulletId].width * 2,
        });
        elements.forEach((thing) => {
          var id = thing.id;
          if (id != bulletId && bulletList.hasOwnProperty(id)) {
            //if the bullets are not the same bullet
            if (
              Math.sqrt(
                (bulletList[bulletId].x - bulletList[id].x) *
                (bulletList[bulletId].x - bulletList[id].x) +
                (bulletList[bulletId].y - bulletList[id].y) *
                (bulletList[bulletId].y - bulletList[id].y)
              ) <=
              bulletList[bulletId].width + bulletList[id].width
            ) {
              //if distance between bullets is less than the widths
              //crashed
              if (
                bulletList[bulletId].ownerId != bulletList[id].ownerId &&
                collisionDetectBullet == "yes" &&
                bulletList[id].bulletType != "aura" &&
                bulletList[bulletId].bulletType != "aura"
              ) {
                //if bullets belong to different tanks and they are not auras
                bulletList[bulletId].hit++;
                bulletList[id].hit++;
                bulletList[id].health -= bulletList[bulletId].damage;
                bulletList[bulletId].health -= bulletList[id].damage;
              }
              //below code move traps if crash with each other, if belong to same tank
              else if (
                (bulletList[id].bulletType == "trap" &&
                  bulletList[bulletId].bulletType == "trap") ||
                (bulletList[id].bulletType == "mine" &&
                  bulletList[bulletId].bulletType == "mine")
              ) {
                //5 below refers to speed of trap movement
                //move the trap
                var totalDistanceToMove =
                  bulletList[bulletId].width +
                  bulletList[id].width -
                  Math.sqrt(
                    (bulletList[bulletId].x - bulletList[id].x) *
                    (bulletList[bulletId].x - bulletList[id].x) +
                    (bulletList[bulletId].y - bulletList[id].y) *
                    (bulletList[bulletId].y - bulletList[id].y)
                  );
                var distanceToMove = totalDistanceToMove / 2; //so that the traps will decelerate the futher they move apart
                if (distanceToMove < 0.001) {
                  //if distance is small
                  distanceToMove = totalDistanceToMove;
                }
                bulletList[id].x +=
                  Math.cos(
                    Math.atan2(
                      bulletList[id].y - bulletList[bulletId].y,
                      bulletList[id].x - bulletList[bulletId].x
                    )
                  ) *
                  distanceToMove *
                  delta;
                bulletList[id].y +=
                  Math.sin(
                    Math.atan2(
                      bulletList[id].y - bulletList[bulletId].y,
                      bulletList[id].x - bulletList[bulletId].x
                    )
                  ) *
                  distanceToMove *
                  delta;
              } else if (
                (bulletList[id].bulletType == "drone" &&
                  bulletList[bulletId].bulletType == "drone") ||
                (bulletList[id].bulletType == "minion" &&
                  bulletList[bulletId].bulletType == "minion")
              ) {
                //15 below refers to speed of drone movement
                //move the drone
                var distNeedToMove =
                  bulletList[bulletId].width +
                  bulletList[id].width -
                  Math.sqrt(
                    (bulletList[bulletId].x - bulletList[id].x) *
                    (bulletList[bulletId].x - bulletList[id].x) +
                    (bulletList[bulletId].y - bulletList[id].y) *
                    (bulletList[bulletId].y - bulletList[id].y)
                  );
                var distMoveNow = distNeedToMove / 2; //instead of moving at fixed speed, move based on dist need to move so that it have deceleration
                bulletList[id].x +=
                  Math.cos(
                    Math.atan2(
                      bulletList[id].y - bulletList[bulletId].y,
                      bulletList[id].x - bulletList[bulletId].x
                    )
                  ) *
                  distMoveNow *
                  delta;
                bulletList[id].y +=
                  Math.sin(
                    Math.atan2(
                      bulletList[id].y - bulletList[bulletId].y,
                      bulletList[id].x - bulletList[bulletId].x
                    )
                  ) *
                  distMoveNow *
                  delta;
              }
            } else if (
              Math.sqrt(
                (bulletList[bulletId].x - bulletList[id].x) *
                (bulletList[bulletId].x - bulletList[id].x) +
                (bulletList[bulletId].y - bulletList[id].y) *
                (bulletList[bulletId].y - bulletList[id].y)
              ) <=
              (bulletList[bulletId].width + bulletList[id].width) * 1.5
            ) {
              //traps have bigger hitboxes between each other
              if (
                (bulletList[id].bulletType == "trap" &&
                  bulletList[bulletId].bulletType == "trap") ||
                (bulletList[id].bulletType == "mine" &&
                  bulletList[bulletId].bulletType == "mine")
              ) {
                //3 below refers to speed of trap movement
                //move the trap
                bulletList[id].x +=
                  Math.cos(
                    Math.atan2(
                      bulletList[id].y - bulletList[bulletId].y,
                      bulletList[id].x - bulletList[bulletId].x
                    )
                  ) *
                  5 *
                  delta;
                bulletList[id].y +=
                  Math.sin(
                    Math.atan2(
                      bulletList[id].y - bulletList[bulletId].y,
                      bulletList[id].x - bulletList[bulletId].x
                    )
                  ) *
                  5 *
                  delta;
              }
            }
          }
        });
      }
      if (collisionDetectBot == "yes") {
        //get nearby bots from quadtree list
        var elements = botTree.retrieve({
          x: bulletList[bulletId].x - bulletList[bulletId].width,
          y: bulletList[bulletId].y - bulletList[bulletId].width,
          width: bulletList[bulletId].width * 2,
          height: bulletList[bulletId].width * 2,
        });
        elements.forEach((thing) => {
          var dunebotId = thing.id;
          if (bots.hasOwnProperty(dunebotId)) {
            //if bot still exists
            if (
              Math.sqrt(
                (bulletList[bulletId].x - bots[dunebotId].x) *
                (bulletList[bulletId].x - bots[dunebotId].x) +
                (bulletList[bulletId].y - bots[dunebotId].y) *
                (bulletList[bulletId].y - bots[dunebotId].y)
              ) <=
              bulletList[bulletId].width + bots[dunebotId].width
            ) {
              //if distance between bullets is less than the widths
              //crashed
              if (
                (bots[dunebotId].name == "Pillbox") &&
                bulletList[bulletId].bulletType != "aura"
              ) {//bot bullet knockback
                //move bullet backwards by 100
                bulletList[bulletId].y +=
                  Math.sin(
                    (((bulletList[bulletId].moveAngle * 180) / Math.PI -
                      90 -
                      180) *
                      Math.PI) /
                    180
                  ) * 100;
                bulletList[bulletId].x +=
                  Math.cos(
                    (((bulletList[bulletId].moveAngle * 180) / Math.PI -
                      90 -
                      180) *
                      Math.PI) /
                    180
                  ) * 100;
              }
              if (bulletList[bulletId].suction == "yes") {
                var anglehit = Math.atan2(
                  bulletList[bulletId].y - bots[dunebotId].y,
                  bulletList[bulletId].x - bots[dunebotId].x
                );
                var speedMove = 5; //smaller number means move slower
                bots[dunebotId].x += Math.cos(anglehit) * speedMove * delta;
                bots[dunebotId].y += Math.sin(anglehit) * speedMove * delta;
                //juggernaut's aura suction
              }
              if (bulletList[bulletId].knockback == "yes") {
                bots[dunebotId].y +=
                  Math.sin(
                    (((bulletList[bulletId].moveAngle * 180) / Math.PI - 90) *
                      Math.PI) /
                    180
                  ) * 30;
                bots[dunebotId].x +=
                  Math.cos(
                    (((bulletList[bulletId].moveAngle * 180) / Math.PI - 90) *
                      Math.PI) /
                    180
                  ) * 30;
                //knockback's bullets push mobs backwards by 30
              }
              if (bulletList[bulletId].bulletType == "trap" || bulletList[bulletId].bulletType == "mine" || bulletList[bulletId].bulletType == "drone" || bulletList[bulletId].bulletType == "minion") {
                var anglehit = Math.atan2(
                  bulletList[bulletId].y - bots[dunebotId].y,
                  bulletList[bulletId].x - bots[dunebotId].x
                );
                var DistanceBetween = Math.sqrt(
                  (bulletList[bulletId].x - bots[dunebotId].x) *
                  (bulletList[bulletId].x - bots[dunebotId].x) +
                  (bulletList[bulletId].y - bots[dunebotId].y) *
                  (bulletList[bulletId].y - bots[dunebotId].y));

                bulletList[bulletId].x +=
                  Math.cos(anglehit) * DistanceBetween / 30 * delta;
                bulletList[bulletId].y +=
                  Math.sin(anglehit) * DistanceBetween / 30 * delta;
              }
              bots[dunebotId].hit++;
              bulletList[bulletId].hit++;
              bots[dunebotId].health -= bulletList[bulletId].damage; //dunebot damaged
              //bulletList[bulletId].health -= bots[dunebotId].damage; //bulletList[bulletId] also damaged
              bulletList[bulletId].health -= bulletList[bulletId].penetration;
              //if aura is freeze aura
              if (bulletList[bulletId].freeze == "yes") {
                bots[dunebotId].speed *= 0.995;
                //everytime bot hits the aura, it becomes slower, so a bot inside the aura will slowly decelerate until its speed is almost zero
                bots[dunebotId].color = "lightblue";
              }
              //check if player attacked this bot before
              var attackedBotBefore = "no";
              for (const attackerid in bots[dunebotId].attackers) {
                if (
                  bots[dunebotId].attackers[attackerid] ==
                  bulletList[bulletId].owner
                ) {
                  attackedBotBefore = "yes";
                }
              }
              if (attackedBotBefore == "no") {
                //if havent attacked shape before, add player to list of people who attacked the shape
                bots[dunebotId].attackers[bulletId] =
                  bulletList[bulletId].owner;
              }
            }
          }
        });
      }
    }
  }

  function moveBulletBot(bulletList, bulletId, mapSize, playerlist, location) {
    //move bullets spawned by bots
    if (bulletList[bulletId].bulletType != "drone" && bulletList[bulletId].bulletType != "minion") {
      //if not drone
      bulletList[bulletId].y += Math.sin(bulletList[bulletId].moveAngle) * bulletList[bulletId].amountAddWhenMove * delta;
      bulletList[bulletId].x += Math.cos(bulletList[bulletId].moveAngle) * bulletList[bulletId].amountAddWhenMove * delta;
    } else {
      //if it is a drone
      var mousePositionOnCanvasX = bulletList[bulletId].owner.mousex;
      var mousePositionOnCanvasY = bulletList[bulletId].owner.mousey;
      var droneangle = Math.atan2(
        mousePositionOnCanvasY - bulletList[bulletId].y,
        mousePositionOnCanvasX - bulletList[bulletId].x
      );
      var droneDistanceFromMouseWhenIdle = 1.5; //relative to drone size
      if (
        bulletList[bulletId].y != mousePositionOnCanvasY ||
        bulletList[bulletId].x != mousePositionOnCanvasX
      ) {
        //if drone not at mouse position
        //if drone have not reached the mouse and is moving towards it
        bulletList[bulletId].y +=
          Math.round(
            Math.sin(droneangle) * bulletList[bulletId].amountAddWhenMove
          ) * delta;
        bulletList[bulletId].x +=
          Math.round(
            Math.cos(droneangle) * bulletList[bulletId].amountAddWhenMove
          ) * delta;
        bulletList[bulletId].moveAngle = droneangle; //change drone angle
        var distFromMouse = Math.sqrt(
          (mousePositionOnCanvasX - bulletList[bulletId].x) *
          (mousePositionOnCanvasX - bulletList[bulletId].x) +
          (mousePositionOnCanvasY - bulletList[bulletId].y) *
          (mousePositionOnCanvasY - bulletList[bulletId].y)
        );
        if (distFromMouse <= bulletList[bulletId].amountAddWhenMove) {
          //if very near to mouse
          bulletList[bulletId].y = mousePositionOnCanvasY;
          bulletList[bulletId].x = mousePositionOnCanvasX;
        }
      }
    }
    bulletList[bulletId].timer--;
    if (bulletList[bulletId].growth == "yes") {
      //bullet growth
      bulletList[bulletId].width++;
      bulletList[bulletId].height++;
    }
    //if the bulletList[bulletId] is a trap
    if (
      bulletList[bulletId].bulletType == "trap" ||
      bulletList[bulletId].bulletType == "mine"
    ) {
      bulletList[bulletId].dist--;
      if (bulletList[bulletId].dist <= 10) {
        //distance for decelerating
        //stop trap from moving anymore
        bulletList[bulletId].amountAddWhenMove /= 1.1; //the smaller the number, the slower the deceleration.
        if (bulletList[bulletId].amountAddWhenMove < 0.01) {
          //very slow movement
          bulletList[bulletId].amountAddWhenMove = 0; //stop movement
        }
      }
      if (bulletList[bulletId].bulletType == "mine") {
        //spawnBullets(bulletId, bulletList, bulletList, location);//this code needs to be rewritten for the bots' mines
      }
    } else if (bulletList[bulletId].bulletType == "aura") {
      var barrel =
        bulletList[bulletId].owner.bodybarrels[bulletList[bulletId].barrelId];
      if (typeof barrel !== "undefined") {
        bulletList[bulletId].x =
          bulletList[bulletId].owner.x +
          barrel.x *
          Math.cos(
            bulletList[bulletId].owner.angle -
            Math.PI / 2 +
            barrel.additionalAngle
          ) +
          barrel.y *
          Math.cos(bulletList[bulletId].owner.angle + barrel.additionalAngle);
        bulletList[bulletId].y =
          bulletList[bulletId].owner.y +
          barrel.x *
          Math.sin(
            bulletList[bulletId].owner.angle -
            Math.PI / 2 +
            barrel.additionalAngle
          ) +
          barrel.y *
          Math.sin(bulletList[bulletId].owner.angle + barrel.additionalAngle);
      }
    }
    //next, check for collision with borders
    var upCollide = bulletList[bulletId].y + bulletList[bulletId].height;
    var rightCollide = bulletList[bulletId].x + bulletList[bulletId].width;
    var downCollide = bulletList[bulletId].y - bulletList[bulletId].height;
    var leftCollide = bulletList[bulletId].x - bulletList[bulletId].width;
    if (
      (upCollide >= mapSize ||
        downCollide <= 0 ||
        rightCollide >= mapSize ||
        leftCollide <= 0) &&
      bulletList[bulletId].bulletType != "aura"
    ) {
      //remove bulletList[bulletId] if touch sides of arena AND it is not an aura
      addDeadObject(bulletList, bulletId, "bullet");
      delete bulletList[bulletId];
    } else if (
      bulletList[bulletId].health <= 0 ||
      bulletList[bulletId].timer <= 0
    ) {
      addDeadObject(bulletList, bulletId, "bullet");
      delete bulletList[bulletId];
    } else {
      var elements = playerTree.retrieve({
        x: bulletList[bulletId].x - bulletList[bulletId].width,
        y: bulletList[bulletId].y - bulletList[bulletId].width,
        width: bulletList[bulletId].width * 2,
        height: bulletList[bulletId].width * 2,
      });
      elements.forEach((thing) => {
        var playerId = thing.id;
        if (playerlist.hasOwnProperty(playerId)) {
          //if player still exists
          if (
            playerlist[playerId].spawnProtection >=
            playerlist[playerId].spawnProtectionDuration
          ) {
            //if player dont have spawn protection
            var DistanceBetween = Math.sqrt(
              (bulletList[bulletId].x - playerlist[playerId].x) *
              (bulletList[bulletId].x - playerlist[playerId].x) +
              (bulletList[bulletId].y - playerlist[playerId].y) *
              (bulletList[bulletId].y - playerlist[playerId].y)
            ); //calculate distance between center of bulletList[bulletId] and center of player
            if (
              DistanceBetween <=
              bulletList[bulletId].width + playerlist[playerId].width &&
              bulletList[bulletId].owner != playerlist[playerId]
            ) {
              //crashed
              if (bulletList[bulletId].knockback == "yes") {
                playerlist[playerId].y +=
                  Math.sin(
                    (((bulletList[bulletId].moveAngle * 180) / Math.PI - 90) *
                      Math.PI) /
                    180
                  ) * 15;
                playerlist[playerId].x +=
                  Math.cos(
                    (((bulletList[bulletId].moveAngle * 180) / Math.PI - 90) *
                      Math.PI) /
                    180
                  ) * 15;
                //knockback's bullets push players backwards by 15
              }
              if (bulletList[bulletId].suction == "yes") {
                var anglehit = Math.atan2(
                  bulletList[bulletId].y - playerlist[playerId].y,
                  bulletList[bulletId].x - playerlist[playerId].x
                );
                var speedMove = 5; //smaller number means move slower
                playerlist[playerId].x +=
                  Math.cos(anglehit) * speedMove * delta;
                playerlist[playerId].y +=
                  Math.sin(anglehit) * speedMove * delta;
                //juggernaut's aura suction
              }
              playerlist[playerId].hit++;
              bulletList[bulletId].hit++;
              playerlist[playerId].health -= bulletList[bulletId].damage; //player damaged
              bulletList[bulletId].health -= playerlist[playerId].damage; //bulletList[bulletId] also damaged
              playerlist[playerId].healthRegenTimeChange =
                playerlist[playerId].healthRegenTime; //reset time to next health regeneration
              //remove player if zero health
              if (playerlist[playerId].health <= 0) {
                bulletList[bulletId].owner.score += playerlist[playerId].score; //owner of bulletList[bulletId] get all of player's score
                var packet = JSON.stringify(["youDied",
                  bulletList[bulletId].owner.name,
                  playerlist[playerId],
                  respawnScoreDivision,
                  respawnScoreLimit]);
                lookup[playerId].send(packet);
                addDeadObject(playerlist, playerId, "player");
                delete playerlist[playerId]; //player killed
                console.log("someone died");
              }
            }
          }
        }
      });
      //this bullet loop is compulsory as it moves traps when overlap, but collisiondetectbullet determines whether damage is received
      //get bullets near the bullet (quadtree)
      var elements = botbulletTree.retrieve({
        x: bulletList[bulletId].x - bulletList[bulletId].width,
        y: bulletList[bulletId].y - bulletList[bulletId].width,
        width: bulletList[bulletId].width * 2,
        height: bulletList[bulletId].width * 2,
      });
      elements.forEach((thing) => {
        var id = thing.id;
        if (id != bulletId && bulletList.hasOwnProperty(id)) {
          //if the bullets are not the same bullet
          if (
            Math.sqrt(
              (bulletList[bulletId].x - bulletList[id].x) *
              (bulletList[bulletId].x - bulletList[id].x) +
              (bulletList[bulletId].y - bulletList[id].y) *
              (bulletList[bulletId].y - bulletList[id].y)
            ) <=
            bulletList[bulletId].width + bulletList[id].width
          ) {
            //if distance between bullets is less than the widths
            //crashed
            if (
              (bulletList[id].bulletType == "trap" &&
                bulletList[bulletId].bulletType == "trap") ||
              (bulletList[id].bulletType == "mine" &&
                bulletList[bulletId].bulletType == "mine")
            ) {
              //5 below refers to speed of trap movement
              //move the trap
              var totalDistanceToMove =
                bulletList[bulletId].width +
                bulletList[id].width -
                Math.sqrt(
                  (bulletList[bulletId].x - bulletList[id].x) *
                  (bulletList[bulletId].x - bulletList[id].x) +
                  (bulletList[bulletId].y - bulletList[id].y) *
                  (bulletList[bulletId].y - bulletList[id].y)
                );
              var distanceToMove = totalDistanceToMove / 2; //so that the traps will decelerate the futher they move apart
              if (distanceToMove < 0.001) {
                //if distance is small
                distanceToMove = totalDistanceToMove;
              }
              bulletList[id].x +=
                Math.cos(
                  Math.atan2(
                    bulletList[id].y - bulletList[bulletId].y,
                    bulletList[id].x - bulletList[bulletId].x
                  )
                ) *
                distanceToMove *
                delta;
              bulletList[id].y +=
                Math.sin(
                  Math.atan2(
                    bulletList[id].y - bulletList[bulletId].y,
                    bulletList[id].x - bulletList[bulletId].x
                  )
                ) *
                distanceToMove *
                delta;
            } else if (
              (bulletList[id].bulletType == "drone" &&
                bulletList[bulletId].bulletType == "drone") ||
              (bulletList[id].bulletType == "minion" &&
                bulletList[bulletId].bulletType == "minion")
            ) {
              //15 below refers to speed of drone movement
              //move the drone
              var distNeedToMove =
                bulletList[bulletId].width +
                bulletList[id].width -
                Math.sqrt(
                  (bulletList[bulletId].x - bulletList[id].x) *
                  (bulletList[bulletId].x - bulletList[id].x) +
                  (bulletList[bulletId].y - bulletList[id].y) *
                  (bulletList[bulletId].y - bulletList[id].y)
                );
              var distMoveNow = distNeedToMove / 2; //instead of moving at fixed speed, move based on dist need to move so that it have deceleration
              bulletList[id].x +=
                Math.cos(
                  Math.atan2(
                    bulletList[id].y - bulletList[bulletId].y,
                    bulletList[id].x - bulletList[bulletId].x
                  )
                ) *
                distMoveNow *
                delta;
              bulletList[id].y +=
                Math.sin(
                  Math.atan2(
                    bulletList[id].y - bulletList[bulletId].y,
                    bulletList[id].x - bulletList[bulletId].x
                  )
                ) *
                distMoveNow *
                delta;
            }
          } else if (
            Math.sqrt(
              (bulletList[bulletId].x - bulletList[id].x) *
              (bulletList[bulletId].x - bulletList[id].x) +
              (bulletList[bulletId].y - bulletList[id].y) *
              (bulletList[bulletId].y - bulletList[id].y)
            ) <=
            (bulletList[bulletId].width + bulletList[id].width) * 1.5
          ) {
            //traps have bigger hitboxes between each other
            if (
              (bulletList[id].bulletType == "trap" &&
                bulletList[bulletId].bulletType == "trap") ||
              (bulletList[id].bulletType == "mine" &&
                bulletList[bulletId].bulletType == "mine")
            ) {
              //3 below refers to speed of trap movement
              //move the trap
              bulletList[id].x +=
                Math.cos(
                  Math.atan2(
                    bulletList[id].y - bulletList[bulletId].y,
                    bulletList[id].x - bulletList[bulletId].x
                  )
                ) *
                5 *
                delta;
              bulletList[id].y +=
                Math.sin(
                  Math.atan2(
                    bulletList[id].y - bulletList[bulletId].y,
                    bulletList[id].x - bulletList[bulletId].x
                  )
                ) *
                5 *
                delta;
            }
          }
        }
      });
    }
  }

  function spawnBullets(id, playerlist, bulletlist, location) {
    if (playerlist[id].shooting == "yes" || playerlist[id].autofire == "yes") {
      for (const barrel in playerlist[id].barrels) {
        checkifspawnbullet(
          playerlist[id].barrels[barrel],
          barrel,
          playerlist,
          id,
          bulletlist,
          location,
          "no"
        );
      }
    }
    for (const barrel in playerlist[id].bodybarrels) {
      if (playerlist[id].bodybarrels[barrel].shooting == "yes") {
        if (playerlist[id].bodybarrels[barrel].spawnedAura != "yes") {//dont repeatedly spawn and delete auras
          checkifspawnbullet(
            playerlist[id].bodybarrels[barrel],
            barrel,
            playerlist,
            id,
            bulletlist,
            location,
            "yes"
          );
        }
      }
    }
  }
  function spawnBulletsBot(id, playerlist, bulletlist, location) {
    if (playerlist[id].shooting == "yes") {
      for (const barrel in playerlist[id].barrels) {
        checkifspawnbulletbot(
          playerlist[id].barrels[barrel],
          barrel,
          playerlist,
          id,
          bulletlist
        );
      }
    }
  }
  function checkifspawnbullet(
    barrel,
    barrelid,
    playerlist,
    id,
    bulletlist,
    location,
    haveai
  ) {
    //code for spawning bullet
    if (barrel.reload <= 0) {
      if (
        (barrel.barrelType != "drone" && barrel.barrelType != "minion") ||
        barrel.droneCount < barrel.droneLimit
      ) {
        //spawn bullet
        barrel.reload = barrel.reloadRecover; //reset reload
        barrel.shootingState = "decreasing"; //start barrel animation when shooting
        if (playerlist[id].spawnProtection < playerlist[id].spawnProtectionDuration) {
          //if have spawn protection, turn it off
          if (gamemode != "editor") {
            playerlist[id].spawnProtection = playerlist[id].spawnProtectionDuration;
          }
        }
        bulletlist[bulletID] = {
          //note: all properties are based on player properties s that when upgrading, only need to change the player's properties
          //explanation for calculation of x and y positions:
          //the bullets are usually spawned in a straight line, e.g. for twin: bullet 1  bullet 2
          //when the tank tilts, the spawning position of the bullets does not change
          //when the player is shooting sideways, the bullets still spawn horizontally next to each other, and they will not move through the barrels, instead, they will be shooting in a straight line instead of multiple lines
          //the code below is needed for tanks that are shooting more than one bullet in the same direction at different x location, e.g. twin tank, however it does not affect tanks that do not need this code
          //the code is:
          //x: player x + x distance between center of player and bullet spawning location * cos(angle in radians)
          //y: player y + x distance between center of player and bullet spawning location * sin(angle in radians)
          x:
            playerlist[id].x +
            barrel.x *
            Math.cos(
              playerlist[id].angle + (barrel.additionalAngle * Math.PI) / 180
            ),
          y:
            playerlist[id].y +
            barrel.x *
            Math.sin(
              playerlist[id].angle + (barrel.additionalAngle * Math.PI) / 180
            ),
          health: barrel.bulletHealth,
          damage: barrel.bulletDamage,
          penetration: barrel.bulletPenetration,
          timer: barrel.bulletTimer,
          width: barrel.barrelWidth / 2,
          height: barrel.barrelWidth / 2,
          color: playerlist[id].color,
          outline: playerlist[id].outline,
          owner: playerlist[id],
          ownerId: id,
          team: playerlist[id].team,
          barrelId: barrelid,
          moveAngle:
            playerlist[id].angle + (barrel.additionalAngle * Math.PI) / 180, //player angle plus the extra barrel angle, e.g. for flank, the second barrel is 180 degrees away from player angle
          amountAddWhenMove: barrel.bulletSpeed,
          hit: 0,
          passive: "no",
          suction: "no",
          freeze: "no",
          heal: "no",
          AI: "no",
        };
        //not do the calculation for moving bullet so that it spawns at tip of barrel
        if (barrel.barrelType != "aura") {
          bulletlist[bulletID].x +=
            barrel.barrelHeight *
            Math.cos(
              playerlist[id].angle -
              Math.PI / 2 +
              (barrel.additionalAngle * Math.PI) / 180
            );
          bulletlist[bulletID].y +=
            barrel.barrelHeight *
            Math.sin(
              playerlist[id].angle -
              Math.PI / 2 +
              (barrel.additionalAngle * Math.PI) / 180
            );
        }

        if (barrel.barrelType == "trap") {
          //if barrel is a trap barrel
          bulletlist[bulletID].dist = barrel.trapDistBeforeStop;
          bulletlist[bulletID].bulletType = "trap";
          if (bulletlist[bulletID].owner.bulletType) {
            //if this is a trap spawning a trap, e.g. mine traps
            bulletlist[bulletID].ownerId = bulletlist[bulletID].owner.ownerId;
            bulletlist[bulletID].owner = playerlist[id].owner; //recognize player as owner instead of the trap
            //bulletlist[bulletID].moveAngle = barrel.additionalAngle; //default is playerlist[id].angle, which would be undefined
            //^ traps dont have ai
          }
        } else if (barrel.barrelType == "drone") {
          //if barrel is drone spawner
          bulletlist[bulletID].bulletType = "drone";
          playerlist[id].dronesControlling.push(bulletID);
          barrel.droneCount++; //increase drone count
        } else if (barrel.barrelType == "minion") {
          //if barrel is minion spawner
          bulletlist[bulletID].bulletType = "minion";
          playerlist[id].dronesControlling.push(bulletID);
          barrel.droneCount++; //increase drone count
          bulletlist[bulletID].barrels = JSON.parse(
            JSON.stringify(barrel.barrels)
          ); //use json to deep clone object
          bulletlist[bulletID].shooting = "yes";
          bulletlist[bulletID].angle = playerlist[id].angle;
          bulletlist[bulletID].recoilXAmount = 0;
          bulletlist[bulletID].recoilYAmount = 0;
          bulletlist[bulletID].minDist = barrel.minDist;
        } else if (barrel.barrelType == "aura") {
          //aura
          bulletlist[bulletID].x =
            playerlist[id].x +
            barrel.x *
            Math.cos(
              playerlist[id].angle - Math.PI / 2 + barrel.additionalAngle
            ) +
            barrel.y * Math.cos(playerlist[id].angle + barrel.additionalAngle);
          bulletlist[bulletID].y =
            playerlist[id].y +
            barrel.x *
            Math.sin(
              playerlist[id].angle - Math.PI / 2 + barrel.additionalAngle
            ) +
            barrel.y * Math.cos(playerlist[id].angle + barrel.additionalAngle);
          bulletlist[bulletID].bulletType = "aura";
          bulletlist[bulletID].width = playerlist[id].width * barrel.auraSize;
          bulletlist[bulletID].height = playerlist[id].height * barrel.auraSize;
          bulletlist[bulletID].color = barrel.auraColor;
          bulletlist[bulletID].outline = barrel.auraOutline;
          if (barrel.auraSpecialty == "freeze") {
            bulletlist[bulletID].freeze = "yes";
          } else if (barrel.auraSpecialty == "attraction") {
            bulletlist[bulletID].suction = "yes";
          } else if (barrel.auraSpecialty == "heal") {
            bulletlist[bulletID].heal = "yes";
          }
          //insert aura into collision list immediately so that aura doesnt flash (disappear and reappear)
          bulletTree.insert({
            x: bulletlist[bulletID].x - bulletlist[bulletID].width,
            y: bulletlist[bulletID].y - bulletlist[bulletID].width,
            width: bulletlist[bulletID].width * 2,
            height: bulletlist[bulletID].width * 2,
            id: bulletID,
          });
          barrel.spawnedAura = "yes";//ensure aura doesnt respawn
          barrel.auraID = bulletID;//prevent multiple auras when upgrade tank
        } else if (barrel.barrelType == "mine") {
          //mines: traps that have barrels on it
          bulletlist[bulletID].dist = barrel.trapDistBeforeStop;
          bulletlist[bulletID].bulletType = "mine";
          bulletlist[bulletID].barrels = JSON.parse(
            JSON.stringify(barrel.barrels)
          ); //use json to deep clone object
          bulletlist[bulletID].shooting = "yes";
          bulletlist[bulletID].angle = 0;
          bulletlist[bulletID].recoilXAmount = 0;
          bulletlist[bulletID].recoilYAmount = 0;
        } else {
          bulletlist[bulletID].bulletType = "bullet";
          if (bulletlist[bulletID].owner.bulletType) {
            //if this is a bullet spawning a bullet, e.g. mine traps
            bulletlist[bulletID].ownerId = bulletlist[bulletID].owner.ownerId;
            if (bulletlist[bulletID].owner.bulletType == "minion") {
              //unlike mines, minion barrels are not turrets
              bulletlist[bulletID].moveAngle = barrel.additionalAngle;
              bulletlist[bulletID].x = playerlist[id].x;
              bulletlist[bulletID].y = playerlist[id].y;
            }
            else {//mines
              bulletlist[bulletID].moveAngle = barrel.additionalAngle; //default is playerlist[id].angle, which would be undefined
            }
            bulletlist[bulletID].owner = playerlist[id].owner; //recognize player as owner instead of the trap
          }
          if (barrel.knockback == "yes") {
            bulletlist[bulletID].knockback = "yes";
          }
          if (barrel.growth == "yes") {
            bulletlist[bulletID].growth = "yes";
          }
        }
        if (haveai == "yes") {
          //if this is a body barrel
          bulletlist[bulletID].x =
            playerlist[id].x + barrel.x * Math.cos(barrel.additionalAngle);
          bulletlist[bulletID].y =
            playerlist[id].y + barrel.x * Math.sin(barrel.additionalAngle);
          //move bullet to barrel tip
          bulletlist[bulletID].x +=
            barrel.barrelHeight *
            Math.cos(barrel.additionalAngle - Math.PI / 2);
          bulletlist[bulletID].y +=
            barrel.barrelHeight *
            Math.sin(barrel.additionalAngle - Math.PI / 2);

          bulletlist[bulletID].moveAngle = barrel.additionalAngle; //AI barrels do no take into account theplayer's angle
          bulletlist[bulletID].AI = "yes";
        }
        bulletID++;
        //successfully shot bullet
        if (barrel.barrelType != "aura") {
          //recoil if not aura
          //ADDING RECOIL
          var recoilangle =
            playerlist[id].angle + (barrel.additionalAngle * Math.PI) / 180;
          if (haveai == "yes") {
            //if this is a turret
            recoilangle = barrel.additionalAngle;
          }
          var recoilamount = barrel.recoil; //calculate recoil amount based on bullet health (always 10 times less than health)
          //move in opposite direction of bullet
          playerlist[id].recoilXAmount +=
            Math.sin((((recoilangle * 180) / Math.PI - 90) * Math.PI) / 180) *
            recoilamount *
            delta;
          playerlist[id].recoilYAmount +=
            Math.cos((((recoilangle * 180) / Math.PI - 90) * Math.PI) / 180) *
            recoilamount *
            delta;
        }
      }
    } else {
      barrel.reload--;
    }
  }

  function checkifspawnbulletbot(barrel, barrelid, playerlist, id, bulletlist) {
    //code for spawning bullet FOR DUNE MOBS ONLY
    if (barrel.reload <= 0) {
      if (
        (barrel.barrelType != "drone" && barrel.barrelType != "minion") ||
        barrel.droneCount < barrel.droneLimit
      ) {
        //spawn bullet
        barrel.reload = barrel.reloadRecover;
        barrel.shootingState = "decreasing";
        bulletlist[bulletID] = {
          x:
            playerlist[id].x +
            barrel.x *
            Math.cos(
              playerlist[id].angle + (barrel.additionalAngle * Math.PI) / 180
            ),
          y:
            playerlist[id].y +
            barrel.x *
            Math.sin(
              playerlist[id].angle + (barrel.additionalAngle * Math.PI) / 180
            ),
          health: barrel.bulletHealth,
          damage: barrel.bulletDamage,
          timer: barrel.bulletTimer,
          width: barrel.barrelWidth / 2,
          height: barrel.barrelWidth / 2,
          color: "#F04F54", //bots do not have color in server code, bot's color is in client code
          outline: "#D23136",
          owner: playerlist[id],
          ownerId: id,
          team: "mob",
          barrelId: barrelid,
          moveAngle:
            playerlist[id].angle + (barrel.additionalAngle * Math.PI) / 180,
          amountAddWhenMove: barrel.bulletSpeed,
          hit: 0,
          passive: "no",
          suction: "no",
          freeze: "no",
          heal: "no",
          AI: "no",
          ownerName: playerlist[id].name,
        };

        if (barrel.barrelType != "aura") {
          bulletlist[bulletID].x +=
            barrel.barrelHeight *
            Math.cos(
              playerlist[id].angle +
              (barrel.additionalAngle * Math.PI) / 180
            );
          bulletlist[bulletID].y +=
            barrel.barrelHeight *
            Math.sin(
              playerlist[id].angle +
              (barrel.additionalAngle * Math.PI) / 180
            );
        }

        if (barrel.barrelType == "trap") {
          //if barrel is a trap barrel
          bulletlist[bulletID].dist = barrel.trapDistBeforeStop;
          bulletlist[bulletID].bulletType = "trap";
        } else if (barrel.barrelType == "drone") {
          //if barrel is drone spawner
          bulletlist[bulletID].bulletType = "drone";
          playerlist[id].dronesControlling.push(bulletID);
          barrel.droneCount++; //increase drone count
        } else if (barrel.barrelType == "minion") {
          //if barrel is minion spawner
          bulletlist[bulletID].bulletType = "minion";
          playerlist[id].dronesControlling.push(bulletID);
          barrel.droneCount++; //increase drone count
          bulletlist[bulletID].barrels = JSON.parse(
            JSON.stringify(barrel.barrels)
          ); //use json to deep clone object
          bulletlist[bulletID].shooting = "yes";
          bulletlist[bulletID].angle = 0;
          bulletlist[bulletID].recoilXAmount = 0;
          bulletlist[bulletID].recoilYAmount = 0;
        } else if (barrel.barrelType == "aura") {
          //aura
          bulletlist[bulletID].x =
            playerlist[id].x +
            barrel.x *
            Math.cos(
              playerlist[id].angle - Math.PI / 2 + barrel.additionalAngle
            ) +
            barrel.y * Math.cos(playerlist[id].angle + barrel.additionalAngle);
          bulletlist[bulletID].y =
            playerlist[id].y +
            barrel.x *
            Math.sin(
              playerlist[id].angle - Math.PI / 2 + barrel.additionalAngle
            ) +
            barrel.y * Math.cos(playerlist[id].angle + barrel.additionalAngle);
          bulletlist[bulletID].bulletType = "aura";
          bulletlist[bulletID].width = playerlist[id].width * barrel.auraSize;
          bulletlist[bulletID].height = playerlist[id].height * barrel.auraSize;
          bulletlist[bulletID].color = barrel.auraColor;
          bulletlist[bulletID].outline = barrel.auraOutline;
          if (barrel.auraSpecialty == "freeze") {
            bulletlist[bulletID].freeze = "yes";
          } else if (barrel.auraSpecialty == "attraction") {
            bulletlist[bulletID].suction = "yes";
          } else if (barrel.auraSpecialty == "heal") {
            bulletlist[bulletID].heal = "yes";
          }
          //insert aura into collision list immediately so that aura doesnt flash (disappear and reappear)
          botbulletTree.insert({
            x: bulletlist[bulletID].x - bulletlist[bulletID].width,
            y: bulletlist[bulletID].y - bulletlist[bulletID].width,
            width: bulletlist[bulletID].width * 2,
            height: bulletlist[bulletID].width * 2,
            id: bulletID,
          });
        } else if (barrel.barrelType == "mine") {
          //mines: traps that have barrels on it
          bulletlist[bulletID].dist = barrel.trapDistBeforeStop;
          bulletlist[bulletID].bulletType = "mine";
          bulletlist[bulletID].barrels = JSON.parse(
            JSON.stringify(barrel.barrels)
          ); //use json to deep clone object
          bulletlist[bulletID].shooting = "yes";
          bulletlist[bulletID].angle = 0;
          bulletlist[bulletID].recoilXAmount = 0;
          bulletlist[bulletID].recoilYAmount = 0;
        } else {
          bulletlist[bulletID].bulletType = "bullet";
          if (bulletlist[bulletID].owner.bulletType) {
            //if this is a bullet spawning a bullet, e.g. mine traps
            bulletlist[bulletID].ownerId = bulletlist[bulletID].owner.ownerId;
            bulletlist[bulletID].owner = playerlist[id].owner; //recognize player as owner instead of the trap
            bulletlist[bulletID].moveAngle = barrel.additionalAngle; //default is playerlist[id].angle, which would be undefined
          }
          if (barrel.knockback == "yes") {
            bulletlist[bulletID].knockback = "yes";
          }
          if (barrel.growth == "yes") {
            bulletlist[bulletID].growth = "yes";
          }
        }
        bulletID++;
        //successfully shot bullet
        if (barrel.barrelType != "aura") {
          //recoil (does not work for bots)
          var recoilangle =
            playerlist[id].angle + (barrel.additionalAngle * Math.PI) / 180;
          var recoilamount = barrel.recoil;
          //move in opposite direction of bullet
          playerlist[id].recoilXAmount +=
            Math.sin((((recoilangle * 180) / Math.PI - 90) * Math.PI) / 180) *
            recoilamount *
            delta;
          playerlist[id].recoilYAmount +=
            Math.cos((((recoilangle * 180) / Math.PI - 90) * Math.PI) / 180) *
            recoilamount *
            delta;
        }
      }
    } else {
      barrel.reload--;
    }
  }

  function checkifspawnbulletdef(playerlist, id) {
    //code for spawning bullet FOR BASE DEFENDERS ONLY
    if (playerlist[id].reload <= 0) {
      if (
        playerlist[id].droneCount < defStats.droneLimit
      ) {
        //spawn bullet
        playerlist[id].reload = defStats.reloadRecover;
        var anglehit = Math.random() * 7 - 3;//random angle

        defbullets[defbulletID] = {
          x: playerlist[id].x + Math.cos(anglehit) * playerlist[id].width / 2 * delta,
          y: playerlist[id].y + Math.sin(anglehit) * playerlist[id].width / 2 * delta,
          health: defStats.bulletHealth,
          damage: defStats.bulletDamage,
          timer: defStats.bulletTimer,
          width: defStats.barrelWidth / 2,
          height: defStats.barrelWidth / 2,
          color: playerlist[id].color,
          outline: playerlist[id].outline,
          owner: playerlist[id],
          ownerId: id,
          team: playerlist[id].team,
          barrelId: "nil",
          moveAngle: 0,
          amountAddWhenMove: defStats.bulletSpeed,
          hit: 0,
          passive: "no",
          suction: "no",
          freeze: "no",
          heal: "no",
          AI: "no",
          bulletType: "drone",
        };
        playerlist[id].droneCount++;

        defbulletID++;
      }
    } else {
      playerlist[id].reload--;
    }
  }

  function recoilMove(playerlist, id) {
    //move player based on recoil amount
    if (playerlist[id].recoilXAmount != 0) {
      playerlist[id].y -= playerlist[id].recoilXAmount;
      playerlist[id].recoilXAmount *= recoilReduction;
      if (Math.abs(playerlist[id].recoilXAmount) < 0.1) {//if very close to 0
        playerlist[id].recoilXAmount = 0;
      }
    }
    if (playerlist[id].recoilYAmount != 0) {
      playerlist[id].x -= playerlist[id].recoilYAmount;
      playerlist[id].recoilYAmount *= recoilReduction;
      if (Math.abs(playerlist[id].recoilYAmount) < 0.1) {//if very close to 0
        playerlist[id].recoilYAmount = 0;
      }
    }
  }

  function playerCollide(id, playerlist, location) {
    if (
      playerlist[id].spawnProtection >= playerlist[id].spawnProtectionDuration
    ) {
      //if player dont have spawn protection
      var elements = playerTree.retrieve({
        x: playerlist[id].x - playerlist[id].width,
        y: playerlist[id].y - playerlist[id].width,
        width: playerlist[id].width * 2,
        height: playerlist[id].width * 2,
      });
      for (let thing of elements) {
        var playerId = thing.id;
        if (playerlist.hasOwnProperty(playerId) && id != playerId) {
          //if player still exists, and not the same tanks
          if (playerlist[playerId].developer == "no" && playerlist[id].developer == "no") {
            if (playerlist[playerId].team == "none" || (playerlist[playerId].team != playerlist[id].team)) {
              //if ffa, or different team in 2tdm

              //if not developer
              //check if player and shape still exists as might have been killed previously in this loop
              var DistanceBetween = Math.sqrt(
                (playerlist[id].x - playerlist[playerId].x) *
                (playerlist[id].x - playerlist[playerId].x) +
                (playerlist[id].y - playerlist[playerId].y) *
                (playerlist[id].y - playerlist[playerId].y)
              ); //calculate distance between center of players
              if (DistanceBetween <= playerlist[id].width + playerlist[playerId].width) {
                //crashed
                //only do for playerlist[id] because the loop loops through all players, so if two players crash, playerlist[id] will occur twice, referring to different player each time
                playerlist[id].hit++;
                playerlist[id].health -= playerlist[playerId].damage;
                playerlist[id].healthRegenTimeChange =
                  playerlist[id].healthRegenTime; //reset time to next health regeneration
                var anglehit = Math.atan2(
                  playerlist[playerId].y - playerlist[id].y,
                  playerlist[playerId].x - playerlist[id].x
                );
                //the above calculates the angle between players
                var speedMove = 1; //smaller number means move slower
                //move the player away from other player. only one as both player will have individual loop
                playerlist[playerId].x += Math.cos(anglehit) * speedMove * delta;
                playerlist[playerId].y += Math.sin(anglehit) * speedMove * delta;
                //remove player if zero health
                if (playerlist[playerId].health <= 0) {
                  playerlist[id].score += Math.round(playerlist[playerId].score / 2);//only gain half the score
                  var packet = JSON.stringify(["newNotification",
                    "You killed " + playerlist[playerId].name,
                    "dimgrey"]);
                  lookup[id].send(packet);//send kill notification

                  var packet = JSON.stringify(["youDied",
                    playerlist[id].name,
                    playerlist[playerId],
                    respawnScoreDivision,
                    respawnScoreLimit]);
                  lookup[playerId].send(packet);
                  addDeadObject(playerlist, playerId, "player");
                  delete playerlist[playerId]; //player killed
                  console.log("someone died");
                } else if (playerlist[id].health <= 0) {
                  playerlist[playerId].score += Math.round(playerlist[id].score / 2);//only gain half the score
                  var packet = JSON.stringify(["newNotification",
                    "You killed " + playerlist[id].name,
                    "dimgrey"]);
                  lookup[playerId].send(packet);//send kill notification
                  var packet = JSON.stringify(["youDied",
                    playerlist[playerId].name,
                    playerlist[id],
                    respawnScoreDivision,
                    respawnScoreLimit]);
                  lookup[id].send(packet);
                  addDeadObject(playerlist, id, "player");
                  delete playerlist[id]; //player killed
                  console.log("someone died");
                  //break from loop to prevent undefined player
                  break
                }
              }
            }
          }
        }
      }
    }
  }
  function playerCollideDef(defenderlist, defid) {
    //2tdm collision with base defenders
    var elements = playerTree.retrieve({
      x: defenderlist[defid].x - defenderlist[defid].width,
      y: defenderlist[defid].y - defenderlist[defid].width,
      width: defenderlist[defid].width * 2,
      height: defenderlist[defid].width * 2,
    });
    for (let thing of elements) {
      var id = thing.id;
      if (players.hasOwnProperty(id)) {
        var DistanceBetween = Math.sqrt(
          (players[id].x - defenderlist[defid].x) *
          (players[id].x - defenderlist[defid].x) +
          (players[id].y - defenderlist[defid].y) *
          (players[id].y - defenderlist[defid].y)
        ); //calculate distance
        if (DistanceBetween <= players[id].width + defenderlist[defid].width) {
          //crashed
          var anglehit = Math.atan2(
            defenderlist[defid].y - players[id].y,
            defenderlist[defid].x - players[id].x
          );
          if (DistanceBetween == 0) {//or else wont move cuz players spawn exactly on top of defenders
            DistanceBetween = 1;
          }
          //the above calculates the angle
          players[id].x -= Math.cos(anglehit) * DistanceBetween / 2 * delta;
          players[id].y -= Math.sin(anglehit) * DistanceBetween / 2 * delta;
        }
      }
    }
    //defender check for target player
    defenderlist[defid].target = "";//reset
    var elements = playerTree.retrieve({
      x: defenderlist[defid].x - defStats.defenderFOV,
      y: defenderlist[defid].y - defStats.defenderFOV,
      width: defStats.defenderFOV * 2,
      height: defStats.defenderFOV * 2,
    });
    for (let thing of elements) {
      var id = thing.id;
      if (players.hasOwnProperty(id)) {
        if (players[id].team != defenderlist[defid].team) {
          //different team, then calculate distanc between, and attack using drones if within fov
          var DistanceBetween = Math.sqrt(
            (defenderlist[defid].x - players[id].x) *
            (defenderlist[defid].x - players[id].x) +
            (defenderlist[defid].y - players[id].y) *
            (defenderlist[defid].y - players[id].y)
          );
          if (DistanceBetween <= defStats.defenderFOV) {
            //this player is a target!
            defenderlist[defid].target = id;//player's id
          }
        }
      }
    }
    //rotate defender to face target
    if (defenderlist[defid].target != "") {
      var anglehit = Math.atan2(
        players[defenderlist[defid].target].y - defenderlist[defid].y,
        players[defenderlist[defid].target].x - defenderlist[defid].x
      );
      defenderlist[defid].angle += (anglehit - defenderlist[defid].angle) / 5;//rotate towards actual angle
      if (Math.abs(anglehit - defenderlist[defid].angle) < 0.1) {//if difference between def angle and angle towards target is small, then make defender have actual angle
        defenderlist[defid].angle = anglehit;
      }
    }
    else {//if no target, rotate back to original position
      defenderlist[defid].angle += (0 - defenderlist[defid].angle) / 5;//rotate towards actual angle
      if (Math.abs(0 - defenderlist[defid].angle) < 0.1) {//if difference between def angle and angle towards target is small, then make defender have actual angle
        defenderlist[defid].angle = 0;
      }
    }
  }
  function defdronecollide(bulletlist, id) {//collision between base defender's drones (better collision code compared to player's drone code)
    if (bulletlist[id].owner.target == "") {
      //move towards center of base defender
      var anglehit = Math.atan2(
        bulletlist[id].y - bulletlist[id].owner.y,
        bulletlist[id].x - bulletlist[id].owner.x
      );
      bulletlist[id].x -= Math.cos(anglehit) * bulletlist[id].amountAddWhenMove / 2 * delta;
      bulletlist[id].y -= Math.sin(anglehit) * bulletlist[id].amountAddWhenMove / 2 * delta;//move back to defender at reduced speed
    }
    else {
      //move towards target player
      var playerid = bulletlist[id].owner.target;
      var anglehit = Math.atan2(
        bulletlist[id].y - players[playerid].y,
        bulletlist[id].x - players[playerid].x
      );
      bulletlist[id].x -= Math.cos(anglehit) * bulletlist[id].amountAddWhenMove * delta;
      bulletlist[id].y -= Math.sin(anglehit) * bulletlist[id].amountAddWhenMove * delta;
    }
    //collision between drones

    var elements = defbulletTree.retrieve({
      x: bulletlist[id].x - bulletlist[id].width,
      y: bulletlist[id].y - bulletlist[id].width,
      width: bulletlist[id].width * 2,
      height: bulletlist[id].width * 2,
    });
    for (let thing of elements) {
      var bulletId = thing.id;
      if (bulletlist.hasOwnProperty(bulletId)) {
        var DistanceBetween = Math.sqrt(
          (bulletlist[id].x - bulletlist[bulletId].x) *
          (bulletlist[id].x - bulletlist[bulletId].x) +
          (bulletlist[id].y - bulletlist[bulletId].y) *
          (bulletlist[id].y - bulletlist[bulletId].y)
        ); //calculate distance
        if (DistanceBetween <= bulletlist[id].width + bulletlist[bulletId].width) {
          //crashed
          var anglehit = Math.atan2(
            bulletlist[id].y - bulletlist[bulletId].y,
            bulletlist[id].x - bulletlist[bulletId].x
          );
          //the above calculates the angle
          bulletlist[id].x += Math.cos(anglehit) * DistanceBetween / 2 * delta;
          bulletlist[id].y += Math.sin(anglehit) * DistanceBetween / 2 * delta;
        }
      }
    }
    //collision with players
    var elements = playerTree.retrieve({
      x: bulletlist[id].x - bulletlist[id].width,
      y: bulletlist[id].y - bulletlist[id].width,
      width: bulletlist[id].width * 2,
      height: bulletlist[id].width * 2,
    });
    for (let thing of elements) {
      var playerId = thing.id;
      if (players.hasOwnProperty(playerId)) {
        if (players[playerId].team != bulletlist[id].owner.team) {
          if (
            players[playerId].spawnProtection >=
            players[playerId].spawnProtectionDuration
          ) {
            var DistanceBetween = Math.sqrt(
              (bulletlist[id].x - players[playerId].x) *
              (bulletlist[id].x - players[playerId].x) +
              (bulletlist[id].y - players[playerId].y) *
              (bulletlist[id].y - players[playerId].y)
            ); //calculate distance
            if (DistanceBetween <= bulletlist[id].width + players[playerId].width) {
              //crashed
              players[playerId].hit++;
              bulletlist[id].hit++;
              players[playerId].health -= bulletlist[id].damage; //player damaged
              bulletlist[id].health -= players[playerId].damage; //drone also damaged
              players[playerId].healthRegenTimeChange =
                players[playerId].healthRegenTime; //reset time to next health regeneration
              //remove player if zero health
              if (players[playerId].health <= 0) {
                var packet = JSON.stringify(["youDied",
                  "base defender",
                  players[playerId],
                  respawnScoreDivision,
                  respawnScoreLimit]);
                lookup[playerId].send(packet);
                addDeadObject(players, playerId, "player");
                delete players[playerId]; //player killed
                console.log("someone died");
              }
              //bullet's health if 0
              else if (bulletlist[id].health <= 0) {
                addDeadObject(bulletlist, id, "defbullet");
                delete bulletlist[id];
              }
              else {
                var anglehit = Math.atan2(
                  bulletlist[id].y - players[playerId].y,
                  bulletlist[id].x - players[playerId].x
                );
                //the above calculates the angle
                bulletlist[id].x += Math.cos(anglehit) * DistanceBetween / 2 * delta;
                bulletlist[id].y += Math.sin(anglehit) * DistanceBetween / 2 * delta;
              }
            }
          }
        }
      }
    }

  }
  function playerCollideShape(id, playerlist, shapelist, location) {
    if (
      playerlist.hasOwnProperty(id) &&
      playerlist[id].spawnProtection >= playerlist[id].spawnProtectionDuration
    ) {
      //if player dont have spawn protection and if player wasnt killed in the game loop
      var elements = shapeTree.retrieve({
        x: playerlist[id].x - playerlist[id].width,
        y: playerlist[id].y - playerlist[id].width,
        width: playerlist[id].width * 2,
        height: playerlist[id].width * 2,
      });
      for (let thing of elements) {
        var shapeId = thing.id;
        if (shapelist.hasOwnProperty(shapeId)) {
          //check if shape still exists as might have been killed previously in this loop
          var DistanceBetween = Math.sqrt(
            (playerlist[id].x - shapelist[shapeId].x) *
            (playerlist[id].x - shapelist[shapeId].x) +
            (playerlist[id].y - shapelist[shapeId].y) *
            (playerlist[id].y - shapelist[shapeId].y)
          ); //calculate distance between center of players
          if (
            DistanceBetween <=
            playerlist[id].width + shapelist[shapeId].width
          ) {
            //crashed
            shapelist[shapeId].hit++;
            playerlist[id].hit++;
            shapelist[shapeId].health -= playerlist[id].damage;
            playerlist[id].health -= shapelist[shapeId].damage;
            playerlist[id].healthRegenTimeChange =
              playerlist[id].healthRegenTime; //reset time to next health regeneration
            var anglehit = Math.atan2(
              playerlist[id].y - shapelist[shapeId].y,
              playerlist[id].x - shapelist[shapeId].x
            );
            //the above calculates the angle between players
            var speedMove =
              (playerlist[id].width +
                shapelist[shapeId].width -
                DistanceBetween) /
              10; //distance of overlap divided by ten, so that player have increasing friction as it moves towards shape center
            //move the player away from the shape
            playerlist[id].x += Math.cos(anglehit) * speedMove * delta;
            playerlist[id].y += Math.sin(anglehit) * speedMove * delta;
            //check if player attacked this shape before
            var attackedShapeBefore = "no";
            for (let attackerid in shapelist[shapeId].attackers) {
              if (shapelist[shapeId].attackers[attackerid] == playerlist[id]) {
                attackedShapeBefore = "yes";
                break
              }
            }
            if (attackedShapeBefore == "no") {
              //if havent attacked shape before, add player to list of people who attacked the shape
              shapelist[shapeId].attackers[id] = playerlist[id];
            }

            if (playerlist[id].health <= 0) {
              var packet = JSON.stringify(["youDied",
                shapelist[shapeId].sides,
                playerlist[id],
                respawnScoreDivision,
                respawnScoreLimit]);
              lookup[id].send(packet);
              addDeadObject(playerlist, id, "player");
              delete playerlist[id]; //player killed
              console.log("someone died");
              break
            }
          }
        }
      }
    }
  }
  function playerCollideSpawner(playerlist, id, spawner) {
    var DistanceBetween = Math.sqrt(
      (playerlist[id].x - spawner.x) * (playerlist[id].x - spawner.x) +
      (playerlist[id].y - spawner.y) * (playerlist[id].y - spawner.y)
    ); //calculate distance between player and spawner
    if (DistanceBetween <= playerlist[id].width + spawner.width) {
      //crashed
      /*
          var anglehit = Math.atan2(
            playerlist[id].y - spawner.y,
            playerlist[id].x - spawner.x
          );
          */
      //the above calculates the angle between players
      var speedMove = playerlist[id].width + spawner.width - DistanceBetween; //distance of overlap
      //move the player through the first barrel (60 degrees)
      playerlist[id].x +=
        Math.cos(spawner.angle + (60 * Math.PI) / 180) *
        speedMove *
        delta *
        0.5;
      playerlist[id].y +=
        Math.sin(spawner.angle + (60 * Math.PI) / 180) *
        speedMove *
        delta *
        0.5;
    }
  }
  function playerCollidePortal(
    id,
    playerlist,
    portallist,
    location,
    newlocation
  ) {
    if (playerlist.hasOwnProperty(id)) {
      if (portallist == cavernportals) {
        var elements = cavernportalTree.retrieve({
          x: playerlist[id].x - playerlist[id].width,
          y: playerlist[id].y - playerlist[id].width,
          width: playerlist[id].width * 2,
          height: playerlist[id].width * 2,
        });
      }
      else if (portallist == sancportals) {
        var elements = sancportalTree.retrieve({
          x: playerlist[id].x - playerlist[id].width,
          y: playerlist[id].y - playerlist[id].width,
          width: playerlist[id].width * 2,
          height: playerlist[id].width * 2,
        });
      }
      else {
        var elements = portalTree.retrieve({
          x: playerlist[id].x - playerlist[id].width,
          y: playerlist[id].y - playerlist[id].width,
          width: playerlist[id].width * 2,
          height: playerlist[id].width * 2,
        });
      }
      for (let thing of elements) {
        var portalId = thing.id;
        if (portallist.hasOwnProperty(portalId)) {
          //check if player and portal still exists as might have been killed previously in this loop
          var DistanceBetween = Math.sqrt(
            (playerlist[id].x - portallist[portalId].x) *
            (playerlist[id].x - portallist[portalId].x) +
            (playerlist[id].y - portallist[portalId].y) *
            (playerlist[id].y - portallist[portalId].y)
          ); //calculate distance between center of players
          if (
            DistanceBetween <=
            playerlist[id].width + portallist[portalId].width
          ) {
            //crashed with portal
            portallist[portalId].peopleTouch++;
            //add to list of players that crashed
            portallist[portalId].newList.push(id);
            //move player towards center of portal
            var stepWidthFactor = 30; //this number MUST be more or equal to one. The HIGHER the number, the SLOWER the player is sucked into the center of the portal
            var sizeOfHitBox = 20; //size of area in center of portal which player need to touch in order to teleport
            if (
              Math.abs(playerlist[id].x - portallist[portalId].x) >
              sizeOfHitBox ||
              Math.abs(playerlist[id].y - portallist[portalId].y) > sizeOfHitBox
            ) {
              //if player is not at center of portal
              playerlist[id].x +=
                ((playerlist[id].x - portallist[portalId].x) /
                  stepWidthFactor) *
                -1;
              playerlist[id].y +=
                ((playerlist[id].y - portallist[portalId].y) /
                  stepWidthFactor) *
                -1;
            } else {
              //player at center of portal
              if (portallist[portalId].ruptured == 1 && location != "cr") {//if portal is ruptured
                newlocation = "cr";
              }
              else if (portallist[portalId].destination) {
                newlocation = portallist[portalId].destination;
              }
              //Connect to target dimension server
              if (gamemode != "editor" && playerlist[id].teleporting != "yes") {
                var serverURL = "";
                if (newlocation == "dune") {
                  serverURL = serverURLs[1];
                }
                else if (newlocation == "arena") {
                  serverURL = serverURLs[0];
                }
                else if (newlocation == "cavern") {
                  serverURL = serverURLs[3];
                }
                else if (newlocation == "cr") {
                  serverURL = serverURLs[4];
                }
                else if (newlocation == "sanc") {
                  serverURL = serverURLs[2];
                }
                else if (newlocation == "2tdm") {
                  serverURL = serverURLs[5];
                }

                var packetToMainServer = [playerlist[id], newlocation, id, process.env.teleportingPassword];//send password to verify that this is an actual teleport
                console.log("posting request...")
                axios.post(serverURL, packetToMainServer)
                  .then(function(response) {
                    //console.log(response);
                    console.log("teleported!")
                    //remove player
                    addDeadObject(playerlist, id, "player", "yes");
                    deadPlayers[findIpUsingId[id]] = 0;//dont allow respawn with score when teleport back/respawn in this server
                    delete playerlist[id];
                    //tell client to teleport to dune
                    var packet = JSON.stringify(["teleport", newlocation]);
                    lookup[id].send(packet);
                  })
                  .catch(function(error) {
                    console.log("Connectivity error");
                    playerlist[id].teleporting = "no";
                    var packet = JSON.stringify(["newNotification", "Failed to teleport to " + newlocation + ". This server may be currently unavailable.", "red"]);
                    lookup[id].send(packet);
                  });
              }
              playerlist[id].teleporting = "yes";//prevent multiple telepotring requests sent to target server
              //break from loop
              break
            }
          }
        }
      }
    }
  }
  function pushPlayerFromPortal(id, playerlist, portallist) {
    //e.g. for sanctuary portals that dont allow u to go inside
    if (playerlist.hasOwnProperty(id)) {
      if (portallist == portals) {
        var elements = portalTree.retrieve({
          x: playerlist[id].x - playerlist[id].width,
          y: playerlist[id].y - playerlist[id].width,
          width: playerlist[id].width * 2,
          height: playerlist[id].width * 2,
        });
      } else if (portallist == cavernportals) {
        var elements = cavernportalTree.retrieve({
          x: playerlist[id].x - playerlist[id].width,
          y: playerlist[id].y - playerlist[id].width,
          width: playerlist[id].width * 2,
          height: playerlist[id].width * 2,
        });
      } else if (portallist == sancportals) {
        var elements = sancportalTree.retrieve({
          x: playerlist[id].x - playerlist[id].width,
          y: playerlist[id].y - playerlist[id].width,
          width: playerlist[id].width * 2,
          height: playerlist[id].width * 2,
        });
      } else {
        var elements = []; //if not will cause error
      }
      elements.forEach((thing) => {
        var portalId = thing.id;
        if (
          portallist.hasOwnProperty(portalId) &&
          playerlist.hasOwnProperty(id)
        ) {
          //check if player and portal still exists as might have been killed previously in this loop
          var DistanceBetween = Math.sqrt(
            (playerlist[id].x - portallist[portalId].x) *
            (playerlist[id].x - portallist[portalId].x) +
            (playerlist[id].y - portallist[portalId].y) *
            (playerlist[id].y - portallist[portalId].y)
          ); //calculate distance between center of players
          if (
            DistanceBetween <=
            playerlist[id].width + portallist[portalId].width
          ) {
            //crashed with portal
            var anglehit = Math.atan2(
              playerlist[id].y - portallist[portalId].y,
              playerlist[id].x - portallist[portalId].x
            );
            //the above calculates the angle between players
            var speedMove =
              playerlist[id].width +
              portallist[portalId].width -
              DistanceBetween; //distance of overlap divided by ten, so that player have increasing friction as it moves towards shape center
            //move the player away from the shape
            playerlist[id].x += Math.cos(anglehit) * speedMove * delta;
            playerlist[id].y += Math.sin(anglehit) * speedMove * delta;
          }
        }
      });
    }
  }
  function removePortal(id, portallist, location) {
    if (portallist[id].timer <= 0) {
      //remove portal
      addDeadObject(portallist, id, "portal");
      if (location == "cr") {
        var arrayValue = portallist[id].where
        portalLocations[arrayValue].portalHere = "no";//allow another portal to spawn in the fixed location for crossroads
      }
      delete portallist[id];
    } else {
      portallist[id].timer--;
    }
  }
  function rotateSpawner(spawner) {
    spawner.angle = (((spawner.angle * 180) / Math.PI + 0.1) * Math.PI) / 180; //0.1 refers to speed of rotation
  }
  function moveBotDune(id, location) {
    //if bot no health, give score to everyone who dealed damage to it, and then remove the bot
    if (bots[id].health <= 0) {
      var scoreToGive = Math.round(
        bots[id].score / Object.keys(bots[id].attackers).length
      ); //split score among all killers
      for (const attackerid in bots[id].attackers) {
        bots[id].attackers[attackerid].score += scoreToGive;
      }
      addDeadObject(bots, id, "bot");
      delete bots[id];
    } else {
      //find nearest player
      var distance = "unknown";
      var target = "unknown";
      for (const playerId in players) {
        var DistanceBetween = Math.sqrt(
          (bots[id].x - players[playerId].x) *
          (bots[id].x - players[playerId].x) +
          (bots[id].y - players[playerId].y) *
          (bots[id].y - players[playerId].y)
        ); //calculate distance between bot and player
        if (DistanceBetween <= bots[id].fov) {
          if (distance == "unknown") {
            distance = DistanceBetween;
            target = players[playerId];
          } else if (DistanceBetween < distance) {
            distance = DistanceBetween;
            target = players[playerId];
          }
        }
      }
      //move bot towards nearest player
      var DistanceBetween = Math.sqrt(
        (bots[id].x - target.x) * (bots[id].x - target.x) +
        (bots[id].y - target.y) * (bots[id].y - target.y)
      ); //calculate distance between bot and target
      if (DistanceBetween > bots[id].width + target.width) {
        //if bot has not hit player yet
        if (bots[id].speed > DistanceBetween * delta) {
          var movespeed = DistanceBetween * delta;
        } else {
          var movespeed = bots[id].speed;
        }
        var anglehit = Math.atan2(
          target.y - bots[id].y,
          target.x - bots[id].x
        );
        bots[id].x += Math.cos(anglehit) * movespeed;
        bots[id].y += Math.sin(anglehit) * movespeed;
        bots[id].angle = anglehit;
        bots[id].shooting = "yes";

        //cluster spawns minions when triggered
        if (bots[id].name == "Cluster") {
          let choose = Math.floor(Math.random() * 100);
          if (choose == 1) {
            let ranAngle = Math.floor(Math.random() * 2 * Math.PI);//spawn minion anywhere around the bot, cannot spawn directly on bot or else will collide and move away
            spawnBot(bots[id].x + Math.cos(ranAngle) * bots[id].width, bots[id].y + Math.sin(ranAngle) * bots[id].width, "Pursuer", 4, 40, 1000, 100, 0.05, 7, 1000, 3, {
              barrelOne: {
                barrelWidth: 30,
                barrelHeight: 70,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 15, //delay between bullets
                bulletHealth: 50,
                bulletDamage: 0.2,
                bulletTimer: 10,
                bulletSpeed: 30,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0,
                recoil: 1,
              },
            })
          }
        }
        else if (bots[id].name == "Infestor") {
          let choose = Math.floor(Math.random() * 300);
          if (choose == 1) {
            let ranAngle = Math.floor(Math.random() * 2 * Math.PI);
            spawnBot(bots[id].x + Math.cos(ranAngle) * bots[id].width, bots[id].y + Math.sin(ranAngle) * bots[id].width, "Pillbox", 8, 40, 4000, 100, 0.05, 7, 1000, 3, {
              barrelOne: {
                barrelWidth: 30,
                barrelHeight: 45,
                additionalAngle: 0,
                x: 0,
                barrelMoveIncrement: 0,
                barrelType: "bullet",
                reloadRecover: 10, //delay between bullets
                bulletHealth: 50,
                bulletDamage: 0.1,
                bulletTimer: 15,
                bulletSpeed: 30,
                barrelHeightChange: 0,
                shootingState: "no",
                reload: 0,
                recoil: 1,
              },
            })
          }
          else if (choose > 1 && choose < 10) {
            let ranAngle = Math.floor(Math.random() * 2 * Math.PI);
            spawnBot(bots[id].x + Math.cos(ranAngle) * bots[id].width, bots[id].y + Math.sin(ranAngle) * bots[id].width, "Leech", 4, 40, 4000, 50, 0.05, 15, 1000, 3, {})
          }
        }

        for (const playerId in bots) {
          //collision between bots
          var DistanceBetween = Math.sqrt(
            (bots[id].x - bots[playerId].x) *
            (bots[id].x - bots[playerId].x) +
            (bots[id].y - bots[playerId].y) *
            (bots[id].y - bots[playerId].y)
          ); //calculate distance between center of bots
          if (
            DistanceBetween < bots[id].width + bots[playerId].width &&
            id != playerId
          ) {
            //crashed
            bots[id].x -=
              ((Math.cos(
                Math.atan2(
                  bots[playerId].y - bots[id].y,
                  bots[playerId].x - bots[id].x
                )
              ) *
                (bots[id].width +
                  bots[playerId].width -
                  DistanceBetween)) /
                5) *
              delta;
            bots[id].y -=
              ((Math.sin(
                Math.atan2(
                  bots[playerId].y - bots[id].y,
                  bots[playerId].x - bots[id].x
                )
              ) *
                (bots[id].width +
                  bots[playerId].width -
                  DistanceBetween)) /
                5) *
              delta;
          }
        }
      } else if (target == "unknown") {
        //if no target, then bot go back home
        /*
           var anglehit = Math.atan2(
                bots[id].homeY - bots[id].y,
                bots[id].homeX - bots[id].x
           );
           bots[id].x += Math.cos(anglehit) * bots[id].speed;
           bots[id].y += Math.sin(anglehit) * bots[id].speed;
           bots[id].angle = anglehit;
           bots[id].shooting = "no";
           */
        bots[id].shooting = "no";
      }
    }
  }
  function checkIfRuptured(portalid, portallist) {
    if (portallist[portalid].ruptured != 1) {
      //portal not ruptured
      let difference = portallist[portalid].prevList
        .filter((x) => !portallist[portalid].newList.includes(x))
        .concat(
          portallist[portalid].newList.filter(
            (x) => !portallist[portalid].prevList.includes(x)
          )
        ); //number of players that just enter or exit the portal
      //difference is an array containing the ids of players that recently exited or entered the portal
      portallist[portalid].enterNumber += difference.length;
      if (portallist[portalid].enterNumber >= 6) {
        //6 times of entering or exiting (3 times of enter + exit portal)
        portallist[portalid].ruptured = 1;
        console.log("successfully ruptured");
      }
    }
  }
  function healthRegenerate(id, playerlist) {
    if (playerlist[id].health < playerlist[id].maxhealth) {
      playerlist[id].healthRegenTimeChange--;
      if (playerlist[id].healthRegenTimeChange <= 0) {
        playerlist[id].health += playerlist[id].healthRegenSpeed;
      }
    }
    else {
      if (playerlist[id].healthRegenTimeChange <= 0) {
        playerlist[id].healthRegenTimeChange = playerlist[id].healthRegenTime; //reset time to next health regeneration
        playerlist[id].health = playerlist[id].maxhealth; //make sure health exactly at max health, it is possible for health to be more than maxhealth if the damage to health is a percentage or the health regen is very high
      }
    }
  }

  function sendStuffToClient(
    objectlist,
    objectId,
    playerlist,
    playerId,
    objecttype,
    neededProperties
  ) {
    //used to check if an object is visible on client's screen

    //check if object visible. even though use quadtree, these will send all the objects in the box, not just in the visible range
    if (
      Math.abs(objectlist[objectId].y - playerlist[playerId].y) <=
      ((1080 / 2) * playerlist[playerId].fovMultiplier + objectlist[objectId].width) &&
      Math.abs(objectlist[objectId].x - playerlist[playerId].x) <=
      ((1920 / 2) * playerlist[playerId].fovMultiplier + objectlist[objectId].width)
    ) {//check if visible on screen
      //if (!items.hasOwnProperty(objecttype)) {
      if (!(objecttype in items)) {//NEED brackets around in operator or else will always return false
        items[objecttype] = {};
      }
      items[objecttype][objectId] = {};
      if (neededProperties != "all") {
        for (let prop of neededProperties) {
          //neededProperties.forEach((prop) => {
          if (prop != "barrels" && prop != "bodybarrels") {
            //if property is not barrels
            items[objecttype][objectId][prop] = objectlist[objectId][prop];
          } else {
            //if it is a barrel
            items[objecttype][objectId][prop] = {};
            for (const barrel in objectlist[objectId][prop]) {
              items[objecttype][objectId][prop][barrel] = {};
              //properties needed for barrels
              items[objecttype][objectId][prop][barrel].barrelWidth =
                objectlist[objectId][prop][barrel].barrelWidth;
              items[objecttype][objectId][prop][barrel].barrelHeight =
                objectlist[objectId][prop][barrel].barrelHeight;
              items[objecttype][objectId][prop][barrel].additionalAngle =
                objectlist[objectId][prop][barrel].additionalAngle;
              items[objecttype][objectId][prop][barrel].x =
                objectlist[objectId][prop][barrel].x;
              items[objecttype][objectId][prop][barrel].barrelType =
                objectlist[objectId][prop][barrel].barrelType;
              items[objecttype][objectId][prop][barrel].barrelHeightChange =
                objectlist[objectId][prop][barrel].barrelHeightChange;
            }
          }
          //});
        }
      } else {
        items[objecttype][objectId] = { ...objectlist[objectId] }; //completely copy object
      }
      if (objecttype == "bullet") {
        if (objectlist[objectId].ownerId == playerId) {
          //if bullet belongs to this player
          items[objecttype][objectId].ownsIt = "yes";
        }
      }
      if (objectId == playerId) {
        //if this is the tank that player is controlling
        items[objecttype][objectId].score = objectlist[objectId].score;
        items[objecttype][objectId].tankTypeLevel = objectlist[objectId].tankTypeLevel;
        items[objecttype][objectId].bodyTypeLevel = objectlist[objectId].bodyTypeLevel;
        items[objecttype][objectId].skillPoints = objectlist[objectId].skillPoints;
        items[objecttype][objectId].unusedPoints = objectlist[objectId].unusedPoints;
        items[objecttype][objectId].autorotate = objectlist[objectId].autorotate;
        items[objecttype][objectId].fastautorotate = objectlist[objectId].fastautorotate;
      }
    }
  }

  //spawn bots
  function spawnBot(x, y, name, sides, width, score, maxhealth, damage, speed, fov, hive, barrels) {
    if (hive == 1) {
      firstHive++;
    }
    else if (hive == 2) {
      secondHive++;
    }
    else if (hive == 3) {
      thirdHive++;
    }
    else if (hive == 4) {
      fourthHive++;
    }
    bots[botID] = {
      x: x,
      y: y,
      name: name,
      width: width,
      score: score,
      health: maxhealth,
      maxhealth: maxhealth,
      damage: damage,
      speed: speed,
      hit: 0,
      attackers: {},
      fov: fov,
      angle: 0,
      barrels: barrels,
      shooting: "no",
      hive: hive,
      side: sides,
    };
    botID++;
  }
  function spawnRocks(minSides, maxSides, vertexVariation, width, score, health, damage, name) {
    rockHive++;
    //rock spawn range: 2000 to 4000
    let rockX = Math.floor(Math.random() * gameSize);
    let rockY = Math.floor(Math.random() * gameSize);
    var randomPointsX = [];
    var randomPointsY = [];
    var sides = Math.floor(Math.random() * maxSides) + minSides;
    for (var i = 1; i <= sides + 1; i++) {
      var XRandom = Math.floor(Math.random() * vertexVariation); //generate random points so it doesnt look like a perfect polygon
      var YRandom = Math.floor(Math.random() * vertexVariation);
      randomPointsX.push(XRandom);
      randomPointsY.push(YRandom);
    }
    bots[botID] = {
      x: rockX,
      y: rockY,
      name: name,
      width: width,
      height: width,
      score: score,
      health: health,
      maxhealth: health,
      damage: damage,
      speed: 0,
      hit: 0,
      attackers: {},
      fov: 1000,//needed or else rocks will overlap, DO NOT set to 0
      hive: 5,
      randomPointsArrayX: randomPointsX,
      randomPointsArrayY: randomPointsY,
      angle: 0,
      barrels: {},
      shooting: "no",
      side: sides,
    };
    botID++;
  }

  function clock(start) {
    //function for measuring code execution time
    if (!start) return process.hrtime();
    var end = process.hrtime(start);
    return Math.round(end[0] * 1000 + end[1] / 1000000);
  }

  function spawnShape(region, health, damage, size, score, sides, weight, speed, rotate, path) {//normal shape
    if (region == 1) {//anywhere on the map
      var shapeX = Math.floor(Math.random() * gameSize);
      var shapeY = Math.floor(Math.random() * gameSize);
    }
    else if (region == 2) {//smaller area on the map
      var shapeX = Math.floor(Math.random() * gameSize / 2) + gameSize / 4;
      var shapeY = Math.floor(Math.random() * gameSize / 2) + gameSize / 4;
    }
    else if (region == 3) {//near center of the map
      var shapeX = Math.floor(Math.random() * gameSize / 5) + gameSize / 2.5;
      var shapeY = Math.floor(Math.random() * gameSize / 5) + gameSize / 2.5;
    }
    var startAngle = Math.floor(Math.random() * 11) / 10; //random shape's angle range from 0.0 to 1.0
    shapes[shapeID] = {
      x: shapeX, //current poisition of shape
      y: shapeY,
      centerOfRotationX: shapeX, //shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0, //actual rotation of the shape
      health: health,
      maxhealth: health,
      damage: damage, //for shapes colliding with players, not bullets
      width: size,
      height: size,
      score: score,
      sides: sides,
      hit: 0,
      attackers: {},
      weight: weight, //range between 0 and 1
      speed: speed,
      rotateSpeed: rotate,
      pathRadius: path, //radius of circular path that shape moves
    };
    shapeID++;
  }
  function spawnRadShape(region, health, damage, size, score, sides, weight, speed, rotate, path) {//radiant shape
    if (region == 1) {//anywhere on the map
      var shapeX = Math.floor(Math.random() * gameSize);
      var shapeY = Math.floor(Math.random() * gameSize);
    }
    else if (region == 2) {//smaller area on the map
      var shapeX = Math.floor(Math.random() * gameSize / 2) + gameSize / 4;
      var shapeY = Math.floor(Math.random() * gameSize / 2) + gameSize / 4;
    }
    else if (region == 3) {//near center of the map
      var shapeX = Math.floor(Math.random() * gameSize / 5) + gameSize / 2.5;
      var shapeY = Math.floor(Math.random() * gameSize / 5) + gameSize / 2.5;
    }
    var startAngle = Math.floor(Math.random() * 11) / 10; //random shape's angle range from 0.0 to 1.0
    //for radiant shapes
    var radchoose = Math.floor(Math.random() * 100);
    if (radchoose >= 0 && radchoose <= 55) {
      var radTier = 1;
    } else if (radchoose >= 56 && radchoose <= 95) {
      var radTier = 2;
    } else if (radchoose >= 96 && radchoose <= 98) {
      var radTier = 3;
    } else if (radchoose == 99) {
      var radTier = 4;
    } else {
      var radTier = 5;
    }
    shapes[shapeID] = {
      x: shapeX, //current poisition of shape
      y: shapeY,
      centerOfRotationX: shapeX, //shape moves in circular motion around this point
      centerOfRotationY: shapeY,
      motionAngle: startAngle,
      angle: 0, //actual rotation of the shape
      health: health,
      maxhealth: health,
      damage: damage, //for shapes colliding with players, not bullets
      width: size,
      height: size,
      radtier: radTier,
      score: score * radTier,
      sides: sides,
      hit: 0,
      attackers: {},
      weight: weight, //range between 0 and 1
      speed: speed,
      rotateSpeed: rotate,
      pathRadius: path, //radius of circular path that shape moves
    };
    shapeID++;
  }

  //get difference between 2 objects
  const diff = (old, cur, result = {}) => {

    for (const k in cur) {
      if (Object.is(old[k], cur[k])) {
        continue;
      }
      if (cur[k].__proto__ === Object.prototype && old[k]) {
        diff(old[k], cur[k], result[k] = {});
      } else {
        if (!Array.isArray(cur[k]) || JSON.stringify(old[k]) != JSON.stringify(cur[k])) {//not array, or arrays not the same
          result[k] = cur[k];
          if (typeof result[k] === "number") {
            result[k] = Math.round(result[k] * 100) / 100;//round numbers to 2dp so they take up less bandwidth
          }
        }
      }
    }
    for (const k in old) {
      if (!(k in cur)) {
        result[k] = 'del';
      }
    }
    return result;

  };

  function gameLoop() {
    //this gameloop function keep running in the server if there are people
    //this game loop is for ARENA

    //purpose of hit value is to tell client whether object hit or not so it will flash the object, everytime a object is hit, it's hit value increases

    //for quadtree
    bulletTree.clear();
    for (const id in bullets) {
      bullets[id].hit = 0; //reset hit value
      bulletTree.insert({
        x: bullets[id].x - bullets[id].width,
        y: bullets[id].y - bullets[id].width,
        width: bullets[id].width * 2,
        height: bullets[id].width * 2,
        id: id,
      });
    }
    shapeTree.clear();
    for (const id in shapes) {
      shapes[id].hit = 0; //reset hit value
      shapeTree.insert({
        x: shapes[id].x - shapes[id].width,
        y: shapes[id].y - shapes[id].width,
        width: shapes[id].width * 2,
        height: shapes[id].width * 2,
        id: id,
      });
    }
    playerTree.clear();
    for (const id in players) {
      players[id].hit = 0; //reset hit value
      playerTree.insert({
        x: players[id].x - players[id].width,
        y: players[id].y - players[id].width,
        width: players[id].width * 2,
        height: players[id].width * 2,
        id: id,
      });
    }
    portalTree.clear();
    for (const id in portals) {
      portals[id].peopleTouch = 0; //reset number of people touching portals
      portals[id].prevList = portals[id].newList; //move the list of players that touch the portal
      portals[id].newList = [];
      portalTree.insert({
        x: portals[id].x - portals[id].width,
        y: portals[id].y - portals[id].width,
        width: portals[id].width * 2,
        height: portals[id].width * 2,
        id: id,
      });
    }
    sancportalTree.clear();
    for (const id in sancportals) {
      sancportals[id].peopleTouch = 0; //reset number of people touching portals
      sancportals[id].prevList = sancportals[id].newList; //move the list of players that touch the portal
      sancportals[id].newList = [];
      sancportalTree.insert({
        x: sancportals[id].x - sancportals[id].width,
        y: sancportals[id].y - sancportals[id].width,
        width: sancportals[id].width * 2,
        height: sancportals[id].width * 2,
        id: id,
      });
    }

    //1.move player, shoot, update level, regenerate health, check player collision
    for (const playerId in players) {
      if (players[playerId].developer == "yes") {//if a developer
        if (players[playerId].hasOwnProperty("rainbow")) {//developer token rainbow command
          if (players[playerId].rainbow >= 0) {
            players[playerId].rainbow += 3;
            players[playerId].color = `hsl(${players[playerId].rainbow}, 100%, 50%) `;
            players[playerId].outline = `hsl(${players[playerId].rainbow}, 100%, 50%)`;
          }
        }
        if (players[playerId].hasOwnProperty("blackandwhite")) {//developer token blackandwhite command
          if (players[playerId].blackandwhite >= 0) {
            if (players[playerId].blackandwhite == 100) {
              players[playerId].blackandwhiteState = 0;
            } else if (players[playerId].blackandwhite == 0) {
              players[playerId].blackandwhiteState = 1;
            }
            if (players[playerId].blackandwhiteState == 1) {
              players[playerId].blackandwhite++;
            } else {
              players[playerId].blackandwhite--;
            }
            players[playerId].color = `hsla(0, 0%, ${players[playerId].blackandwhite}%, 1) `;
            players[playerId].outline = `hsla(0, 0%, ${players[playerId].blackandwhite}%, 1)`;
          }
        }
      }

      chatRemovalAfterSomeTime(players, playerId); //remove old chat messages
      barrelAnimationForShooting(players, playerId); //calculate barrel height for animation when shooting
      recoilMove(players, playerId);
      movePlayer(
        players[playerId],
        playerId,
        "yes",
        "yes",
        "no",
        gameSize,
        shapes,
        players,
        "nothing"
      );
      spawnBullets(playerId, players, bullets, "arena");
      playerLevel(players, playerId);
      healthRegenerate(playerId, players);
      playerCollide(playerId, players, "arena");
      playerCollideShape(playerId, players, shapes, "arena");
      playerCollidePortal(
        playerId,
        players,
        portals,
        "arena",
        "dune"
      );
      if (players.hasOwnProperty(playerId)) {
        //if player still exists
        if (players[playerId].level >= 100) {
          //if can go into asnctuary
          playerCollidePortal(
            playerId,
            players,
            sancportals,
            "arena",
            "sanc"
          );
        } else {
          //if cannot
          pushPlayerFromPortal(playerId, players, sancportals);
        }
      }
    }
    //2.move the shapes, check collision with border and other shapes, change radiant color
    for (let shapeId in shapes) {
      moveShape(shapeId, shapes);
    }
    //3.move the bullets, check for collision with shapes, borders, players, and other bullets, and remove shapes and players if no more health
    for (let bulletId in bullets) {
      bulletAI(
        bullets,
        bulletId,
        "yes",
        "yes",
        "no",
        shapes,
        players,
        "nothing"
      );
      moveBullet(
        bullets,
        bulletId,
        "yes",
        "yes",
        "yes",
        "no",
        gameSize,
        players,
        shapes,
      );
    }
    //4. remove portal after it exist for a certain amount of time
    for (const portalId in portals) {
      checkIfRuptured(portalId, portals);
      removePortal(portalId, portals, "arena");
    }
    for (const portalId in sancportals) {
      checkIfRuptured(portalId, sancportals);
      removePortal(portalId, sancportals, "arena");
    }
    //5.change game size so that the game is 1000px width and height if only one person, and for every other person in the game, add 10px to the width and height
    //Note: Object.keys(players).length refers to number of players (number of items in array)
    /*
    if (Object.keys(players).length > 1) {
      //if more than one player
      if (gameSize < (Object.keys(players).length - 1) * 500 + startGameSize) {
        //if gamesize smaller than supposed to be
        gameSize++;
      } else if (
        gameSize >
        (Object.keys(players).length - 1) * 500 + startGameSize
      ) {
        //if gameSize bigger than supposed to be
        gameSize--;
      }
    } else {
      //if only one player
      if (gameSize != startGameSize) {
        gameSize = startGameSize;
      }
    }
    //REMEMBER TO BROADCAST MAP SIZE IF CHANGE
      var packet = JSON.stringify(["map", gameSize]);
      wss.broadcast(packet);
    */

    //6.choose whether a shape will spawn or not
    if (Object.keys(shapes).length < 300) {
      //100 shapes max
      var choosing = Math.floor(Math.random() * 10000); //only choose if shape will spawn if the number of shapes is less than 100

      if (choosing <= 3000) {//triangle
        spawnShape(1, 0.5, 0.05, 18, 15, 3, 0, 0.01, 2, 300);
      }
      else if (choosing <= 3200) {//radiant triangle
        spawnRadShape(1, 0.5, 0.05, 18, 15, 3, 0, 0.01, 2, 300);
      }
      else if (choosing <= 5250) {//square
        spawnShape(1, 2, 0.1, 25, 60, 4, 0.2, 0.005, 1.5, 200);
      }
      else if (choosing <= 5350) {//radiant square
        spawnRadShape(1, 2, 0.1, 25, 60, 4, 0.2, 0.005, 1.5, 200);
      }
      else if (choosing <= 6400) {//pentagon
        spawnShape(1, 8, 0.15, 40, 240, 5, 0.3, 0.005, 0.5, 100);
      }
      else if (choosing <= 6450) {//radiant pentagon
        spawnRadShape(1, 8, 0.15, 40, 240, 5, 0.3, 0.005, 0.5, 100);
      }
      else if (choosing <= 6950) {//hexagon
        spawnShape(1, 25, 0.2, 60, 960, 6, 0.5, 0.003, 0.5, 100);
      }
      else if (choosing <= 6970) {//radiant hexagon
        spawnRadShape(1, 25, 0.2, 60, 960, 6, 0.5, 0.003, 0.5, 100);
      }
      else if (choosing <= 7225) {//heptagon
        spawnShape(2, 75, 0.25, 100, 3840, 7, 0.7, 0.002, 0.5, 100);
      }
      else if (choosing <= 7230) {//radiant heptagon
        spawnRadShape(2, 75, 0.25, 100, 3840, 7, 0.7, 0.002, 0.5, 100);
      }
      else if (choosing <= 7370) {//octagon
        spawnShape(2, 275, 0.25, 140, 15360, 8, 0.9, 0.001, 0.3, 100);
      }
      else if (choosing <= 7373) {//radiant octagon
        spawnRadShape(2, 275, 0.25, 140, 15360, 8, 0.9, 0.001, 0.3, 100);
      }
      else if (choosing <= 7445) {//nonagon
        spawnShape(2, 825, 0.25, 190, 61440, 9, 1, 0.001, 0.2, 100);
      }
      else if (choosing <= 7446) {//radiant nonagon
        spawnRadShape(2, 825, 0.25, 190, 61440, 9, 1, 0.001, 0.2, 100);
      }
      else if (choosing <= 7506) {//decagon
        spawnShape(3, 2475, 0.25, 290, 242500, 10, 1, 0.001, 0.1, 100);
      }
      else if (choosing <= 7517) {//hendecagon
        spawnShape(3, 7425, 0.25, 435, 983040, 11, 1, 0.001, 0.1, 100);
      }
      else if (choosing <= 7522) {//dodecagon
        spawnShape(3, 22275, 0.25, 650, 3932160, 12, 1, 0.001, 0.1, 100);
      }
      else if (choosing <= 7523) {//tridecagon
        spawnShape(3, 66825, 0.25, 970, 15728640, 13, 1, 0.001, 0.1, 100);
      }
      //big shapes
      else if (choosing <= 7623) {//big triangle
        spawnShape(1, 8, 0.3, 30, 2000, 3, 0.6, 0.005, 0.5, 100);
      }
      else if (choosing <= 7673) {//big square
        spawnShape(1, 25, 0.6, 50, 6000, 4, 0.9, 0.005, 0.5, 100);
      }
      else if (choosing <= 7698) {//big pentagon
        spawnShape(1, 150, 0.9, 70, 24000, 5, 1, 0.005, 0.5, 100);
      }
      else if (choosing <= 7708) {//big hexagon
        spawnShape(1, 300, 1.2, 90, 96000, 6, 1, 0.005, 0.5, 100);
      }
      else if (choosing <= 7709) {//tiny gem
        spawnShape(1, 300, 1, 10, 25000000, 10, 1, 0.003, 0.3, 300);
      }
    }



    //7.choose whether a portal will spawn or not
    var choosingPortal = Math.floor(Math.random() * 1000);
    if (choosingPortal == 1 && Object.keys(portals).length < 5) {
      //spawn portal
      console.log("a dune portal spawned!");
      const portalX = Math.floor(Math.random() * (gameSize - 100)) + 50; //-100 then +50 so that portals wont spawn at 50px near sides of arena
      const portalY = Math.floor(Math.random() * (gameSize - 100)) + 50;
      portals[portalID] = {
        x: portalX,
        y: portalY,
        width: 90,
        color: "255,205,112",
        maxtimer: 5000, //starting number of timer, does not change, must be same value as timer when portal spawn
        timer: 5000, //the higher the number, the longer the portal stays
        peopleTouch: 0, //number of people touching it, allows client code to increase and decrease szie of portal
        ruptured: 0, //0 means no, 1 means yes
        enterNumber: 0, //number of times a player has entered and exited a wormhole (to rupture it)
        prevList: [], //previous list of players who touch the wormhole (need to keep track to check who entered or exited)
        newList: [], //new list of players who touch
      };
      portalID++;
    } else if (choosingPortal == 2 && Object.keys(sancportals).length < 3) {
      //spawn sanctuary portal
      console.log("a sanctuary portal spawned!");
      const portalX = Math.floor(Math.random() * (gameSize - 100)) + 50; //-100 then +50 so that portals wont spawn at 50px near sides of arena
      const portalY = Math.floor(Math.random() * (gameSize - 100)) + 50;
      sancportals[portalID] = {
        x: portalX,
        y: portalY,
        width: 90,
        color: "147, 76, 147",
        maxtimer: 5000,
        timer: 5000,
        peopleTouch: 0,
        ruptured: 0,
        enterNumber: 0,
        prevList: [],
        newList: [],
      };
      portalID++;
    }
  } //end of game loop function

  function sendStuffToArenaClient() {
    //next, calculate leaderboard
    //sort the object list based on score, the const below contains the list of id of players on leaderboard
    //note: this const is an array, NOT an object, so cannot use Object.something
    const temporaryPlayerList = Object.keys(players)
      .sort(function(a, b) {
        return players[b].score - players[a].score;
      })
      .slice(0, 8);
    //flip the a and b in the square brackets [] to get opposite order, e.g. ascending instead of descending order
    //.slice(0,10) gets the first ten players, it works even if there are less than 10 players
    var leaderboardplayers = {};
    let tempcolor = "";
    //leaderboardplayers contain the players info
    temporaryPlayerList.forEach((id) => {
      //add player's name, score and color to list because only need this three in client code
      if (players[id].developer != "yes") {
        tempcolor = players[id].team;
      }
      else {
        tempcolor = players[id].color;
      }
      leaderboardplayers[id] = {
        name: players[id].name,
        color: tempcolor,
        score: players[id].score,
        tank: players[id].tankType,
        body: players[id].bodyType,
      };
    });
    if (JSON.stringify(leaderboard) !== JSON.stringify(leaderboardplayers)) {//leaderboard did not change
      leaderboard = leaderboardplayers;
      var packet = JSON.stringify(["lb", leaderboardplayers]);
      wss.broadcast(packet);
    }
    //8.send stuff to the players. To edit the stuff you want to send to the players below, simply go to the client code and edit the variables in the function in gameStateUpdate
    //we must check each item in the game to see if it is visible on a 1080x1920 canvas for each player, and only send the things that are supposed to be visible, preventing field of vision hacking
    //NOTE: 1080 and 1920 refers to the canvas width and height
    let serverTime = Date.now();
    for (const playerId in players) {
      items = {};
      //get the stuff visible on client's screen using the quadtree collision code
      //width and height refers to width and height of viewable area
      var shapeelements = shapeTree.retrieve({
        x: players[playerId].x - (1920 * players[playerId].fovMultiplier) / 2,
        y: players[playerId].y - (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });
      var bulletelements = bulletTree.retrieve({
        x: players[playerId].x - (1920 * players[playerId].fovMultiplier) / 2,
        y: players[playerId].y - (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });
      var playerelements = playerTree.retrieve({
        x: players[playerId].x - (1920 * players[playerId].fovMultiplier) / 2,
        y: players[playerId].y - (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });
      //shapes first so they will be below everything else on the screen
      for (let thing of shapeelements) {
        var shapeID = thing.id;
        if (shapeID in shapes) {
          //check if still alive, or died in this loop
          sendStuffToClient(shapes, shapeID, players, playerId, "shape", [
            "angle",
            "hit",
            "radtier",
            "x",
            "y",
            "sides",
            "width",
            "health",
            "maxhealth",
          ]);
        }
      }
      for (let thing of bulletelements) {
        var bulletID = thing.id;
        if (bulletID in bullets) {
          sendStuffToClient(bullets, bulletID, players, playerId, "bullet", [
            "passive",
            "ownsIt",
            "hit",
            "color",
            "outline",
            "bulletType",
            "x",
            "y",
            "width",
            "moveAngle",
            "barrels",
            "team",
          ]);
        }
      }
      for (let thing of playerelements) {
        var playerID = thing.id;
        if (playerID in players) {
          sendStuffToClient(players, playerID, players, playerId, "player", [
            "turretBaseSize",
            "spawnProtectionDuration",
            "spawnProtection",
            "assets",
            "developer",
            "chats",
            "x",
            "y",
            "angle",
            "tankType",
            "bodyType",
            "width",
            "barrels",
            "bodybarrels",
            "hit",
            "team",
            "color",
            "outline",
            "name",
            "level",
            "health",
            "maxhealth",
            "fovMultiplier",
          ]);
        }
      }
      //combine dune portal and sanc portal lists together so that all portals can be sent together and shown on minimap
      let totalportals = {
        ...portals,
        ...sancportals,
      };

      //PORTAL STUFF
      //check which portals send before, then only send the different stuff
      if (!(playerId in prevportals)) {//frst time sending stuff to this client
        prevportals[playerId] = {};
      }
      //compare differences between previtems and items
      var listOfUnwantedProperties = ["enterNumber", "prevList", "newList"];//list of properties that dont need to be sent to client
      var resultportals = {};
      for (const portal in totalportals) {
        if (!(portal in prevportals[playerId])) {//new portal
          resultportals[portal] = { ...totalportals[portal] };
          prevportals[playerId][portal] = JSON.parse(JSON.stringify(totalportals[portal]));//deep clone to prevent object reference
        }
        else if (totalportals[portal] != prevportals[playerId][portal]) {//a property changed (send that property only)
          resultportals[portal] = {};
          for (const prop in totalportals[portal]) {
            if (!listOfUnwantedProperties.includes(prop)) {//if this is a property that needs to be sent to client
              if (totalportals[portal][prop] != prevportals[playerId][portal][prop]) {
                resultportals[portal][prop] = totalportals[portal][prop];
              }
            }
          }
          prevportals[playerId][portal] = JSON.parse(JSON.stringify(totalportals[portal]));//deep clone to prevent object reference
        }
      }
      for (const portal in prevportals[playerId]) {
        if (!(portal in totalportals)) {
          resultportals[portal] = "del"
          delete prevportals[playerId][portal]
        }
      }

      //GAME STUFF
      //check which stuff send before, then only send the different stuff

      if (!(playerId in previtems)) {//frst time sending stuff to this client
        previtems[playerId] = {};
      }
      //compare differences between previtems and items
      var resultitems = diff(previtems[playerId], items);

      previtems[playerId] = JSON.parse(JSON.stringify(items));

      var packet = JSON.stringify(["game", resultitems, duration, resultportals, serverTime]);

      //if (Buffer.byteLength(packet, 'utf8') > 830) {//only compress if data packet is more than 830 bytes (830b * 30 per second = 25kbps)
        //packet = snappy.compressSync(packet)
        packet = pako.deflate(packet)//compress the packet to reduce bandwidth (may cause lag when there are lots of objects sent, but neccessary cuz bandwidth was 1000kb before doing this, when using tornado tank (100+ objects on screen))
      //}
      lookup[playerId].send(packet); //send stuff to specific player
      //this is only sent to players in the players list, so that players who disconnected, died, or in home page will not receive this
    }
  }

  function editorGameLoop() {
    //this gameloop function keep running in the server if there are people
    //this game loop is for ARENA

    //purpose of hit value is to tell client whether object hit or not so it will flash the object, everytime a object is hit, it's hit value increases

    //for quadtree
    bulletTree.clear();
    for (const id in bullets) {
      bullets[id].hit = 0; //reset hit value
      bulletTree.insert({
        x: bullets[id].x - bullets[id].width,
        y: bullets[id].y - bullets[id].width,
        width: bullets[id].width * 2,
        height: bullets[id].width * 2,
        id: id,
      });
    }
    shapeTree.clear();
    for (const id in shapes) {
      shapes[id].hit = 0; //reset hit value
      shapeTree.insert({
        x: shapes[id].x - shapes[id].width,
        y: shapes[id].y - shapes[id].width,
        width: shapes[id].width * 2,
        height: shapes[id].width * 2,
        id: id,
      });
    }
    playerTree.clear();
    for (const id in players) {
      players[id].hit = 0; //reset hit value
      playerTree.insert({
        x: players[id].x - players[id].width,
        y: players[id].y - players[id].width,
        width: players[id].width * 2,
        height: players[id].width * 2,
        id: id,
      });
    }
    portalTree.clear();
    for (const id in portals) {
      portals[id].peopleTouch = 0; //reset number of people touching portals
      portals[id].prevList = portals[id].newList; //move the list of players that touch the portal
      portals[id].newList = [];
      portalTree.insert({
        x: portals[id].x - portals[id].width,
        y: portals[id].y - portals[id].width,
        width: portals[id].width * 2,
        height: portals[id].width * 2,
        id: id,
      });
    }
    sancportalTree.clear();
    for (const id in sancportals) {
      sancportals[id].peopleTouch = 0; //reset number of people touching portals
      sancportals[id].prevList = sancportals[id].newList; //move the list of players that touch the portal
      sancportals[id].newList = [];
      sancportalTree.insert({
        x: sancportals[id].x - sancportals[id].width,
        y: sancportals[id].y - sancportals[id].width,
        width: sancportals[id].width * 2,
        height: sancportals[id].width * 2,
        id: id,
      });
    }
    //1.move player, shoot, update level, regenerate health, check player collision
    for (const playerId in players) {
      if (players[playerId].developer == "yes") {//if a developer
        if (players[playerId].hasOwnProperty("rainbow")) {//developer token rainbow command
          if (players[playerId].rainbow >= 0) {
            players[playerId].rainbow += 3;
            players[playerId].color = `hsl(${players[playerId].rainbow}, 100%, 50%) `;
            players[playerId].outline = `hsl(${players[playerId].rainbow}, 100%, 50%)`;
          }
        }
        if (players[playerId].hasOwnProperty("blackandwhite")) {//developer token blackandwhite command
          if (players[playerId].blackandwhite >= 0) {
            if (players[playerId].blackandwhite == 100) {
              players[playerId].blackandwhiteState = 0;
            } else if (players[playerId].blackandwhite == 0) {
              players[playerId].blackandwhiteState = 1;
            }
            if (players[playerId].blackandwhiteState == 1) {
              players[playerId].blackandwhite++;
            } else {
              players[playerId].blackandwhite--;
            }
            players[playerId].color = `hsla(0, 0%, ${players[playerId].blackandwhite}%, 1) `;
            players[playerId].outline = `hsla(0, 0%, ${players[playerId].blackandwhite}%, 1)`;
          }
        }
      }



      chatRemovalAfterSomeTime(players, playerId); //remove old chat messages
      barrelAnimationForShooting(players, playerId); //calculate barrel height for animation when shooting
      recoilMove(players, playerId);
      movePlayer(
        players[playerId],
        playerId,
        "yes",
        "yes",
        "no",
        gameSize,
        shapes,
        players,
        "nothing"
      );

      //check if inside safe zone
      //must check after player movement cuz player movement turns off protection
      if (players[playerId].x <= safezoneright && players[playerId].x >= safezoneleft && players[playerId].y <= safezoneright && players[playerId].y >= safezoneleft) {
        players[playerId].spawnProtection = 0;//turn on spawn protection
      }

      spawnBullets(playerId, players, bullets, "arena");
      playerLevel(players, playerId);
      healthRegenerate(playerId, players);
      playerCollide(playerId, players, "arena");
      playerCollideShape(playerId, players, shapes, "arena");
      playerCollidePortal(
        playerId,
        players,
        portals,
        "arena",
        "dune"
      );
      if (players.hasOwnProperty(playerId)) {
        //if player still exists
        if (players[playerId].level >= 100) {
          //if can go into asnctuary
          playerCollidePortal(
            playerId,
            players,
            sancportals,
            "arena",
            "sanc"
          );
        } else {
          //if cannot
          pushPlayerFromPortal(playerId, players, sancportals);
        }
      }
    }
    //2.move the shapes, check collision with border and other shapes, change radiant color
    for (let shapeId in shapes) {
      moveShape(shapeId, shapes);
    }
    //3.move the bullets, check for collision with shapes, borders, players, and other bullets, and remove shapes and players if no more health
    for (let bulletId in bullets) {
      bulletAI(
        bullets,
        bulletId,
        "yes",
        "yes",
        "no",
        shapes,
        players,
        "nothing"
      );
      moveBullet(
        bullets,
        bulletId,
        "yes",
        "yes",
        "yes",
        "no",
        gameSize,
        players,
        shapes,
      );
    }
    //4. remove portal after it exist for a certain amount of time
    for (const portalId in portals) {
      checkIfRuptured(portalId, portals);
      removePortal(portalId, portals, "arena");
    }
    for (const portalId in sancportals) {
      checkIfRuptured(portalId, sancportals);
      removePortal(portalId, sancportals, "arena");
    }

    //6.choose whether a shape will spawn or not
    if (Object.keys(shapes).length < 50) {
      //100 shapes max
      var choosing = Math.floor(Math.random() * 10000); //only choose if shape will spawn if the number of shapes is less than 100

      if (choosing >= 1 && choosing <= 3000) {//triangle
        spawnShape(1, 0.5, 0.05, 15, 15, 3, 0, 0.01, 2, 300);
      }
      else if (choosing >= 3001 && choosing <= 3200) {//radiant triangle
        spawnRadShape(1, 0.5, 0.05, 15, 15, 3, 0, 0.01, 2, 300);
      }
      else if (choosing >= 3201 && choosing <= 5250) {//square
        spawnShape(1, 2, 0.1, 25, 60, 4, 0.2, 0.005, 1.5, 200);
      }
      else if (choosing >= 5251 && choosing <= 5350) {//radiant square
        spawnRadShape(1, 2, 0.1, 25, 60, 4, 0.2, 0.005, 1.5, 200);
      }
      else if (choosing >= 5351 && choosing <= 6400) {//pentagon
        spawnShape(1, 8, 0.15, 40, 240, 5, 0.3, 0.005, 0.5, 100);
      }
      else if (choosing >= 6401 && choosing <= 6450) {//radiant pentagon
        spawnRadShape(1, 8, 0.15, 40, 240, 5, 0.3, 0.005, 0.5, 100);
      }
      else if (choosing >= 6451 && choosing <= 6950) {//hexagon
        spawnShape(1, 25, 0.2, 60, 960, 6, 0.5, 0.003, 0.5, 100);
      }
      else if (choosing >= 6951 && choosing <= 6970) {//radiant hexagon
        spawnRadShape(1, 25, 0.2, 60, 960, 6, 0.5, 0.003, 0.5, 100);
      }
      else if (choosing >= 6971 && choosing <= 7225) {//heptagon
        spawnShape(2, 75, 0.25, 100, 3840, 7, 0.7, 0.002, 0.5, 100);
      }
      else if (choosing >= 7226 && choosing <= 7235) {//radiant heptagon
        spawnRadShape(2, 75, 0.25, 100, 3840, 7, 0.7, 0.002, 0.5, 100);
      }
      else if (choosing >= 7236 && choosing <= 7375) {//octagon
        spawnShape(2, 225, 0.25, 140, 15360, 8, 0.9, 0.001, 0.3, 100);
      }
      else if (choosing >= 7376 && choosing <= 7380) {//radiant octagon
        spawnRadShape(2, 225, 0.25, 140, 15360, 8, 0.9, 0.001, 0.3, 100);
      }
      else if (choosing >= 7381 && choosing <= 7452) {//nonagon
        spawnShape(2, 675, 0.25, 190, 61440, 9, 1, 0.001, 0.2, 100);
      }
      else if (choosing >= 7453 && choosing <= 7455) {//radiant nonagon
        spawnRadShape(2, 675, 0.25, 190, 61440, 9, 1, 0.001, 0.2, 100);
      }
      else if (choosing >= 7456 && choosing <= 7514) {//decagon
        spawnShape(3, 2025, 0.25, 290, 245760, 10, 1, 0.001, 0.1, 100);
      }
      else if (choosing >= 7515 && choosing <= 7525) {//hendecagon
        spawnShape(3, 6075, 0.25, 435, 983040, 11, 1, 0.001, 0.1, 100);
      }
      else if (choosing >= 7526 && choosing <= 7530) {//dodecagon
        spawnShape(3, 18225, 0.25, 650, 3932160, 12, 1, 0.001, 0.1, 100);
      }
      else if (choosing >= 7525 && choosing <= 7526) {//tridecagon
        spawnShape(3, 54675, 0.25, 970, 15728640, 13, 1, 0.001, 0.1, 100);
      }
      //big shapes
      else if (choosing >= 8000 && choosing <= 8150) {//big triangle
        spawnShape(1, 8, 0.3, 30, 2000, 3, 0.6, 0.005, 0.5, 100);
      }
      else if (choosing >= 8151 && choosing <= 8220) {//big square
        spawnShape(1, 25, 0.6, 50, 6000, 4, 0.9, 0.005, 0.5, 100);
      }
      else if (choosing >= 8221 && choosing <= 8250) {//big pentagon
        spawnShape(1, 150, 0.9, 70, 24000, 5, 1, 0.005, 0.5, 100);
      }
      else if (choosing >= 8251 && choosing <= 8265) {//big hexagon
        spawnShape(1, 300, 1.2, 90, 96000, 6, 1, 0.005, 0.5, 100);
      }
    }
  } //end of game loop function

  function sendStuffToEditorClient() {
    //next, calculate leaderboard
    //sort the object list based on score, the const below contains the list of id of players on leaderboard
    //note: this const is an array, NOT an object, so cannot use Object.something
    const temporaryPlayerList = Object.keys(players)
      .sort(function(a, b) {
        return players[b].score - players[a].score;
      })
      .slice(0, 8);
    //flip the a and b in the square brackets [] to get opposite order, e.g. ascending instead of descending order
    //.slice(0,10) gets the first ten players, it works even if there are less than 10 players
    var leaderboardplayers = {};
    let tempcolor = "";
    //leaderboardplayers contain the players info
    temporaryPlayerList.forEach((id) => {
      //add player's name, score and color to list because only need this three in client code
      if (players[id].developer != "yes") {
        tempcolor = players[id].team;
      }
      else {
        tempcolor = players[id].color;
      }
      leaderboardplayers[id] = {
        name: players[id].name,
        color: tempcolor,
        score: players[id].score,
        tank: players[id].tankType,
        body: players[id].bodyType,
      };
    });
    if (JSON.stringify(leaderboard) !== JSON.stringify(leaderboardplayers)) {//leaderboard did not change
      leaderboard = leaderboardplayers;
      var packet = JSON.stringify(["lb", leaderboardplayers]);
      wss.broadcast(packet);
    }
    //8.send stuff to the players. To edit the stuff you want to send to the players below, simply go to the client code and edit the variables in the function in gameStateUpdate
    //we must check each item in the game to see if it is visible on a 1080x1920 canvas for each player, and only send the things that are supposed to be visible, preventing field of vision hacking
    //NOTE: 1080 and 1920 refers to the canvas width and height
    let serverTime = Date.now();
    for (const playerId in players) {
      items = {};

      //get the stuff visible on client's screen using the quadtree collision code
      //width and height refers to width and height of viewable area
      var shapeelements = shapeTree.retrieve({
        x: players[playerId].x - (1920 * players[playerId].fovMultiplier) / 2,
        y: players[playerId].y - (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });
      var bulletelements = bulletTree.retrieve({
        x: players[playerId].x - (1920 * players[playerId].fovMultiplier) / 2,
        y: players[playerId].y - (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });
      var playerelements = playerTree.retrieve({
        x: players[playerId].x - (1920 * players[playerId].fovMultiplier) / 2,
        y: players[playerId].y - (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });

      //shapes first so they will be below everything else on the screen
      for (let thing of shapeelements) {
        var shapeID = thing.id;
        if (shapeID in shapes) {
          //check if still alive, or died in this loop
          sendStuffToClient(shapes, shapeID, players, playerId, "shape", [
            "angle",
            "hit",
            "radtier",
            "x",
            "y",
            "sides",
            "width",
            "health",
            "maxhealth",
          ]);
        }
      }
      for (let thing of bulletelements) {
        var bulletID = thing.id;
        if (bulletID in bullets) {
          sendStuffToClient(bullets, bulletID, players, playerId, "bullet", [
            "passive",
            "type",
            "ownsIt",
            "hit",
            "color",
            "outline",
            "bulletType",
            "x",
            "y",
            "width",
            "moveAngle",
            "barrels",
            "team",
          ]);
        }
      }
      for (let thing of playerelements) {
        var playerID = thing.id;
        if (playerID in players) {
          sendStuffToClient(players, playerID, players, playerId, "player", [
            "turretBaseSize",
            "spawnProtectionDuration",
            "spawnProtection",
            "assets",
            "developer",
            "chats",
            "x",
            "y",
            "angle",
            "tankType",
            "bodyType",
            "width",
            "barrels",
            "bodybarrels",
            "hit",
            "team",
            "color",
            "outline",
            "name",
            "level",
            "health",
            "maxhealth",
            "fovMultiplier",
          ]);
        }
      }

      //combine dune portal and sanc portal lists together so that all portals can be sent together and shown on minimap
      let totalportals = {
        ...portals,
        ...sancportals,
      };

      //PORTAL STUFF
      //check which portals send before, then only send the different stuff
      if (!(playerId in prevportals)) {//frst time sending stuff to this client
        prevportals[playerId] = {};
      }
      //compare differences between previtems and items
      var listOfUnwantedProperties = ["enterNumber", "prevList", "newList"];//list of properties that dont need to be sent to client
      var resultportals = {};
      for (const portal in totalportals) {
        if (!(portal in prevportals[playerId])) {//new portal
          resultportals[portal] = { ...totalportals[portal] };
          prevportals[playerId][portal] = JSON.parse(JSON.stringify(totalportals[portal]));//deep clone to prevent object reference
        }
        else if (totalportals[portal] != prevportals[playerId][portal]) {//a property changed (send that property only)
          resultportals[portal] = {};
          for (const prop in totalportals[portal]) {
            if (!listOfUnwantedProperties.includes(prop)) {//if this is a property that needs to be sent to client
              if (totalportals[portal][prop] != prevportals[playerId][portal][prop]) {
                resultportals[portal][prop] = totalportals[portal][prop];
              }
            }
          }
          prevportals[playerId][portal] = JSON.parse(JSON.stringify(totalportals[portal]));//deep clone to prevent object reference
        }
      }
      for (const portal in prevportals[playerId]) {
        if (!(portal in totalportals)) {
          resultportals[portal] = "del"
          delete prevportals[playerId][portal]
        }
      }


      //GAME STUFF
      //check which stuff send before, then only send the different stuff

      if (!previtems.hasOwnProperty(playerId)) {//frst time sending stuff to this client
        previtems[playerId] = {};
      }
      //compare differences between previtems and items

      var resultitems = diff(previtems[playerId], items);

      previtems[playerId] = JSON.parse(JSON.stringify(items));

      var packet = JSON.stringify(["game", resultitems, duration, resultportals, serverTime]);
      packet = pako.deflate(packet)//compress the packet to reduce bandwidth (may cause lag when there are lots of objects sent, but neccessary cuz bandwidth was 1000kb before doing this, when using tornado tank (100+ objects on screen))
      lookup[playerId].send(packet); //send stuff to specific player
      //this is only sent to players in the players list, so that players who disconnected, died, or in home page will not receive this
    }
  }

  function gameLoop2tdm() {
    //this gameloop function keep running in the server if there are people
    //this game loop is for 2tdm

    //purpose of hit value is to tell client whether object hit or not so it will flash the object, everytime a object is hit, it's hit value increases

    //for quadtree
    bulletTree.clear();
    for (const id in bullets) {
      bullets[id].hit = 0; //reset hit value
      bulletTree.insert({
        x: bullets[id].x - bullets[id].width,
        y: bullets[id].y - bullets[id].width,
        width: bullets[id].width * 2,
        height: bullets[id].width * 2,
        id: id,
      });
    }
    defbulletTree.clear();
    for (const id in defbullets) {
      defbullets[id].hit = 0; //reset hit value
      defbulletTree.insert({
        x: defbullets[id].x - defbullets[id].width,
        y: defbullets[id].y - defbullets[id].width,
        width: defbullets[id].width * 2,
        height: defbullets[id].width * 2,
        id: id,
      });
    }
    shapeTree.clear();
    for (const id in shapes) {
      shapes[id].hit = 0; //reset hit value
      shapeTree.insert({
        x: shapes[id].x - shapes[id].width,
        y: shapes[id].y - shapes[id].width,
        width: shapes[id].width * 2,
        height: shapes[id].width * 2,
        id: id,
      });
    }
    playerTree.clear();
    for (const id in players) {
      players[id].hit = 0; //reset hit value
      playerTree.insert({
        x: players[id].x - players[id].width,
        y: players[id].y - players[id].width,
        width: players[id].width * 2,
        height: players[id].width * 2,
        id: id,
      });
    }
    portalTree.clear();
    for (const id in portals) {
      portals[id].peopleTouch = 0; //reset number of people touching portals
      portals[id].prevList = portals[id].newList; //move the list of players that touch the portal
      portals[id].newList = [];
      portalTree.insert({
        x: portals[id].x - portals[id].width,
        y: portals[id].y - portals[id].width,
        width: portals[id].width * 2,
        height: portals[id].width * 2,
        id: id,
      });
    }
    sancportalTree.clear();
    for (const id in sancportals) {
      sancportals[id].peopleTouch = 0; //reset number of people touching portals
      sancportals[id].prevList = sancportals[id].newList; //move the list of players that touch the portal
      sancportals[id].newList = [];
      sancportalTree.insert({
        x: sancportals[id].x - sancportals[id].width,
        y: sancportals[id].y - sancportals[id].width,
        width: sancportals[id].width * 2,
        height: sancportals[id].width * 2,
        id: id,
      });
    }
    //1.move player, shoot, update level, regenerate health, check player collision
    for (const playerId in players) {
      if (players[playerId].developer == "yes") {//if a developer
        if (players[playerId].hasOwnProperty("rainbow")) {//developer token rainbow command
          if (players[playerId].rainbow >= 0) {
            players[playerId].rainbow += 3;
            players[playerId].color = `hsl(${players[playerId].rainbow}, 100%, 50%) `;
            players[playerId].outline = `hsl(${players[playerId].rainbow}, 100%, 50%)`;
          }
        }
        if (players[playerId].hasOwnProperty("blackandwhite")) {//developer token blackandwhite command
          if (players[playerId].blackandwhite >= 0) {
            if (players[playerId].blackandwhite == 100) {
              players[playerId].blackandwhiteState = 0;
            } else if (players[playerId].blackandwhite == 0) {
              players[playerId].blackandwhiteState = 1;
            }
            if (players[playerId].blackandwhiteState == 1) {
              players[playerId].blackandwhite++;
            } else {
              players[playerId].blackandwhite--;
            }
            players[playerId].color = `hsla(0, 0%, ${players[playerId].blackandwhite}%, 1) `;
            players[playerId].outline = `hsla(0, 0%, ${players[playerId].blackandwhite}%, 1)`;
          }
        }
      }

      chatRemovalAfterSomeTime(players, playerId); //remove old chat messages
      barrelAnimationForShooting(players, playerId); //calculate barrel height for animation when shooting
      recoilMove(players, playerId);
      movePlayer(
        players[playerId],
        playerId,
        "yes",
        "yes",
        "no",
        gameSize,
        shapes,
        players,
        "nothing"
      );
      spawnBullets(playerId, players, bullets, "arena");
      playerLevel(players, playerId);
      healthRegenerate(playerId, players);
      playerCollide(playerId, players, "arena");
      playerCollideShape(playerId, players, shapes, "arena");
      playerCollidePortal(
        playerId,
        players,
        portals,
        "arena",
        "dune"
      );
      if (players.hasOwnProperty(playerId)) {
        //if player still exists
        if (players[playerId].level >= 100) {
          //if can go into asnctuary
          playerCollidePortal(
            playerId,
            players,
            sancportals,
            "arena",
            "sanc"
          );
        } else {
          //if cannot
          pushPlayerFromPortal(playerId, players, sancportals);
        }
      }
    }
    //2.move the shapes, check collision with border and other shapes, change radiant color
    for (let shapeId in shapes) {
      moveShape(shapeId, shapes);
    }
    for (let defId in defenders) {
      checkifspawnbulletdef(defenders, defId);
      playerCollideDef(defenders, defId);
    }
    for (let defId in defbullets) {
      defdronecollide(defbullets, defId);
    }
    //3.move the bullets, check for collision with shapes, borders, players, and other bullets, and remove shapes and players if no more health
    for (let bulletId in bullets) {
      bulletAI(
        bullets,
        bulletId,
        "yes",
        "yes",
        "no",
        shapes,
        players,
        "nothing"
      );
      moveBullet(
        bullets,
        bulletId,
        "yes",
        "yes",
        "yes",
        "no",
        gameSize,
        players,
        shapes,
      );
    }
    //4. remove portal after it exist for a certain amount of time
    for (const portalId in portals) {
      checkIfRuptured(portalId, portals);
      removePortal(portalId, portals, "arena");
    }
    for (const portalId in sancportals) {
      checkIfRuptured(portalId, sancportals);
      removePortal(portalId, sancportals, "arena");
    }

    //6.choose whether a shape will spawn or not
    if (Object.keys(shapes).length < 300) {
      //100 shapes max
      var choosing = Math.floor(Math.random() * 10000); //only choose if shape will spawn if the number of shapes is less than 100

      if (choosing >= 1 && choosing <= 3000) {//triangle
        spawnShape(1, 0.5, 0.05, 15, 15, 3, 0, 0.01, 2, 300);
      }
      else if (choosing >= 3001 && choosing <= 3200) {//radiant triangle
        spawnRadShape(1, 0.5, 0.05, 15, 15, 3, 0, 0.01, 2, 300);
      }
      else if (choosing >= 3201 && choosing <= 5250) {//square
        spawnShape(1, 2, 0.1, 25, 60, 4, 0.2, 0.005, 1.5, 200);
      }
      else if (choosing >= 5251 && choosing <= 5350) {//radiant square
        spawnRadShape(1, 2, 0.1, 25, 60, 4, 0.2, 0.005, 1.5, 200);
      }
      else if (choosing >= 5351 && choosing <= 6400) {//pentagon
        spawnShape(1, 8, 0.15, 40, 240, 5, 0.3, 0.005, 0.5, 100);
      }
      else if (choosing >= 6401 && choosing <= 6450) {//radiant pentagon
        spawnRadShape(1, 8, 0.15, 40, 240, 5, 0.3, 0.005, 0.5, 100);
      }
      else if (choosing >= 6451 && choosing <= 6950) {//hexagon
        spawnShape(1, 25, 0.2, 60, 960, 6, 0.5, 0.003, 0.5, 100);
      }
      else if (choosing >= 6951 && choosing <= 6970) {//radiant hexagon
        spawnRadShape(1, 25, 0.2, 60, 960, 6, 0.5, 0.003, 0.5, 100);
      }
      else if (choosing >= 6971 && choosing <= 7225) {//heptagon
        spawnShape(2, 75, 0.25, 100, 3840, 7, 0.7, 0.002, 0.5, 100);
      }
      else if (choosing >= 7226 && choosing <= 7235) {//radiant heptagon
        spawnRadShape(2, 75, 0.25, 100, 3840, 7, 0.7, 0.002, 0.5, 100);
      }
      else if (choosing >= 7236 && choosing <= 7375) {//octagon
        spawnShape(2, 225, 0.25, 140, 15360, 8, 0.9, 0.001, 0.3, 100);
      }
      else if (choosing >= 7376 && choosing <= 7380) {//radiant octagon
        spawnRadShape(2, 225, 0.25, 140, 15360, 8, 0.9, 0.001, 0.3, 100);
      }
      else if (choosing >= 7381 && choosing <= 7452) {//nonagon
        spawnShape(2, 675, 0.25, 190, 61440, 9, 1, 0.001, 0.2, 100);
      }
      else if (choosing >= 7453 && choosing <= 7455) {//radiant nonagon
        spawnRadShape(2, 675, 0.25, 190, 61440, 9, 1, 0.001, 0.2, 100);
      }
      else if (choosing >= 7456 && choosing <= 7514) {//decagon
        spawnShape(3, 2025, 0.25, 290, 245760, 10, 1, 0.001, 0.1, 100);
      }
      else if (choosing >= 7515 && choosing <= 7525) {//hendecagon
        spawnShape(3, 6075, 0.25, 435, 983040, 11, 1, 0.001, 0.1, 100);
      }
      else if (choosing >= 7526 && choosing <= 7530) {//dodecagon
        spawnShape(3, 18225, 0.25, 650, 3932160, 12, 1, 0.001, 0.1, 100);
      }
      else if (choosing >= 7525 && choosing <= 7526) {//tridecagon
        spawnShape(3, 54675, 0.25, 970, 15728640, 13, 1, 0.001, 0.1, 100);
      }
      //big shapes
      else if (choosing >= 8000 && choosing <= 8150) {//big triangle
        spawnShape(1, 8, 0.3, 30, 2000, 3, 0.6, 0.005, 0.5, 100);
      }
      else if (choosing >= 8151 && choosing <= 8220) {//big square
        spawnShape(1, 25, 0.6, 50, 6000, 4, 0.9, 0.005, 0.5, 100);
      }
      else if (choosing >= 8221 && choosing <= 8250) {//big pentagon
        spawnShape(1, 150, 0.9, 70, 24000, 5, 1, 0.005, 0.5, 100);
      }
      else if (choosing >= 8251 && choosing <= 8265) {//big hexagon
        spawnShape(1, 300, 1.2, 90, 96000, 6, 1, 0.005, 0.5, 100);
      }
    }

    //7.choose whether a portal will spawn or not
    var choosingPortal = Math.floor(Math.random() * 1000);
    if (choosingPortal == 1 && Object.keys(portals).length < 5) {
      //spawn portal
      console.log("a dune portal spawned!");
      const portalX = Math.floor(Math.random() * (gameSize - baseSize * 2)) + baseSize; //dont spawn in base
      const portalY = Math.floor(Math.random() * (gameSize - baseSize * 2)) + baseSize;
      portals[portalID] = {
        x: portalX,
        y: portalY,
        width: 90,
        color: "255,205,112",
        maxtimer: 5000, //starting number of timer, does not change, must be same value as timer when portal spawn
        timer: 5000, //the higher the number, the longer the portal stays
        peopleTouch: 0, //number of people touching it, allows client code to increase and decrease szie of portal
        ruptured: 0, //0 means no, 1 means yes
        enterNumber: 0, //number of times a player has entered and exited a wormhole (to rupture it)
        prevList: [], //previous list of players who touch the wormhole (need to keep track to check who entered or exited)
        newList: [], //new list of players who touch
      };
      portalID++;
    } else if (choosingPortal == 2 && Object.keys(sancportals).length < 3) {
      //spawn sanctuary portal
      console.log("a sanctuary portal spawned!");
      const portalX = Math.floor(Math.random() * (gameSize - baseSize * 2)) + baseSize;
      const portalY = Math.floor(Math.random() * (gameSize - baseSize * 2)) + baseSize;
      sancportals[portalID] = {
        x: portalX,
        y: portalY,
        width: 90,
        color: "147, 76, 147",
        maxtimer: 5000,
        timer: 5000,
        peopleTouch: 0,
        ruptured: 0,
        enterNumber: 0,
        prevList: [],
        newList: [],
      };
      portalID++;
    }
  } //end of game loop function

  function sendStuffTo2tdmClient() {
    //next, calculate leaderboard
    //sort the object list based on score, the const below contains the list of id of players on leaderboard
    //note: this const is an array, NOT an object, so cannot use Object.something
    const temporaryPlayerList = Object.keys(players)
      .sort(function(a, b) {
        return players[b].score - players[a].score;
      })
      .slice(0, 8);
    //flip the a and b in the square brackets [] to get opposite order, e.g. ascending instead of descending order
    //.slice(0,10) gets the first ten players, it works even if there are less than 10 players
    var leaderboardplayers = {};
    let tempcolor = "";
    //leaderboardplayers contain the players info
    temporaryPlayerList.forEach((id) => {
      //add player's name, score and color to list because only need this three in client code
      if (players[id].developer != "yes") {
        tempcolor = players[id].team;
      }
      else {
        tempcolor = players[id].color;
      }
      leaderboardplayers[id] = {
        name: players[id].name,
        color: tempcolor,
        score: players[id].score,
        tank: players[id].tankType,
        body: players[id].bodyType,
      };
    });
    if (JSON.stringify(leaderboard) !== JSON.stringify(leaderboardplayers)) {//leaderboard did not change
      leaderboard = leaderboardplayers;
      var packet = JSON.stringify(["lb", leaderboardplayers]);
      wss.broadcast(packet);
    }
    //8.send stuff to the players. To edit the stuff you want to send to the players below, simply go to the client code and edit the variables in the function in gameStateUpdate
    //we must check each item in the game to see if it is visible on a 1080x1920 canvas for each player, and only send the things that are supposed to be visible, preventing field of vision hacking
    //NOTE: 1080 and 1920 refers to the canvas width and height
    let serverTime = Date.now();
    for (const playerId in players) {
      items = {};

      //get the stuff visible on client's screen using the quadtree collision code
      //width and height refers to width and height of viewable area
      var shapeelements = shapeTree.retrieve({
        x: players[playerId].x - (1920 * players[playerId].fovMultiplier) / 2,
        y: players[playerId].y - (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });
      var bulletelements = bulletTree.retrieve({
        x: players[playerId].x - (1920 * players[playerId].fovMultiplier) / 2,
        y: players[playerId].y - (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });
      var defbulletelements = defbulletTree.retrieve({
        x: players[playerId].x - (1920 * players[playerId].fovMultiplier) / 2,
        y: players[playerId].y - (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });
      var playerelements = playerTree.retrieve({
        x: players[playerId].x - (1920 * players[playerId].fovMultiplier) / 2,
        y: players[playerId].y - (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });

      //shapes first so they will be below everything else on the screen
      for (let thing of shapeelements) {
        var shapeID = thing.id;
        if (shapeID in shapes) {
          //check if still alive, or died in this loop
          sendStuffToClient(shapes, shapeID, players, playerId, "shape", [
            "angle",
            "hit",
            "radtier",
            "x",
            "y",
            "sides",
            "width",
            "health",
            "maxhealth",
          ]);
        }
      }
      for (let thing of bulletelements) {
        var bulletID = thing.id;
        if (bulletID in bullets) {
          sendStuffToClient(bullets, bulletID, players, playerId, "bullet", [
            "passive",
            "type",
            "ownsIt",
            "hit",
            "color",
            "outline",
            "bulletType",
            "x",
            "y",
            "width",
            "moveAngle",
            "barrels",
            "team",
          ]);
        }
      }
      for (let thing of playerelements) {
        var playerID = thing.id;
        if (playerID in players) {
          sendStuffToClient(players, playerID, players, playerId, "player", [
            "turretBaseSize",
            "spawnProtectionDuration",
            "spawnProtection",
            "assets",
            "developer",
            "chats",
            "x",
            "y",
            "angle",
            "tankType",
            "bodyType",
            "width",
            "barrels",
            "bodybarrels",
            "hit",
            "team",
            "color",
            "outline",
            "name",
            "level",
            "health",
            "maxhealth",
            "fovMultiplier",
          ]);
        }
      }
      for (var defid in defenders) {//base defenders
        sendStuffToClient(defenders, defid, players, playerId, "def", [
          "x",
          "y",
          "width",
          "color",
          "outline",
          "angle",
        ]);
      }
      for (let thing of defbulletelements) {
        var bulletID = thing.id;
        if (bulletID in defbullets) {
          sendStuffToClient(defbullets, bulletID, players, playerId, "bullet", [
            "passive",
            "type",
            "ownsIt",
            "hit",
            "color",
            "outline",
            "bulletType",
            "x",
            "y",
            "width",
            "moveAngle",
            "barrels",
            "team",
          ]);
        }
      }

      //combine dune portal and sanc portal lists together so that all portals can be sent together and shown on minimap
      let totalportals = {
        ...portals,
        ...sancportals,
      };

      //PORTAL STUFF
      //check which portals send before, then only send the different stuff
      if (!(playerId in prevportals)) {//frst time sending stuff to this client
        prevportals[playerId] = {};
      }
      //compare differences between previtems and items
      var listOfUnwantedProperties = ["enterNumber", "prevList", "newList"];//list of properties that dont need to be sent to client
      var resultportals = {};
      for (const portal in totalportals) {
        if (!(portal in prevportals[playerId])) {//new portal
          resultportals[portal] = { ...totalportals[portal] };
          prevportals[playerId][portal] = JSON.parse(JSON.stringify(totalportals[portal]));//deep clone to prevent object reference
        }
        else if (totalportals[portal] != prevportals[playerId][portal]) {//a property changed (send that property only)
          resultportals[portal] = {};
          for (const prop in totalportals[portal]) {
            if (!listOfUnwantedProperties.includes(prop)) {//if this is a property that needs to be sent to client
              if (totalportals[portal][prop] != prevportals[playerId][portal][prop]) {
                resultportals[portal][prop] = totalportals[portal][prop];
              }
            }
          }
          prevportals[playerId][portal] = JSON.parse(JSON.stringify(totalportals[portal]));//deep clone to prevent object reference
        }
      }
      for (const portal in prevportals[playerId]) {
        if (!(portal in totalportals)) {
          resultportals[portal] = "del"
          delete prevportals[playerId][portal]
        }
      }


      //GAME STUFF
      //check which stuff send before, then only send the different stuff

      if (!previtems.hasOwnProperty(playerId)) {//frst time sending stuff to this client
        previtems[playerId] = {};
      }
      //compare differences between previtems and items

      var resultitems = diff(previtems[playerId], items);

      previtems[playerId] = JSON.parse(JSON.stringify(items));

      var packet = JSON.stringify(["game", resultitems, duration, resultportals, serverTime]);
      packet = pako.deflate(packet)
      lookup[playerId].send(packet); //send stuff to specific player
      //this is only sent to players in the players list, so that players who disconnected, died, or in home page will not receive this
    }
  }

  function gameLoopDune() {
    //this gameloop function keep running in the server if there are people
    //this game loop is for DUNE

    //for quadtree
    bulletTree.clear();
    for (const id in bullets) {
      bullets[id].hit = 0;
      bulletTree.insert({
        x: bullets[id].x - bullets[id].width,
        y: bullets[id].y - bullets[id].width,
        width: bullets[id].width * 2,
        height: bullets[id].width * 2,
        id: id,
      });
    }
    botbulletTree.clear();
    for (const id in botbullets) {
      botbulletTree.insert({
        x: botbullets[id].x - botbullets[id].width,
        y: botbullets[id].y - botbullets[id].width,
        width: botbullets[id].width * 2,
        height: botbullets[id].width * 2,
        id: id,
      });
    }
    botTree.clear();
    for (const id in bots) {
      bots[id].hit = 0;
      botTree.insert({
        x: bots[id].x - bots[id].width,
        y: bots[id].y - bots[id].width,
        width: bots[id].width * 2,
        height: bots[id].width * 2,
        id: id,
      });
    }
    portalTree.clear();
    for (const id in portals) {
      portals[id].peopleTouch = 0; //reset number of people touching portals
      portals[id].prevList = portals[id].newList; //move the list of players that touch the portal
      portals[id].newList = [];
      portalTree.insert({
        x: portals[id].x - portals[id].width,
        y: portals[id].y - portals[id].width,
        width: portals[id].width * 2,
        height: portals[id].width * 2,
        id: id,
      });
    }
    playerTree.clear();
    for (const id in players) {
      players[id].hit = 0;
      playerTree.insert({
        x: players[id].x - players[id].width,
        y: players[id].y - players[id].width,
        width: players[id].width * 2,
        height: players[id].width * 2,
        id: id,
      });
    }
    //1.move players, shoot, check for collision, regenerate health, update level
    for (const playerId in players) {
      if (players[playerId].hasOwnProperty("rainbow")) {//developer token rainbow command
        if (players[playerId].rainbow >= 0) {
          players[playerId].rainbow += 3;
          players[playerId].color = `hsl(${players[playerId].rainbow}, 100%, 50%) `;
          players[playerId].outline = `hsl(${players[playerId].rainbow}, 100%, 50%)`;
        }
      }
      if (players[playerId].hasOwnProperty("blackandwhite")) {//developer token blackandwhite command
        if (players[playerId].blackandwhite >= 0) {
          if (players[playerId].blackandwhite == 100) {
            players[playerId].blackandwhiteState = 0;
          } else if (players[playerId].blackandwhite == 0) {
            players[playerId].blackandwhiteState = 1;
          }
          if (players[playerId].blackandwhiteState == 1) {
            players[playerId].blackandwhite++;
          } else {
            players[playerId].blackandwhite--;
          }
          players[playerId].color = `hsla(0, 0%, ${players[playerId].blackandwhite}%, 1) `;
          players[playerId].outline = `hsla(0, 0%, ${players[playerId].blackandwhite}%, 1)`;
        }
      }

      recoilMove(players, playerId);
      chatRemovalAfterSomeTime(players, playerId); //remove old chat messages
      barrelAnimationForShooting(players, playerId); //calculate barrel height for animation when shooting
      healthRegenerate(playerId, players);
      //check for collision with white portal at top left corner of dune
      var DistanceBetween = Math.sqrt(
        (players[playerId].x - enterDunePortal.x) *
        (players[playerId].x - enterDunePortal.x) +
        (players[playerId].y - enterDunePortal.y) *
        (players[playerId].y - enterDunePortal.y)
      ); //calculate distance between center of player and center of portal, portal treated as a circle
      if (
        DistanceBetween <=
        players[playerId].width + enterDunePortal.width / 2
      ) {
        //crashed
        var anglehit = Math.atan2(
          players[playerId].y - enterDunePortal.y,
          players[playerId].x - enterDunePortal.x
        );
        var speedMove = 5; //smaller number means move slower
        //push player out of white portal
        players[playerId].x += Math.cos(anglehit) * speedMove;
        players[playerId].y += Math.sin(anglehit) * speedMove;
      }
      playerLevel(players, playerId);
      spawnBullets(playerId, players, bullets, "dune");
      movePlayer(
        players[playerId],
        playerId,
        "no",
        "no",
        "yes",
        gameSize,
        "nothing",
        "nothing",
        bots
      );
      //the functions below are done last because they will remove players from the dune player list
      playerBotCollide(players, playerId);
      playerCollidePortal(
        playerId,
        players,
        portals,
        "dune",
        "arena"
      );
    }
    //move the bullets, check for collision with borders and bots, and remove bots if no more health
    for (const bulletId in bullets) {
      bulletAI(
        bullets,
        bulletId,
        "no",
        "no",
        "yes",
        "nothing",
        "nothing",
        bots
      );
      moveBullet(
        bullets,
        bulletId,
        "no",
        "no",
        "no",
        "yes",
        gameSize,
        "nothing",
        "nothing",
      );
    }
    //update portal timer
    for (const portalId in portals) {
      checkIfRuptured(portalId, portals);
      removePortal(portalId, portals, "dune");
    }
    //move the bot
    for (const botId in bots) {
      spawnBulletsBot(botId, bots, botbullets, "dunebot");
      moveBotDune(botId, "dune");
    }
    //bot's bullets
    for (const bulletId in botbullets) {
      moveBulletBot(
        botbullets,
        bulletId,
        gameSize,
        players,
        "dune"
      );
    }

    if (firstHive < 5) {
      //max of 5 bots of this type
      var botLevel = Math.floor(Math.random() * 2000);
      if (botLevel <= 15) {
        let botX = Math.floor(Math.random() * gameSize);
        let botY = Math.floor(Math.random() * gameSize);
        //spawnBot(x,y,name,sides,width,score,maxhealth,damage,speed,fov, hive,barrels)
        spawnBot(botX, botY, "Cluster", 5, 100, 10000, 1000, 0.05, 8, 1000, 1, {})
      }
    }
    if (secondHive < 30) {
      var botLevel = Math.floor(Math.random() * 2000);
      if (botLevel <= 10) {
        let botX = Math.floor(Math.random() * gameSize);
        let botY = Math.floor(Math.random() * gameSize);
        spawnBot(botX, botY, "Legion", 0, 50, 1000, 100, 0.005, 8, 500, 2, {
          barrelOne: {
            barrelWidth: 45,
            barrelHeight: 80,
            additionalAngle: 0,
            x: 0,
            barrelMoveIncrement: 0,
            barrelType: "bullet",
            reloadRecover: 20, //delay between bullets
            bulletHealth: 10,
            bulletDamage: 0.5,
            bulletTimer: 50,
            bulletSpeed: 35,
            barrelHeightChange: 0,
            shootingState: "no",
            reload: 0,
            recoil: 1,
          },
        })
      }
      else if (botLevel <= 15) {
        let botX = Math.floor(Math.random() * gameSize);
        let botY = Math.floor(Math.random() * gameSize);
        spawnBot(botX, botY, "Booster", 0, 50, 1400, 100, 0.05, 12, 1000, 2, {
          barrelOne: {
            barrelWidth: 35,
            barrelHeight: 80,
            additionalAngle: 0,
            x: 0,
            barrelMoveIncrement: 0,
            barrelType: "bullet",
            reloadRecover: 20, //delay between bullets
            bulletHealth: 10,
            bulletDamage: 0.2,
            bulletTimer: 50,
            bulletSpeed: 35,
            barrelHeightChange: 0,
            shootingState: "no",
            reload: 0,
            recoil: 1,
          },
          barrelThree: {
            barrelWidth: 45,
            barrelHeight: 70,
            additionalAngle: 160,
            x: 0,
            barrelMoveIncrement: 0,
            barrelType: "bullet",
            reloadRecover: 15, //delay between bullets
            bulletHealth: 10,
            bulletDamage: 0.1,
            bulletTimer: 50,
            bulletSpeed: 15,
            barrelHeightChange: 0,
            shootingState: "no",
            reload: 0,
            recoil: 1,
          },
          barrelFour: {
            barrelWidth: 45,
            barrelHeight: 70,
            additionalAngle: 200,
            x: 0,
            barrelMoveIncrement: 0,
            barrelType: "bullet",
            reloadRecover: 15, //delay between bullets
            bulletHealth: 10,
            bulletDamage: 0.1,
            bulletTimer: 50,
            bulletSpeed: 15,
            barrelHeightChange: 0,
            shootingState: "no",
            reload: 0,
            recoil: 1,
          },
          barrelTwo: {
            barrelWidth: 45,
            barrelHeight: 80,
            additionalAngle: 180,
            x: 0,
            barrelMoveIncrement: 0,
            barrelType: "bullet",
            reloadRecover: 15, //delay between bullets
            bulletHealth: 10,
            bulletDamage: 0.1,
            bulletTimer: 50,
            bulletSpeed: 15,
            barrelHeightChange: 0,
            shootingState: "no",
            reload: 0,
            recoil: 1,
          },
        })
      }
    }
    //3rd "hive" is reserved for minions of bots
    if (fourthHive < 3) {//infestors
      //max of 5 bots of this type
      var botLevel = Math.floor(Math.random() * 2000);
      if (botLevel <= 15) {
        let botX = Math.floor(Math.random() * gameSize);
        let botY = Math.floor(Math.random() * gameSize);
        //spawnBot(x,y,name,sides,width,score,maxhealth,damage,speed,fov, hive,barrels)
        spawnBot(botX, botY, "Infestor", 8, 125, 21000, 2000, 0.05, 8, 1000, 4, {})
      }
    }
    /*
       if (firstHive < 15) {
            //max of 15 bots in this hive
            //first hive spawning point, top left
            var botLevel = Math.floor(Math.random() * 2000);
            if (botLevel <= 15) {
              //spawnBot(x,y,name,width,score,maxhealth,damage,speed,fov,hive,barrels)
              spawnBot(1500,1500,"Crasher",25,200,10,0.05,20,500,1,{})
            } else if (botLevel > 15 && botLevel <= 25) {
              spawnBot(1500,1500,"Legion",50,1000,20,0.005,10,500,1,{
                           barrelOne: {
                                barrelWidth: 45,
                                barrelHeight: 80,
                                additionalAngle: 0,
                                x: 0,
                                barrelMoveIncrement: 0,
                                barrelType: "bullet",
                                reloadRecover: 20, //delay between bullets
                                bulletHealth: 10,
                                bulletDamage: 0.5,
                                bulletTimer: 50,
                                bulletSpeed: 35,
                                barrelHeightChange: 0,
                                shootingState: "no",
                                reload: 0,
                                recoil: 1,
                           },
                      })
            } else if (botLevel > 25 && botLevel <= 30) {
                 spawnBot(1500,1500,"Booster",50,1500,20,0.05,15,1000,1,{
                           barrelOne: {
                                barrelWidth: 35,
                                barrelHeight: 80,
                                additionalAngle: 0,
                                x: 0,
                                barrelMoveIncrement: 0,
                                barrelType: "bullet",
                                reloadRecover: 20, //delay between bullets
                                bulletHealth: 10,
                                bulletDamage: 0.2,
                                bulletTimer: 50,
                                bulletSpeed: 35,
                                barrelHeightChange: 0,
                                shootingState: "no",
                                reload: 0,
                                recoil: 1,
                           },
                           barrelThree: {
                                barrelWidth: 45,
                                barrelHeight: 70,
                                additionalAngle: 160,
                                x: 0,
                                barrelMoveIncrement: 0,
                                barrelType: "bullet",
                                reloadRecover: 15, //delay between bullets
                                bulletHealth: 10,
                                bulletDamage: 0.1,
                                bulletTimer: 50,
                                bulletSpeed: 15,
                                barrelHeightChange: 0,
                                shootingState: "no",
                                reload: 0,
                                recoil: 1,
                           },
                           barrelFour: {
                                barrelWidth: 45,
                                barrelHeight: 70,
                                additionalAngle: 200,
                                x: 0,
                                barrelMoveIncrement: 0,
                                barrelType: "bullet",
                                reloadRecover: 15, //delay between bullets
                                bulletHealth: 10,
                                bulletDamage: 0.1,
                                bulletTimer: 50,
                                bulletSpeed: 15,
                                barrelHeightChange: 0,
                                shootingState: "no",
                                reload: 0,
                                recoil: 1,
                           },
                           barrelTwo: {
                                barrelWidth: 45,
                                barrelHeight: 80,
                                additionalAngle: 180,
                                x: 0,
                                barrelMoveIncrement: 0,
                                barrelType: "bullet",
                                reloadRecover: 15, //delay between bullets
                                bulletHealth: 10,
                                bulletDamage: 0.1,
                                bulletTimer: 50,
                                bulletSpeed: 15,
                                barrelHeightChange: 0,
                                shootingState: "no",
                                reload: 0,
                                recoil: 1,
                           },
                      })
            }
       }
       if (secondHive < 15) {
            //max of 15 bots in this hive
            //second hive spawning point, bottom left
            botLevel = Math.floor(Math.random() * 3000);
            if (botLevel <= 5) {
              spawnBot(1500,4500,"Mega-Crasher",50,1050,100,0.01,15,750,2,{})
            } else if (botLevel > 5 && botLevel <= 10) {
              spawnBot(1500,4500,"Spike",50,1200,10,0.5,15,750,2,{})
            } else if (botLevel > 10 && botLevel <= 15) {
              spawnBot(1500,4500,"Mortar",50,3000,50,0.5,6,750,2,{
                           barrelOne: {
                                barrelWidth: 70,
                                barrelHeight: 70,
                                additionalAngle: 0,
                                x: 0,
                                barrelMoveIncrement: 0,
                                barrelType: "bullet",
                                reloadRecover: 30, //delay between bullets
                                bulletHealth: 3,
                                bulletDamage: 1,
                                bulletTimer: 30,
                                bulletSpeed: 25,
                                barrelHeightChange: 0,
                                shootingState: "no",
                                reload: 0,
                                recoil: 1,
                           },
                      })
            }
       }

       if (thirdHive < 10) {
            //max of 10 bots in this hive
            //third hive spawning point, top right
            botX = 4500;
            botY = 1500;
            botLevel = Math.floor(Math.random() * 10000);
            if (botLevel <= 200) {
              spawnBot(4500,1500,"Rogue",75,3500,100,0.05,15,1000,3,{})
            } else if (botLevel > 200 && botLevel <= 300) {
              spawnBot(4500,1500,"Shield",125,4000,50,0.03,15,1000,3,{})
            } else if (botLevel > 300 && botLevel <= 400) {
              spawnBot(4500,1500,"Grower",50,4500,500,0.05,15,1000,3,{})
            } else if (botLevel > 400 && botLevel <= 450) {
              spawnBot(4500,1500,"Protector",105,5500,50,0.03,8,1000,3,{
                           barrelOne: {
                                barrelWidth: 50,
                                barrelHeight: 190,
                                additionalAngle: 0,
                                x: 0,
                                barrelMoveIncrement: 0,
                                barrelType: "bullet",
                                reloadRecover: 25, //delay between bullets
                                bulletHealth: 30,
                                bulletDamage: 3,
                                bulletTimer: 20,
                                bulletSpeed: 40,
                                barrelHeightChange: 0,
                                shootingState: "no",
                                reload: 0,
                                recoil: 1,
                           },
                      })
            }
       }
       if (fourthHive < 5) {
            //max of 5 bots in this hive
            //last hive spawning point, bottom right
            botX = 4500;
            botY = 4500;
            botLevel = Math.floor(Math.random() * 30000);
            if (botLevel == 1) {
              spawnBot(4500,4500,"Boss",200,1000000,80000,2.5,2,1500,4,{
                           barrelOne: {
                                barrelWidth: 75,
                                barrelHeight: 290,
                                additionalAngle: 0,
                                x: 0,
                                barrelMoveIncrement: 0,
                                barrelType: "bullet",
                                reloadRecover: 100, //delay between bullets
                                bulletHealth: 300,
                                bulletDamage: 5,
                                bulletTimer: 50,
                                bulletSpeed: 25,
                                barrelHeightChange: 0,
                                shootingState: "no",
                                reload: 0,
                                recoil: 1,
                           },
                      })
                 var packet = JSON.stringify(["newNotification", "A boss spawned in the dune!", "saddlebrown"]);
                 wss.broadcast(packet);
            } else if (botLevel > 1 && botLevel <= 101) {
              spawnBot(4500,4500,"King",120,10000,3000,0.5,10,1000,4,{})
            } else if (botLevel > 101 && botLevel <= 151) {
              spawnBot(4500,4500,"Titan",155,10000,1000,0.2,5,1000,4,{
                           barrelOne: {
                                barrelWidth: 50,
                                barrelHeight: 200,
                                additionalAngle: 0,
                                x: 0,
                                barrelMoveIncrement: 0,
                                barrelType: "trap",
                                trapDistBeforeStop: 30,
                                reloadRecover: 30, //delay between bullets
                                bulletHealth: 200,
                                bulletDamage: 3,
                                bulletTimer: 100,
                                bulletSpeed: 30,
                                barrelHeightChange: 0,
                                shootingState: "no",
                                reload: 0,
                                recoil: 1,
                           },
                      })
            } else if (botLevel == 26) {
              spawnBot(4500,4500,"Beast",200,10500,1000,1,10,1500,4,{})
            } else if (botLevel > 151 && botLevel <= 200) {
              spawnBot(4500,4500,"Wall",150,15000,1000,0.5,10,1500,4,{})
            }
       }
    */
    if (rockHive < 50) {
      //max of 50 static bots in this hive
      //rock spawning in middle of the map
      botLevel = Math.floor(Math.random() * 20);
      if (botLevel <= 5) {
        //spawnRocks(minSides,maxSides,vertexVariation,width,score,health,damage, name)
        spawnRocks(7, 3, 5, 40, 125, 25, 0.1, "Gravel")
      }
      else if (botLevel <= 8) {
        spawnRocks(7, 3, 5, 100, 500, 100, 0.1, "Rock")
      } else if (botLevel <= 10) {
        spawnRocks(7, 7, 5, 120, 5000, 1000, 0.2, "Boulder")
      } else if (botLevel <= 11) {
        spawnRocks(12, 10, 5, 180, 7500, 1500, 0.5, "Mountain")
      } else if (botLevel <= 15) {
        spawnRocks(-40, 10, 1, 100, 8000, 800, 2, "Cactus")
      }
    }
    //choose whether a portal will spawn in dune
    var choosingPortal = Math.floor(Math.random() * 500);
    if (choosingPortal == 1) {
      //spawn portal
      console.log("a portal to arena spawned!");
      const portalX = Math.floor(Math.random() * (gameSize - 50)); //-50 so portal won't spawn near to side of arena
      const portalY = Math.floor(Math.random() * (gameSize - 50));
      portals[portalID] = {
        x: portalX,
        y: portalY,
        name: "portal",
        width: 90,
        color: "201, 68, 68",
        outline: "black", //does not affect color of portal currently, in client code, it uses rgb value
        maxtimer: 1000, //starting number of timer, does not change, must be same value as timer when portal spawn
        timer: 1000, //the higher the number, the longer the portal stays
        peopleTouch: 0,
        ruptured: 0,
        enterNumber: 0,
        prevList: [],
        newList: [],
      };
      portalID++;
    }
    else if (choosingPortal == 2) {
      //spawn portal
      console.log("a portal to 2tdm spawned!");
      const portalX = Math.floor(Math.random() * (gameSize - 50)); //-50 so portal won't spawn near to side of arena
      const portalY = Math.floor(Math.random() * (gameSize - 50));
      portals[portalID] = {
        x: portalX,
        y: portalY,
        name: "portal",
        width: 90,
        color: "116, 70, 135",
        outline: "black", //does not affect color of portal currently, in client code, it uses rgb value
        maxtimer: 1000, //starting number of timer, does not change, must be same value as timer when portal spawn
        timer: 1000, //the higher the number, the longer the portal stays
        peopleTouch: 0,
        ruptured: 0,
        enterNumber: 0,
        prevList: [],
        newList: [],
        destination: "2tdm",//override default arena destination
      };
      portalID++;
    }
    //change angle of white portal
    enterDunePortal.angleDegrees++;
    if (enterDunePortal.angleDegrees >= 360) {
      enterDunePortal.angleDegrees = 0;
    }
  }

  function sendStuffToDuneClient() {
    //next, calculate leaderboard
    //sort the object list based on score, the const below contains the list of id of players on leaderboard
    //note: this const is an array, NOT an object, so cannot use Object.something
    const temporaryPlayerList = Object.keys(players)
      .sort(function(a, b) {
        return players[b].score - players[a].score;
      })
      .slice(0, 8);
    //flip the a and b in the square brackets [] to get opposite order, e.g. ascending instead of descending order
    //.slice(0,10) gets the first ten players, it works even if there are less than 10 players
    var leaderboardplayers = {};
    let tempcolor = "";
    //leaderboardplayers contain the players info
    temporaryPlayerList.forEach((id) => {
      //add player's name, score and color to list because only need this three in client code
      if (players[id].developer != "yes") {
        tempcolor = players[id].team;
      }
      else {
        tempcolor = players[id].color;
      }
      leaderboardplayers[id] = {
        name: players[id].name,
        color: tempcolor,
        score: players[id].score,
        tank: players[id].tankType,
        body: players[id].bodyType,
      };
    });
    if (JSON.stringify(leaderboard) !== JSON.stringify(leaderboardplayers)) {//leaderboard did not change
      leaderboard = leaderboardplayers;
      var packet = JSON.stringify(["lb", leaderboardplayers]);
      wss.broadcast(packet);
    }
    //send stuff to the players
    //NOTE: 1080 and 1920 refers to the canvas width and height
    let serverTime = Date.now();
    for (const playerId in players) {
      items = {};

      //get the stuff visible on client's screen using the quadtree collision code
      //width and height refers to width and height of viewable area
      var bulletelements = bulletTree.retrieve({
        x:
          players[playerId].x -
          (1920 * players[playerId].fovMultiplier) / 2,
        y:
          players[playerId].y -
          (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });
      var botbulletelements = botbulletTree.retrieve({
        x:
          players[playerId].x -
          (1920 * players[playerId].fovMultiplier) / 2,
        y:
          players[playerId].y -
          (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });
      var botelements = botTree.retrieve({
        x:
          players[playerId].x -
          (1920 * players[playerId].fovMultiplier) / 2,
        y:
          players[playerId].y -
          (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });
      var playerelements = playerTree.retrieve({
        x:
          players[playerId].x -
          (1920 * players[playerId].fovMultiplier) / 2,
        y:
          players[playerId].y -
          (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });

      //the white portal at the top left corner of dune (cannot use the function because it's a variable, not a object list)
      if (
        Math.abs(enterDunePortal.y - players[playerId].y) <=
        (1080 / 2) * players[playerId].fovMultiplier &&
        Math.abs(enterDunePortal.x - players[playerId].x) <=
        (1920 / 2) * players[playerId].fovMultiplier
      ) {//check if visible on screen
        //in order to copy object instead of referencing, must use ={...object} instead of =object. Referencing an object would cause properties deleted in new object also deleted in original object
        if (!items.hasOwnProperty("Fixedportal")) {
          items.Fixedportal = {};
        }
        items.Fixedportal[1] = { ...enterDunePortal };
      }
      for (let thing of botbulletelements) {
        var bulletID = thing.id;
        if (bulletID in botbullets) {
          sendStuffToClient(
            botbullets,
            bulletID,
            players,
            playerId,
            "bullet",
            [
              "passive",
              "type",
              "ownsIt",
              "hit",
              "color",
              "outline",
              "bulletType",
              "x",
              "y",
              "width",
              "moveAngle",
              "barrels",
              "team",
              "ownerName",
            ]
          );
        }
      }
      for (let thing of botelements) {
        var botID = thing.id;
        if (botID in bots) {
          sendStuffToClient(bots, botID, players, playerId, "bot", [
            "randomPointsArrayX",
            "randomPointsArrayY",
            "side",
            "type",
            "hit",
            "x",
            "y",
            "width",
            "health",
            "maxhealth",
            "name",
            "angle",
            "barrels",
          ]);
        }
      }
      for (let thing of bulletelements) {
        var bulletID = thing.id;
        if (bulletID in bullets) {
          sendStuffToClient(
            bullets,
            bulletID,
            players,
            playerId,
            "bullet",
            [
              "passive",
              "type",
              "ownsIt",
              "hit",
              "color",
              "outline",
              "bulletType",
              "x",
              "y",
              "width",
              "moveAngle",
              "barrels",
              "team",
            ]
          );
        }
      }
      for (let thing of playerelements) {
        var playerID = thing.id;
        if (playerID in players) {
          sendStuffToClient(
            players,
            playerID,
            players,
            playerId,
            "player",
            [
              "turretBaseSize",
              "spawnProtectionDuration",
              "spawnProtection",
              "assets",
              "developer",
              "chats",
              "x",
              "y",
              "angle",
              "tankType",
              "bodyType",
              "width",
              "barrels",
              "bodybarrels",
              "hit",
              "team",
              "color",
              "outline",
              "name",
              "level",
              "health",
              "maxhealth",
              "fovMultiplier",
            ]
          );
        }
      }

      //PORTAL STUFF
      //check which portals send before, then only send the different stuff
      if (!prevportals.hasOwnProperty(playerId)) {//frst time sending stuff to this client
        prevportals[playerId] = {};
      }
      //compare differences between previtems and items
      var listOfUnwantedProperties = ["enterNumber", "prevList", "newList"];//list of properties that dont need to be sent to client
      var resultportals = {};
      for (const portal in portals) {
        if (!prevportals[playerId].hasOwnProperty(portal)) {//new portal
          resultportals[portal] = { ...portals[portal] };
          prevportals[playerId][portal] = JSON.parse(JSON.stringify(portals[portal]));//deep clone to prevent object reference
        }
        else if (portals[portal] != prevportals[playerId][portal]) {//a property changed (send that property only)
          resultportals[portal] = {};
          for (const prop in portals[portal]) {
            if (!listOfUnwantedProperties.includes(prop)) {//if this is a property that needs to be sent to client
              if (portals[portal][prop] != prevportals[playerId][portal][prop]) {
                resultportals[portal][prop] = portals[portal][prop];
              }
            }
          }
          prevportals[playerId][portal] = JSON.parse(JSON.stringify(portals[portal]));//deep clone to prevent object reference
        }
      }
      for (const portal in prevportals[playerId]) {
        if (!portals.hasOwnProperty(portal)) {
          resultportals[portal] = "del"
          delete prevportals[playerId][portal]
        }
      }


      //GAME STUFF
      //check which stuff send before, then only send the different stuff
      if (!previtems.hasOwnProperty(playerId)) {//frst time sending stuff to this client
        previtems[playerId] = {};
      }
      //compare differences between previtems and items

      var resultitems = diff(previtems[playerId], items);

      previtems[playerId] = JSON.parse(JSON.stringify(items));

      var packet = JSON.stringify(["game", resultitems, duration, resultportals, serverTime]);
      packet = pako.deflate(packet)
      lookup[playerId].send(packet);//send stuff to specific player
      //this is only sent to players in the players list, so that players who disconnected, died, or in home page will not receive this
    }
  }

  function gameCavernLoop() {
    //this gameloop function keep running in the server if there are people
    //this game loop is for CAVERN

    //for quadtree
    bulletTree.clear();
    for (const id in bullets) {
      bullets[id].hit = 0;
      bulletTree.insert({
        x: bullets[id].x - bullets[id].width,
        y: bullets[id].y - bullets[id].width,
        width: bullets[id].width * 2,
        height: bullets[id].width * 2,
        id: id,
      });
    }
    shapeTree.clear();
    for (const id in shapes) {
      shapes[id].hit = 0;
      shapeTree.insert({
        x: shapes[id].x - shapes[id].width,
        y: shapes[id].y - shapes[id].width,
        width: shapes[id].width * 2,
        height: shapes[id].width * 2,
        id: id,
      });
    }
    playerTree.clear();
    for (const id in players) {
      players[id].hit = 0;
      playerTree.insert({
        x: players[id].x - players[id].width,
        y: players[id].y - players[id].width,
        width: players[id].width * 2,
        height: players[id].width * 2,
        id: id,
      });
    }
    botbulletTree.clear();
    for (const id in botbullets) {
      botbulletTree.insert({
        x: botbullets[id].x - botbullets[id].width,
        y: botbullets[id].y - botbullets[id].width,
        width: botbullets[id].width * 2,
        height: botbullets[id].width * 2,
        id: id,
      });
    }
    botTree.clear();
    for (const id in bots) {
      bots[id].hit = 0;
      botTree.insert({
        x: bots[id].x - bots[id].width,
        y: bots[id].y - bots[id].width,
        width: bots[id].width * 2,
        height: bots[id].width * 2,
        id: id,
      });
    }
    portalTree.clear();
    for (const id in portals) {
      portals[id].peopleTouch = 0; //reset number of people touching portals
      portals[id].prevList = portals[id].newList; //move the list of players that touch the portal
      portals[id].newList = [];
      portalTree.insert({
        x: portals[id].x - portals[id].width,
        y: portals[id].y - portals[id].width,
        width: portals[id].width * 2,
        height: portals[id].width * 2,
        id: id,
      });
    }
    //1.move player, shoot, update level, regenerate health, check player collision
    for (const playerId in players) {
      if (players[playerId].hasOwnProperty("rainbow")) {//developer token rainbow command
        if (players[playerId].rainbow >= 0) {
          players[playerId].rainbow += 3;
          players[playerId].color = `hsl(${players[playerId].rainbow}, 100%, 50%) `;
          players[playerId].outline = `hsl(${players[playerId].rainbow}, 100%, 50%)`;
        }
      }
      if (players[playerId].hasOwnProperty("blackandwhite")) {//developer token blackandwhite command
        if (players[playerId].blackandwhite >= 0) {
          if (players[playerId].blackandwhite == 100) {
            players[playerId].blackandwhiteState = 0;
          } else if (players[playerId].blackandwhite == 0) {
            players[playerId].blackandwhiteState = 1;
          }
          if (players[playerId].blackandwhiteState == 1) {
            players[playerId].blackandwhite++;
          } else {
            players[playerId].blackandwhite--;
          }
          players[playerId].color = `hsla(0, 0%, ${players[playerId].blackandwhite}%, 1) `;
          players[playerId].outline = `hsla(0, 0%, ${players[playerId].blackandwhite}%, 1)`;
        }
      }

      chatRemovalAfterSomeTime(players, playerId); //remove old chat messages
      barrelAnimationForShooting(players, playerId); //calculate barrel height for animation when shooting
      recoilMove(players, playerId);
      playerWithMaze(players, playerId, "player");
      movePlayer(
        players[playerId],
        playerId,
        "yes",
        "yes",
        "no",
        gameSize,
        shapes,
        players,
        "nothing"
      );
      spawnBullets(playerId, players, bullets, "cavern");
      playerLevel(players, playerId);
      healthRegenerate(playerId, players);
      playerCollide(playerId, players, "cavern");
      playerCollideShape(playerId, players, shapes, "cavern");
      if (players[playerId]){
        playerBotCollide(players, playerId);
      }
      playerCollidePortal(
        playerId,
        players,
        portals,
        "cavern",
        "arena"
      );
    }
    //2.move the shapes, check collision with border and other shapes, change radiant color
    for (const shapeId in shapes) {
      playerWithMaze(shapes, shapeId, "shape");//shape with wall
      moveShape(shapeId, shapes);
    }
    //3.move the bullets, check for collision with shapes, borders, players, and other bullets, and remove shapes and players if no more health
    for (const bulletId in bullets) {
      bulletAI(
        bullets,
        bulletId,
        "yes",
        "yes",
        "yes",
        shapes,
        players,
        "nothing"
      );
      moveBullet(
        bullets,
        bulletId,
        "yes",
        "yes",
        "yes",
        "yes",
        gameSize,
        players,
        shapes,
      );
      if (bullets.hasOwnProperty(bulletId)) {//bullet still exists
        playerWithMaze(bullets, bulletId, "bullet");//bullet with wall
      }
    }
    //move the cavern protector
    for (const botId in bots) {
      spawnBulletsBot(botId, bots, botbullets, "dunebot");
      moveBotDune(botId, "cavern");
      playerWithMaze(bots, botId, "player");
    }
    //bot's bullets
    for (const bulletId in botbullets) {
      moveBulletBot(
        botbullets,
        bulletId,
        gameSize,
        players,
        "cavern"
      );
    }
    //4. remove portal after it exist for a certain amount of time
    for (const portalId in portals) {
      checkIfRuptured(portalId, portals);
      removePortal(portalId, portals, "cavern");
    }
    //6.choose whether a shape will spawn or not
    if (Object.keys(shapes).length < 300) {
      var choosing = Math.floor(Math.random() * 1000); //only choose if shape will spawn if the number of shapes is less than 300
    } else {
      var choosing = 0;
    }
    var radTier = Math.floor(Math.random() * 5) + 1; //this number MUST be from 1 to 5
    if (choosing >= 1 && choosing <= 100) {
      //spawn a radiant triangle
      const shapeX = Math.floor(Math.random() * gameSize);
      const shapeY = Math.floor(Math.random() * gameSize);
      const startAngle = Math.floor(Math.random() * 11) / 10; //get angle range from 0.0 to 1.0
      shapes[shapeID] = {
        x: shapeX, //current poisition of shape
        y: shapeY,
        centerOfRotationX: shapeX, //shape moves in circular motion around this point
        centerOfRotationY: shapeY,
        motionAngle: startAngle,
        angle: 0, //actual rotation of the shape
        health: 0.5,
        maxhealth: 0.5,
        damage: 0.05, //for shapes colliding with players, not bullets
        id: shapeID,
        width: 15,
        height: 15,
        radtier: radTier,
        score: 15 * radTier,
        sides: 3,
        hit: 0,
        attackers: {},
        weight: 0, //range between 0 and 1
        speed: 0.01,
        rotateSpeed: 2,
        pathRadius: 300, //radius of circular path that shape moves
      };
      shapeID++;
    } else if (choosing >= 101 && choosing <= 250) {
      //spawn a radiant square
      const shapeX = Math.floor(Math.random() * gameSize);
      const shapeY = Math.floor(Math.random() * gameSize);
      const startAngle = Math.floor(Math.random() * 11) / 10; //get angle range from 0.0 to 1.0
      shapes[shapeID] = {
        x: shapeX, //current poisition of shape
        y: shapeY,
        centerOfRotationX: shapeX, //shape moves in circular motion around this point
        centerOfRotationY: shapeY,
        motionAngle: startAngle,
        angle: 0, //actual rotation of the shape
        health: 2,
        maxhealth: 2,
        damage: 0.1,
        id: shapeID,
        width: 25,
        height: 25,
        radtier: radTier,
        score: 60 * radTier,
        sides: 4,
        hit: 0,
        attackers: {},
        weight: 0.2, //range between 0 and 1
        speed: 0.005,
        rotateSpeed: 1.5,
        pathRadius: 200, //radius of circular path that shape moves
      };
      shapeID++;
    } else if (choosing >= 251 && choosing <= 400) {
      //spawn a radiant pentagon
      const shapeX = Math.floor(Math.random() * gameSize);
      const shapeY = Math.floor(Math.random() * gameSize);
      const startAngle = Math.floor(Math.random() * 11) / 10; //get angle range from 0.0 to 1.0
      shapes[shapeID] = {
        x: shapeX, //current poisition of shape
        y: shapeY,
        centerOfRotationX: shapeX, //shape moves in circular motion around this point
        centerOfRotationY: shapeY,
        motionAngle: startAngle,
        angle: 0, //actual rotation of the shape
        health: 8,
        maxhealth: 8,
        damage: 0.15,
        id: shapeID,
        width: 40,
        height: 40,
        radtier: radTier,
        score: 240 * radTier,
        sides: 5,
        hit: 0,
        attackers: {},
        weight: 0.3, //range between 0 and 1
        speed: 0.003,
        rotateSpeed: 0.5,
        pathRadius: 100, //radius of circular path that shape moves
      };
      shapeID++;
    } else if (choosing >= 401 && choosing <= 550) {
      //spawn a radiant hexagon
      const shapeX = Math.floor(Math.random() * gameSize);
      const shapeY = Math.floor(Math.random() * gameSize);
      const startAngle = Math.floor(Math.random() * 11) / 10; //get angle range from 0.0 to 1.0
      shapes[shapeID] = {
        x: shapeX, //current poisition of shape
        y: shapeY,
        centerOfRotationX: shapeX, //shape moves in circular motion around this point
        centerOfRotationY: shapeY,
        motionAngle: startAngle,
        angle: 0, //actual rotation of the shape
        health: 25,
        maxhealth: 25,
        damage: 0.2,
        id: shapeID,
        width: 60,
        height: 60,
        radtier: radTier,
        score: 960 * radTier,
        sides: 6,
        hit: 0,
        attackers: {},
        weight: 0.5, //range between 0 and 1
        speed: 0.003,
        rotateSpeed: 0.5,
        pathRadius: 100, //radius of circular path that shape moves
      };
      shapeID++;
    } else if (choosing >= 551 && choosing <= 700) {
      //spawn a radiant heptagon
      const shapeX = Math.floor(Math.random() * gameSize);
      const shapeY = Math.floor(Math.random() * gameSize);
      const startAngle = Math.floor(Math.random() * 11) / 10; //get angle range from 0.0 to 1.0
      shapes[shapeID] = {
        x: shapeX, //current poisition of shape
        y: shapeY,
        centerOfRotationX: shapeX, //shape moves in circular motion around this point
        centerOfRotationY: shapeY,
        motionAngle: startAngle,
        angle: 0, //actual rotation of the shape
        health: 75,
        maxhealth: 75,
        damage: 0.25,
        id: shapeID,
        width: 100,
        height: 100,
        radtier: radTier,
        score: 3840 * radTier,
        sides: 7,
        hit: 0,
        attackers: {},
        weight: 0.7, //range between 0 and 1
        speed: 0.002,
        rotateSpeed: 0.5,
        pathRadius: 100, //radius of circular path that shape moves
      };
      shapeID++;
    } else if (choosing >= 701 && choosing <= 850) {
      //spawn a radiant octagon
      const shapeX = Math.floor(Math.random() * gameSize);
      const shapeY = Math.floor(Math.random() * gameSize);
      const startAngle = Math.floor(Math.random() * 11) / 10; //get angle range from 0.0 to 1.0
      shapes[shapeID] = {
        x: shapeX, //current poisition of shape
        y: shapeY,
        centerOfRotationX: shapeX, //shape moves in circular motion around this point
        centerOfRotationY: shapeY,
        motionAngle: startAngle,
        angle: 0, //actual rotation of the shape
        health: 312,
        maxhealth: 312,
        damage: 0.25,
        id: shapeID,
        width: 140,
        height: 140,
        radtier: radTier,
        score: 15360 * radTier,
        sides: 8,
        hit: 0,
        attackers: {},
        weight: 0.9, //range between 0 and 1
        speed: 0.001,
        rotateSpeed: 0.3,
        pathRadius: 100, //radius of circular path that shape moves
      };
      shapeID++;
    } else if (choosing >= 851 && choosing <= 950) {
      //spawn a radiant nonagon
      const shapeX = Math.floor(Math.random() * gameSize);
      const shapeY = Math.floor(Math.random() * gameSize);
      const startAngle = Math.floor(Math.random() * 11) / 10; //get angle range from 0.0 to 1.0
      shapes[shapeID] = {
        x: shapeX, //current poisition of shape
        y: shapeY,
        centerOfRotationX: shapeX, //shape moves in circular motion around this point
        centerOfRotationY: shapeY,
        motionAngle: startAngle,
        angle: 0, //actual rotation of the shape
        health: 675,
        maxhealth: 675,
        damage: 0.25,
        id: shapeID,
        width: 190,
        height: 190,
        radtier: radTier,
        score: 61440 * radTier,
        sides: 9,
        hit: 0,
        attackers: {},
        weight: 1, //range between 0 and 1
        speed: 0.001,
        rotateSpeed: 0.2,
        pathRadius: 100, //radius of circular path that shape moves
      };
      shapeID++;
    } else if (choosing >= 951 && choosing <= 998) {
      //spawn a radiant decagon
      const shapeX = Math.floor(Math.random() * gameSize);
      const shapeY = Math.floor(Math.random() * gameSize);
      const startAngle = Math.floor(Math.random() * 11) / 10; //get angle range from 0.0 to 1.0
      shapes[shapeID] = {
        x: shapeX, //current poisition of shape
        y: shapeY,
        centerOfRotationX: shapeX, //shape moves in circular motion around this point
        centerOfRotationY: shapeY,
        motionAngle: startAngle,
        angle: 0, //actual rotation of the shape
        health: 2025,
        maxhealth: 2025,
        damage: 0.25,
        id: shapeID,
        width: 290,
        height: 290,
        radtier: radTier,
        score: 245760 * radTier,
        sides: 10,
        hit: 0,
        attackers: {},
        weight: 1, //range between 0 and 1
        speed: 0.001,
        rotateSpeed: 0.1,
        pathRadius: 100, //radius of circular path that shape moves
      };
      shapeID++;
    } else if (choosing == 999) {
      //0.1% chance of spawning (1/1000)
      //spawn a radiant decagon
      var packet = JSON.stringify(["newNotification",
        "A radiant hendecagon has spawned in cavern!",
        "darkorange"]);
      wss.broadcast(packet);
      const shapeX = Math.floor(Math.random() * gameSize);
      const shapeY = Math.floor(Math.random() * gameSize);
      const startAngle = Math.floor(Math.random() * 11) / 10; //get angle range from 0.0 to 1.0
      shapes[shapeID] = {
        x: shapeX, //current poisition of shape
        y: shapeY,
        centerOfRotationX: shapeX, //shape moves in circular motion around this point
        centerOfRotationY: shapeY,
        motionAngle: startAngle,
        angle: 0, //actual rotation of the shape
        health: 6075,
        maxhealth: 6075,
        damage: 0.5,
        id: shapeID,
        width: 435,
        height: 435,
        radtier: radTier,
        score: 983040 * radTier,
        sides: 11,
        hit: 0,
        attackers: {},
        weight: 1, //range between 0 and 1
        speed: 0.001,
        rotateSpeed: 0.1,
        pathRadius: 100, //radius of circular path that shape moves
      };
      shapeID++;
    }
    //7.choose whether a portal will spawn or not
    let choosingPortal = Math.floor(Math.random() * 300);
    if (choosingPortal == 1) {
      //spawn portal
      console.log("a arena portal spawned!");
      const portalX = Math.floor(Math.random() * (900)) + gameSize / 2 - 450; //spawn in center of cavern within maze walls
      const portalY = Math.floor(Math.random() * (900)) + gameSize / 2 - 450;
      portals[portalID] = {
        x: portalX,
        y: portalY,
        name: "arena portal",
        width: 90,
        color: "201, 68, 68",
        maxtimer: 1000, //starting number of timer, does not change, must be same value as timer when portal spawn
        timer: 1000, //the higher the number, the longer the portal stays
        peopleTouch: 0,
        ruptured: 0,
        enterNumber: 0,
        prevList: [],
        newList: [],
      };
      portalID++;
    }
    else if (choosingPortal == 2) {
      //spawn portal
      console.log("a portal to 2tdm spawned!");
      const portalX = Math.floor(Math.random() * (900)) + gameSize / 2 - 450; //spawn in center of cavern within maze walls
      const portalY = Math.floor(Math.random() * (900)) + gameSize / 2 - 450;
      portals[portalID] = {
        x: portalX,
        y: portalY,
        name: "portal",
        width: 90,
        color: "116, 70, 135",
        outline: "black", //does not affect color of portal currently, in client code, it uses rgb value
        maxtimer: 1000, //starting number of timer, does not change, must be same value as timer when portal spawn
        timer: 1000, //the higher the number, the longer the portal stays
        peopleTouch: 0,
        ruptured: 0,
        enterNumber: 0,
        prevList: [],
        newList: [],
        destination: "2tdm",//override default arena destination
      };
      portalID++;
    }
  } //end of cavern loop function

  function sendStuffToCavernClient() {
    //next, calculate leaderboard
    //sort the object list based on score, the const below contains the list of id of players on leaderboard
    //note: this const is an array, NOT an object, so cannot use Object.something
    const temporaryPlayerList = Object.keys(players)
      .sort(function(a, b) {
        return players[b].score - players[a].score;
      })
      .slice(0, 8);
    //flip the a and b in the square brackets [] to get opposite order, e.g. ascending instead of descending order
    //.slice(0,10) gets the first ten players, it works even if there are less than 10 players
    var leaderboardplayers = {};
    //leaderboardplayers contain the players info
    temporaryPlayerList.forEach((id) => {
      //add player's name, score and color to list because only need this three in client code
      leaderboardplayers[id] = {
        name: '?'.repeat(players[id].name.length),//replace name with question marks
        color: "#C0C0C0",
        score: players[id].score,
        tank: "0",
        body: "0",
      };
    });
    if (JSON.stringify(leaderboard) !== JSON.stringify(leaderboardplayers)) {//leaderboard did not change
      leaderboard = leaderboardplayers;
      var packet = JSON.stringify(["lb", leaderboardplayers]);
      wss.broadcast(packet);
    }
    //8.send stuff to the players. To edit the stuff you want to send to the players below, simply go to the client code and edit the variables in the function in gameStateUpdate
    //we must check each item in the game to see if it is visible on a 1080x1920 canvas for each player, and only send the things that are supposed to be visible, preventing field of vision hacking
    //NOTE: 1080 and 1920 refers to the canvas width and height
    let serverTime = Date.now();
    for (const playerId in players) {
      items = {};

      //get the stuff visible on client's screen using the quadtree collision code
      //width and height refers to width and height of viewable area
      var bulletelements = bulletTree.retrieve({
        x:
          players[playerId].x -
          (1920 * players[playerId].fovMultiplier) / 2,
        y:
          players[playerId].y -
          (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });
      var shapeelements = shapeTree.retrieve({
        x:
          players[playerId].x -
          (1920 * players[playerId].fovMultiplier) / 2,
        y:
          players[playerId].y -
          (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });
      var playerelements = playerTree.retrieve({
        x:
          players[playerId].x -
          (1920 * players[playerId].fovMultiplier) / 2,
        y:
          players[playerId].y -
          (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });
      var botbulletelements = botbulletTree.retrieve({
        x:
          players[playerId].x -
          (1920 * players[playerId].fovMultiplier) / 2,
        y:
          players[playerId].y -
          (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });
      var botelements = botTree.retrieve({
        x:
          players[playerId].x -
          (1920 * players[playerId].fovMultiplier) / 2,
        y:
          players[playerId].y -
          (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });
      var wallelements = mazewallTree.retrieve({
        x:
          players[playerId].x -
          (1920 * players[playerId].fovMultiplier) / 2,
        y:
          players[playerId].y -
          (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });

      for (let thing of wallelements) {
        var wallID = thing.id;
        if (wallID in mazewalls) {
          if (
            Math.abs(mazewalls[wallID].y - players[playerId].y) <=
              ((1080 / 2) * players[playerId].fovMultiplier + mazewalls[wallID].h) &&
              Math.abs(mazewalls[wallID].x - players[playerId].x) <=
              ((1920 / 2) * players[playerId].fovMultiplier + mazewalls[wallID].w)
          ) {//check if visible on screen
            //maze wall uses w and h so cannot use sendStuffToClient
            if (!items.hasOwnProperty("wall")) {
              items.wall = {};
            }
            items.wall[wallID] = { ...mazewalls[wallID] };
          }
        }
      }
      for (let thing of shapeelements) {
        var shapeID = thing.id;
        if (shapeID in shapes) {
          sendStuffToClient(
            shapes,
            shapeID,
            players,
            playerId,
            "shape",
            [
              "angle",
              "hit",
              "radtier",
              "x",
              "y",
              "sides",
              "width",
              "health",
              "maxhealth",
            ]
          );
        }
      }
      for (let thing of botbulletelements) {
        var bulletID = thing.id;
        if (bulletID in botbullets) {
          sendStuffToClient(
            botbullets,
            bulletID,
            players,
            playerId,
            "bullet",
            [
              "passive",
              "type",
              "ownsIt",
              "hit",
              "color",
              "outline",
              "bulletType",
              "x",
              "y",
              "width",
              "moveAngle",
              "barrels",
              "team",
              "ownerName",
            ]
          );
        }
      }
      for (let thing of botelements) {
        var botID = thing.id;
        if (botID in bots) {
          sendStuffToClient(bots, botID, players, playerId, "bot", [
            "randomPointsArrayX",
            "randomPointsArrayY",
            "side",
            "type",
            "hit",
            "x",
            "y",
            "width",
            "health",
            "maxhealth",
            "name",
            "angle",
            "barrels",
          ]);
        }
      }
      for (let thing of bulletelements) {
        var bulletID = thing.id;
        if (bulletID in bullets) {
          sendStuffToClient(
            bullets,
            bulletID,
            players,
            playerId,
            "bullet",
            [
              "passive",
              "type",
              "ownsIt",
              "hit",
              "color",
              "outline",
              "bulletType",
              "x",
              "y",
              "width",
              "moveAngle",
              "barrels",
              "team",
            ]
          ); //barrels is the mine trap's barrel
        }
      }
      for (let thing of playerelements) {
        var playerID = thing.id;
        if (playerID in players) {
          sendStuffToClient(
            players,
            playerID,
            players,
            playerId,
            "player",
            [
              "turretBaseSize",
              "spawnProtectionDuration",
              "spawnProtection",
              "assets",
              "developer",
              "chats",
              "x",
              "y",
              "angle",
              "tankType",
              "bodyType",
              "width",
              "barrels",
              "bodybarrels",
              "hit",
              "team",
              "color",
              "outline",
              "name",
              "level",
              "health",
              "maxhealth",
              "fovMultiplier",
            ]
          );
        }
      }

      //PORTAL STUFF
      //check which portals send before, then only send the different stuff
      if (!prevportals.hasOwnProperty(playerId)) {//frst time sending stuff to this client
        prevportals[playerId] = {};
      }
      //compare differences between previtems and items
      var listOfUnwantedProperties = ["enterNumber", "prevList", "newList"];//list of properties that dont need to be sent to client
      var resultportals = {};
      for (const portal in portals) {
        if (!prevportals[playerId].hasOwnProperty(portal)) {//new portal
          resultportals[portal] = { ...portals[portal] };
          prevportals[playerId][portal] = JSON.parse(JSON.stringify(portals[portal]));//deep clone to prevent object reference
        }
        else if (portals[portal] != prevportals[playerId][portal]) {//a property changed (send that property only)
          resultportals[portal] = {};
          for (const prop in portals[portal]) {
            if (!listOfUnwantedProperties.includes(prop)) {//if this is a property that needs to be sent to client
              if (portals[portal][prop] != prevportals[playerId][portal][prop]) {
                resultportals[portal][prop] = portals[portal][prop];
              }
            }
          }
          prevportals[playerId][portal] = JSON.parse(JSON.stringify(portals[portal]));//deep clone to prevent object reference
        }
      }
      for (const portal in prevportals[playerId]) {
        if (!portals.hasOwnProperty(portal)) {
          resultportals[portal] = "del"
          delete prevportals[playerId][portal]
        }
      }


      //GAME STUFF
      //check which stuff send before, then only send the different stuff
      if (!previtems.hasOwnProperty(playerId)) {//frst time sending stuff to this client
        previtems[playerId] = {};
      }
      //compare differences between previtems and items

      var resultitems = diff(previtems[playerId], items);
      previtems[playerId] = JSON.parse(JSON.stringify(items));

      var packet = JSON.stringify(["game", resultitems, duration, resultportals, serverTime]);
      packet = pako.deflate(packet)
      lookup[playerId].send(packet);//send stuff to specific player
      //this is only sent to players in the players list, so that players who disconnected, died, or in home page will not receive this
    }
  }

  function gameSancLoop() {
    //this gameloop function keep running in the server if there are people
    //this game loop is for SANCTUARY

    //for quadtree
    bulletTree.clear();
    for (const id in bullets) {
      bullets[id].hit = 0;
      bulletTree.insert({
        x: bullets[id].x - bullets[id].width,
        y: bullets[id].y - bullets[id].width,
        width: bullets[id].width * 2,
        height: bullets[id].width * 2,
        id: id,
      });
    }
    playerTree.clear();
    for (const id in players) {
      players[id].hit = 0;
      playerTree.insert({
        x: players[id].x - players[id].width,
        y: players[id].y - players[id].width,
        width: players[id].width * 2,
        height: players[id].width * 2,
        id: id,
      });
    }
    portalTree.clear();
    for (const id in portals) {
      portals[id].peopleTouch = 0; //reset number of people touching portals
      portals[id].prevList = portals[id].newList; //move the list of players that touch the portal
      portals[id].newList = [];
      portalTree.insert({
        x: portals[id].x - portals[id].width,
        y: portals[id].y - portals[id].width,
        width: portals[id].width * 2,
        height: portals[id].width * 2,
        id: id,
      });
    }
    //1.move player, shoot, update level, regenerate health, check player collision
    for (const playerId in players) {
      if (players[playerId].hasOwnProperty("rainbow")) {//developer token rainbow command
        if (players[playerId].rainbow >= 0) {
          players[playerId].rainbow += 3;
          players[playerId].color = `hsl(${players[playerId].rainbow}, 100%, 50%) `;
          players[playerId].outline = `hsl(${players[playerId].rainbow}, 100%, 50%)`;
        }
      }
      if (players[playerId].hasOwnProperty("blackandwhite")) {//developer token blackandwhite command
        if (players[playerId].blackandwhite >= 0) {
          if (players[playerId].blackandwhite == 100) {
            players[playerId].blackandwhiteState = 0;
          } else if (players[playerId].blackandwhite == 0) {
            players[playerId].blackandwhiteState = 1;
          }
          if (players[playerId].blackandwhiteState == 1) {
            players[playerId].blackandwhite++;
          } else {
            players[playerId].blackandwhite--;
          }
          players[playerId].color = `hsla(0, 0%, ${players[playerId].blackandwhite}%, 1) `;
          players[playerId].outline = `hsla(0, 0%, ${players[playerId].blackandwhite}%, 1)`;
        }
      }

      chatRemovalAfterSomeTime(players, playerId); //remove old chat messages
      barrelAnimationForShooting(players, playerId); //calculate barrel height for animation when shooting
      recoilMove(players, playerId);
      movePlayer(
        players[playerId],
        playerId,
        "no",
        "no",
        "no",
        gameSize,
        "nothing",
        "nothing",
        "nothing"
      );
      spawnBullets(playerId, players, bullets, "sanc");
      //collision with sanctuary spawner
      playerCollideSpawner(players, playerId, sancspawner);
      playerLevel(players, playerId);
      healthRegenerate(playerId, players);
      playerCollidePortal(
        playerId,
        players,
        portals,
        "sanc",
        "arena"
      );
    }
    //3.move the bullets, check for collision with shapes, borders, players, and other bullets, and remove shapes and players if no more health
    for (const bulletId in bullets) {
      bulletAI(
        bullets,
        bulletId,
        "no",
        "no",
        "no",
        "nothing",
        "nothing",
        "nothing"
      );
      moveBullet(
        bullets,
        bulletId,
        "no",
        "no",
        "yes",
        "no",
        gameSize,
        "nothing",
        "nothing",
      );
    }
    //4. remove portal after it exist for a certain amount of time
    for (const portalId in portals) {
      checkIfRuptured(portalId, portals);
      removePortal(portalId, portals, "sanc");
    }
    //rotate sanc spwaner
    rotateSpawner(sancspawner);
    //7.choose whether a portal will spawn or not
    var choosingPortal = Math.floor(Math.random() * 1500);
    if (choosingPortal == 1) {
      //spawn portal
      console.log("a sancarena portal spawned!");
      const portalX = Math.floor(Math.random() * (gameSize - 100)) + 50; //-100 then +50 so that portals wont spawn at 50px near sides of arena
      const portalY = Math.floor(Math.random() * (gameSize - 100)) + 50;
      portals[portalID] = {
        x: portalX,
        y: portalY,
        name: "sancarena portal",
        width: 90,
        color: "201, 68, 68",
        maxtimer: 5000,
        timer: 5000,
        peopleTouch: 0,
        ruptured: 0,
        enterNumber: 0,
        prevList: [],
        newList: [],
      };
      portalID++;
    }
    else if (choosingPortal == 2) {
      //spawn portal
      console.log("a portal to 2tdm spawned!");
      const portalX = Math.floor(Math.random() * (gameSize - 100)) + 50; //-100 then +50 so that portals wont spawn at 50px near sides of arena
      const portalY = Math.floor(Math.random() * (gameSize - 100)) + 50;
      portals[portalID] = {
        x: portalX,
        y: portalY,
        name: "portal",
        width: 90,
        color: "116, 70, 135",
        outline: "black", //does not affect color of portal currently, in client code, it uses rgb value
        maxtimer: 5000, //starting number of timer, does not change, must be same value as timer when portal spawn
        timer: 5000, //the higher the number, the longer the portal stays
        peopleTouch: 0,
        ruptured: 0,
        enterNumber: 0,
        prevList: [],
        newList: [],
        destination: "2tdm",//override default arena destination
      };
      portalID++;
    }
  } //end of cavern loop function

  function sendStuffToSancClient() {
    //next, calculate leaderboard
    //sort the object list based on score, the const below contains the list of id of players on leaderboard
    //note: this const is an array, NOT an object, so cannot use Object.something
    const temporaryPlayerList = Object.keys(players)
      .sort(function(a, b) {
        return players[b].score - players[a].score;
      })
      .slice(0, 8);
    //flip the a and b in the square brackets [] to get opposite order, e.g. ascending instead of descending order
    //.slice(0,10) gets the first ten players, it works even if there are less than 10 players
    var leaderboardplayers = {};
    let tempcolor = "";
    //leaderboardplayers contain the players info
    temporaryPlayerList.forEach((id) => {
      //add player's name, score and color to list because only need this three in client code
      if (players[id].developer != "yes") {
        tempcolor = players[id].team;
      }
      else {
        tempcolor = players[id].color;
      }
      leaderboardplayers[id] = {
        name: players[id].name,
        color: tempcolor,
        score: players[id].score,
        tank: players[id].tankType,
        body: players[id].bodyType,
      };
    });
    if (JSON.stringify(leaderboard) !== JSON.stringify(leaderboardplayers)) {//leaderboard did not change
      leaderboard = leaderboardplayers;
      var packet = JSON.stringify(["lb", leaderboardplayers]);
      wss.broadcast(packet);
    }
    //8.send stuff to the players. To edit the stuff you want to send to the players below, simply go to the client code and edit the variables in the function in gameStateUpdate
    //we must check each item in the game to see if it is visible on a 1080x1920 canvas for each player, and only send the things that are supposed to be visible, preventing field of vision hacking
    //NOTE: 1080 and 1920 refers to the canvas width and height
    let serverTime = Date.now();
    for (const playerId in players) {
      items = {};

      //get the stuff visible on client's screen using the quadtree collision code
      //width and height refers to width and height of viewable area
      var bulletelements = bulletTree.retrieve({
        x:
          players[playerId].x -
          (1920 * players[playerId].fovMultiplier) / 2,
        y:
          players[playerId].y -
          (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });
      var playerelements = playerTree.retrieve({
        x:
          players[playerId].x -
          (1920 * players[playerId].fovMultiplier) / 2,
        y:
          players[playerId].y -
          (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });
      var portalelements = portalTree.retrieve({
        x:
          players[playerId].x -
          (1920 * players[playerId].fovMultiplier) / 2,
        y:
          players[playerId].y -
          (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });

      for (let thing of bulletelements) {
        var bulletID = thing.id;
        if (bulletID in bullets) {
          sendStuffToClient(
            bullets,
            bulletID,
            players,
            playerId,
            "bullet",
            [
              "passive",
              "type",
              "ownsIt",
              "hit",
              "color",
              "outline",
              "bulletType",
              "x",
              "y",
              "width",
              "moveAngle",
              "barrels",
              "team",
            ]
          ); //barrels is the mine trap's barrel
        }
      }
      for (let thing of playerelements) {
        var playerID = thing.id;
        if (playerID in players) {
          sendStuffToClient(
            players,
            playerID,
            players,
            playerId,
            "player",
            [
              "turretBaseSize",
              "spawnProtectionDuration",
              "spawnProtection",
              "assets",
              "developer",
              "chats",
              "x",
              "y",
              "angle",
              "tankType",
              "bodyType",
              "width",
              "barrels",
              "bodybarrels",
              "hit",
              "team",
              "color",
              "outline",
              "name",
              "level",
              "health",
              "maxhealth",
              "fovMultiplier",
            ]
          );
        }
      }
      //sanctuary spawner drawn last so it is above everything
      if (
        Math.abs(sancspawner.y - players[playerId].y) -
        sancspawner.auraWidth / 2 <=
        (1080 / 2) * players[playerId].fovMultiplier &&
        Math.abs(sancspawner.x - players[playerId].x) -
        sancspawner.auraWidth / 2 <=
        (1920 / 2) * players[playerId].fovMultiplier
      ) {//check if visible on screen
        //in order to copy object instead of referencing, must use ={...object} instead of =object. Referencing an object would cause properties deleted in new object also deleted in original object
        if (!items.hasOwnProperty("spawner")) {
          items.spawner = {};
        }
        items.spawner[1] = { ...sancspawner };
      }

      //PORTAL STUFF
      //check which portals send before, then only send the different stuff
      if (!prevportals.hasOwnProperty(playerId)) {//frst time sending stuff to this client
        prevportals[playerId] = {};
      }
      //compare differences between previtems and items
      var listOfUnwantedProperties = ["enterNumber", "prevList", "newList"];//list of properties that dont need to be sent to client
      var resultportals = {};
      for (const portal in portals) {
        if (!prevportals[playerId].hasOwnProperty(portal)) {//new portal
          resultportals[portal] = { ...portals[portal] };
          prevportals[playerId][portal] = JSON.parse(JSON.stringify(portals[portal]));//deep clone to prevent object reference
        }
        else if (portals[portal] != prevportals[playerId][portal]) {//a property changed (send that property only)
          resultportals[portal] = {};
          for (const prop in portals[portal]) {
            if (!listOfUnwantedProperties.includes(prop)) {//if this is a property that needs to be sent to client
              if (portals[portal][prop] != prevportals[playerId][portal][prop]) {
                resultportals[portal][prop] = portals[portal][prop];
              }
            }
          }
          prevportals[playerId][portal] = JSON.parse(JSON.stringify(portals[portal]));//deep clone to prevent object reference
        }
      }
      for (const portal in prevportals[playerId]) {
        if (!portals.hasOwnProperty(portal)) {
          resultportals[portal] = "del"
          delete prevportals[playerId][portal]
        }
      }


      //GAME STUFF
      //check which stuff send before, then only send the different stuff

      if (!previtems.hasOwnProperty(playerId)) {//frst time sending stuff to this client
        previtems[playerId] = {};
      }
      //compare differences between previtems and items
      const diff = (old, cur, result = {}) => {//only sanc loop need to specify again

        for (const k in cur) {
          if (Object.is(old[k], cur[k])) {
            continue;
          }
          if (cur[k].__proto__ === Object.prototype && old[k]) {
            diff(old[k], cur[k], result[k] = {});
          } else {
            result[k] = cur[k];
            if (typeof result[k] === "number" && k != "angle") {//prevent jreksanc spwaner rotation (ONLY for sanctuary)
              result[k] = Math.round(result[k] * 100) / 100;//round numbers to 2dp so they take up less bandwidth
            }
          }
        }
        for (const k in old) {
          if (!(k in cur)) {
            result[k] = 'del';
          }
        }
        return result;

      };

      var resultitems = diff(previtems[playerId], items);
      previtems[playerId] = JSON.parse(JSON.stringify(items));

      var packet = JSON.stringify(["game", resultitems, duration, resultportals, serverTime]);
      packet = pako.deflate(packet)
      lookup[playerId].send(packet);//send stuff to specific player
      //this is only sent to players in the players list, so that players who disconnected, died, or in home page will not receive this
    }
  }

  function gameCrossroadsLoop() {
    //this gameloop function keep running in the server if there are people
    //this game loop is for CROSSROADS

    //for quadtree
    bulletTree.clear();
    for (const id in bullets) {
      bullets[id].hit = 0;
      bulletTree.insert({
        x: bullets[id].x - bullets[id].width,
        y: bullets[id].y - bullets[id].width,
        width: bullets[id].width * 2,
        height: bullets[id].width * 2,
        id: id,
      });
    }
    playerTree.clear();
    for (const id in players) {
      players[id].hit = 0;
      playerTree.insert({
        x: players[id].x - players[id].width,
        y: players[id].y - players[id].width,
        width: players[id].width * 2,
        height: players[id].width * 2,
        id: id,
      });
    }
    portalTree.clear();
    for (const id in portals) {
      portals[id].peopleTouch = 0; //reset number of people touching portals
      portals[id].prevList = portals[id].newList; //move the list of players that touch the portal
      portals[id].newList = [];
      portalTree.insert({
        x: portals[id].x - portals[id].width,
        y: portals[id].y - portals[id].width,
        width: portals[id].width * 2,
        height: portals[id].width * 2,
        id: id,
      });
    }
    cavernportalTree.clear();
    for (const id in cavernportals) {
      cavernportals[id].peopleTouch = 0; //reset number of people touching portals
      cavernportals[id].prevList = cavernportals[id].newList; //move the list of players that touch the portal
      cavernportals[id].newList = [];
      cavernportalTree.insert({
        x: cavernportals[id].x - cavernportals[id].width,
        y: cavernportals[id].y - cavernportals[id].width,
        width: cavernportals[id].width * 2,
        height: cavernportals[id].width * 2,
        id: id,
      });
    }
    shapeTree.clear();
    for (const id in shapes) {
      shapes[id].hit = 0;
      shapeTree.insert({
        x: shapes[id].x - shapes[id].width,
        y: shapes[id].y - shapes[id].width,
        width: shapes[id].width * 2,
        height: shapes[id].width * 2,
        id: id,
      });
    }
    //1.move player, shoot, update level, regenerate health, check player collision
    for (const playerId in players) {
      if (players[playerId].hasOwnProperty("rainbow")) {//developer token rainbow command
        if (players[playerId].rainbow >= 0) {
          players[playerId].rainbow += 3;
          players[playerId].color = `hsl(${players[playerId].rainbow}, 100%, 50%) `;
          players[playerId].outline = `hsl(${players[playerId].rainbow}, 100%, 50%)`;
        }
      }
      if (players[playerId].hasOwnProperty("blackandwhite")) {//developer token blackandwhite command
        if (players[playerId].blackandwhite >= 0) {
          if (players[playerId].blackandwhite == 100) {
            players[playerId].blackandwhiteState = 0;
          } else if (players[playerId].blackandwhite == 0) {
            players[playerId].blackandwhiteState = 1;
          }
          if (players[playerId].blackandwhiteState == 1) {
            players[playerId].blackandwhite++;
          } else {
            players[playerId].blackandwhite--;
          }
          players[playerId].color = `hsla(0, 0%, ${players[playerId].blackandwhite}%, 1) `;
          players[playerId].outline = `hsla(0, 0%, ${players[playerId].blackandwhite}%, 1)`;
        }
      }

      chatRemovalAfterSomeTime(players, playerId); //remove old chat messages
      barrelAnimationForShooting(players, playerId); //calculate barrel height for animation when shooting
      recoilMove(players, playerId);
      playerWithMaze(players, playerId, "player");
      //check for collision with portal at center of crossroads
      var DistanceBetween = Math.sqrt(
        (players[playerId].x - enterCrPortal.x) *
        (players[playerId].x - enterCrPortal.x) +
        (players[playerId].y - enterCrPortal.y) *
        (players[playerId].y - enterCrPortal.y)
      ); //calculate distance between center of player and center of portal, portal treated as a circle
      if (
        DistanceBetween <=
        players[playerId].width + enterCrPortal.width / 2
      ) {
        //crashed
        var anglehit = Math.atan2(
          players[playerId].y - enterCrPortal.y,
          players[playerId].x - enterCrPortal.x
        );
        var speedMove = 5; //smaller number means move slower
        //push player out of white portal
        players[playerId].x += Math.cos(anglehit) * speedMove;
        players[playerId].y += Math.sin(anglehit) * speedMove;
      }
      movePlayer(
        players[playerId],
        playerId,
        "yes",
        "yes",
        "no",
        gameSize,
        shapes,
        players,
        "nothing"
      );
      spawnBullets(playerId, players, bullets, "cr");
      playerLevel(players, playerId);
      healthRegenerate(playerId, players);
      playerCollide(playerId, players, "cr");
      playerCollideShape(playerId, players, shapes, "cr");
      playerCollidePortal(
        playerId,
        players,
        portals,
        "cr",
        "arena"
      );
      playerCollidePortal(
        playerId,
        players,
        cavernportals,
        "cr",
        "cavern"
      );
    }
    //2.move the shapes, check collision with border and other shapes, change radiant color
    for (const shapeId in shapes) {
      playerWithMaze(shapes, shapeId, "shape");//shape with wall
      moveShape(shapeId, shapes);
    }
    //3.move the bullets, check for collision with shapes, borders, players, and other bullets, and remove shapes and players if no more health
    for (const bulletId in bullets) {
      bulletAI(
        bullets,
        bulletId,
        "yes",
        "yes",
        "no",
        shapes,
        players,
        "nothing"
      );
      moveBullet(
        bullets,
        bulletId,
        "yes",
        "yes",
        "yes",
        "no",
        gameSize,
        players,
        shapes,
      );
      if (bullets.hasOwnProperty(bulletId)) {//bullet still exists
        playerWithMaze(bullets, bulletId, "bullet");//bullet with wall
      }
    }
    //4. remove portal after it exist for a certain amount of time
    for (const portalId in portals) {
      checkIfRuptured(portalId, portals);
      removePortal(portalId, portals, "cr");
    }
    for (const portalId in cavernportals) {
      checkIfRuptured(portalId, cavernportals);
      radiantShapes(cavernportals, portalId);
      removePortal(portalId, cavernportals, "cr");
    }

    function crspawnShape(region, health, damage, size, score, sides, weight, speed, rotate, path) {//normal shape
      //if (region==1){//
      //ALL Shapes spawn anywhere on the map, unlike arena
      //note that the mapsize is including the 4 corridors on the side of the map, shapes cannot spawn in that area
      var shapeX = Math.floor(Math.random() * (gameSize - 3000)) + 1500;
      var shapeY = Math.floor(Math.random() * (gameSize - 3000)) + 1500;
      //}
      shapes[shapeID] = {
        x: shapeX, //current poisition of shape
        y: shapeY,
        centerOfRotationX: shapeX, //shape moves in circular motion around this point
        centerOfRotationY: shapeY,
        motionAngle: startAngle,
        angle: 0, //actual rotation of the shape
        health: health,
        maxhealth: health,
        damage: damage, //for shapes colliding with players, not bullets
        width: size,
        height: size,
        score: score,
        sides: sides,
        hit: 0,
        attackers: {},
        weight: weight, //range between 0 and 1
        speed: speed,
        rotateSpeed: rotate,
        pathRadius: path, //radius of circular path that shape moves
      };
      shapeID++;
    }
    function crspawnRadShape(region, health, damage, size, score, sides, weight, speed, rotate, path) {//radiant shape
      //if (region==1){//anywhere on the map
      var shapeX = Math.floor(Math.random() * (gameSize - 3000)) + 1500;
      var shapeY = Math.floor(Math.random() * (gameSize - 3000)) + 1500;
      //}
      //for radiant shapes
      var radchoose = Math.floor(Math.random() * 100);
      if (radchoose >= 0 && radchoose <= 40) {
        var radTier = 1;
      } else if (radchoose >= 41 && radchoose <= 80) {
        var radTier = 2;
      } else if (radchoose >= 81 && radchoose <= 90) {
        var radTier = 3;
      } else if (radchoose >= 91 && radchoose <= 97) {
        var radTier = 4;
      } else {
        var radTier = 5;
      }
      shapes[shapeID] = {
        x: shapeX, //current poisition of shape
        y: shapeY,
        centerOfRotationX: shapeX, //shape moves in circular motion around this point
        centerOfRotationY: shapeY,
        motionAngle: startAngle,
        angle: 0, //actual rotation of the shape
        health: health,
        maxhealth: health,
        damage: damage, //for shapes colliding with players, not bullets
        id: shapeID,
        width: size,
        height: size,
        radtier: radTier,
        score: score * radTier,
        sides: sides,
        hit: 0,
        attackers: {},
        weight: weight, //range between 0 and 1
        speed: speed,
        rotateSpeed: rotate,
        pathRadius: path, //radius of circular path that shape moves
      };
      shapeID++;
    }

    //6.choose whether a shape will spawn or not
    if (Object.keys(shapes).length < 300) {
      //300 shapes max
      var choosing = Math.floor(Math.random() * 8000);
      var startAngle = Math.floor(Math.random() * 11) / 10;

      if (choosing >= 1 && choosing <= 500) {//triangle
        crspawnShape(1, 0.5, 0.05, 15, 15, 3, 0, 0.01, 2, 300);
      }
      else if (choosing >= 501 && choosing <= 1000) {//radiant triangle
        crspawnRadShape(1, 0.5, 0.05, 15, 15, 3, 0, 0.01, 2, 300);
      }
      else if (choosing >= 1001 && choosing <= 1500) {//square
        crspawnShape(1, 2, 0.1, 25, 60, 4, 0.2, 0.005, 1.5, 200);
      }
      else if (choosing >= 1501 && choosing <= 2000) {//radiant square
        crspawnRadShape(1, 2, 0.1, 25, 60, 4, 0.2, 0.005, 1.5, 200);
      }
      else if (choosing >= 2001 && choosing <= 3000) {//pentagon
        crspawnShape(1, 8, 0.15, 40, 240, 5, 0.3, 0.005, 0.5, 100);
      }
      else if (choosing >= 3001 && choosing <= 3500) {//radiant pentagon
        crspawnRadShape(1, 8, 0.15, 40, 240, 5, 0.3, 0.005, 0.5, 100);
      }
      else if (choosing >= 3501 && choosing <= 4500) {//hexagon
        crspawnShape(1, 25, 0.2, 60, 960, 6, 0.5, 0.003, 0.5, 100);
      }
      else if (choosing >= 4501 && choosing <= 5000) {//radiant hexagon
        crspawnRadShape(1, 25, 0.2, 60, 960, 6, 0.5, 0.003, 0.5, 100);
      }
      else if (choosing >= 5001 && choosing <= 6000) {//heptagon
        crspawnShape(2, 75, 0.25, 100, 3840, 7, 0.7, 0.002, 0.5, 100);
      }
      else if (choosing >= 6001 && choosing <= 6250) {//radiant heptagon
        crspawnRadShape(2, 75, 0.25, 100, 3840, 7, 0.7, 0.002, 0.5, 100);
      }
      else if (choosing >= 6251 && choosing <= 6751) {//octagon
        crspawnShape(2, 312, 0.25, 140, 15360, 8, 0.9, 0.001, 0.3, 100);
      }
      else if (choosing >= 6751 && choosing <= 6850) {//radiant octagon
        crspawnRadShape(2, 312, 0.25, 140, 15360, 8, 0.9, 0.001, 0.3, 100);
      }
      else if (choosing >= 6851 && choosing <= 7100) {//nonagon
        crspawnShape(2, 675, 0.25, 190, 61440, 9, 1, 0.001, 0.2, 100);
      }
      else if (choosing >= 7101 && choosing <= 7200) {//radiant nonagon
        crspawnRadShape(2, 675, 0.25, 190, 61440, 9, 1, 0.001, 0.2, 100);
      }
      else if (choosing >= 7201 && choosing <= 7300) {//decagon
        crspawnShape(3, 2025, 0.25, 290, 245760, 10, 1, 0.001, 0.1, 100);
      }
      else if (choosing >= 7301 && choosing <= 7350) {//radiant decagon
        crspawnRadShape(3, 2025, 0.25, 290, 245760, 10, 1, 0.001, 0.1, 100);
      }
      //big shapes
      else if (choosing >= 7400 && choosing <= 7600) {//big triangle
        crspawnShape(1, 8, 0.3, 30, 2000, 3, 0.6, 0.005, 0.5, 100);
      }
      else if (choosing >= 7601 && choosing <= 7700) {//big square
        crspawnShape(1, 25, 0.6, 50, 6000, 4, 0.9, 0.005, 0.5, 100);
      }
      else if (choosing >= 7701 && choosing <= 7750) {//big pentagon
        crspawnShape(1, 150, 0.9, 70, 24000, 5, 1, 0.005, 0.5, 100);
      }
      else if (choosing >= 7751 && choosing <= 7775) {//big hexagon
        crspawnShape(1, 300, 1.2, 90, 96000, 6, 1, 0.005, 0.5, 100);
      }
    }

    //7.choose whether a portal will spawn or not
    if ((Object.keys(portals).length + Object.keys(cavernportals).length) < portalLocations.length) {//if at least one of the portal locations does no have a portal
      var choosingPortal = Math.floor(Math.random() * 150);
      if (choosingPortal <= 2) {
        //spawn portal
        console.log("a crossroads portal spawned!");
        for (var i = 0; i < portalLocations.length; i++) {
          if (portalLocations[i].portalHere == "no") {
            var portalX = portalLocations[i].x;
            var portalY = portalLocations[i].y;
            portalLocations[i].portalHere = "yes";
            break;
          }
        }
        portals[portalID] = {
          x: portalX,
          y: portalY,
          name: "crarena portal",
          width: 90,
          color: "201, 68, 68",
          maxtimer: 5000,
          timer: 5000,
          peopleTouch: 0,
          ruptured: 1,//portals ruptured by default
          enterNumber: 0,
          prevList: [],
          newList: [],
          where: i,
        };
        portalID++;
      }
      else if (choosingPortal <= 4) {
        //spawn portal
        console.log("a portal to 2tdm spawned!");
        for (var i = 0; i < portalLocations.length; i++) {
          if (portalLocations[i].portalHere == "no") {
            var portalX = portalLocations[i].x;
            var portalY = portalLocations[i].y;
            portalLocations[i].portalHere = "yes";
            break;
          }
        }
        portals[portalID] = {
          x: portalX,
          y: portalY,
          name: "portal",
          width: 90,
          color: "116, 70, 135",
          outline: "black", //does not affect color of portal currently, in client code, it uses rgb value
          maxtimer: 5000, //starting number of timer, does not change, must be same value as timer when portal spawn
          timer: 5000, //the higher the number, the longer the portal stays
          peopleTouch: 0,
          ruptured: 1,
          enterNumber: 0,
          prevList: [],
          newList: [],
          destination: "2tdm",//override default arena destination
          where: i,
        };
        portalID++;
      }
      else if (choosingPortal == 6) {
        //spawn cavern portal
        console.log("a cavern portal spawned!");
        for (var i = 0; i < portalLocations.length; i++) {
          if (portalLocations[i].portalHere == "no") {
            var portalX = portalLocations[i].x;
            var portalY = portalLocations[i].y;
            portalLocations[i].portalHere = "yes";
            break;
          }
        }
        cavernportals[portalID] = {
          x: portalX,
          y: portalY,
          width: 90,
          color: "red",
          maxtimer: 5000,
          timer: 5000,
          rgbstate: 0,
          red: 255,
          blue: 0,
          green: 0,
          peopleTouch: 0,
          ruptured: 1,
          enterNumber: 0,
          prevList: [],
          newList: [],
          where: i,
        };
        portalID++;
      }
    }
    //change angle of portal at center of crossroads
    enterCrPortal.angleDegrees++;
    if (enterCrPortal.angleDegrees >= 360) {
      enterCrPortal.angleDegrees = 0;
    }
  } //end of crossroads loop function

  function sendStuffToCrossroadsClient() {
    //next, calculate leaderboard
    //sort the object list based on score, the const below contains the list of id of players on leaderboard
    //note: this const is an array, NOT an object, so cannot use Object.something
    const temporaryPlayerList = Object.keys(players)
      .sort(function(a, b) {
        return players[b].score - players[a].score;
      })
      .slice(0, 8);
    //flip the a and b in the square brackets [] to get opposite order, e.g. ascending instead of descending order
    //.slice(0,10) gets the first ten players, it works even if there are less than 10 players
    var leaderboardplayers = {};
    //leaderboardplayers contain the players info
    temporaryPlayerList.forEach((id) => {
      //add player's name, score and color to list because only need this three in client code
      leaderboardplayers[id] = {
        name: '?'.repeat(players[id].name.length),//replace name with question marks
        color: "#C0C0C0",
        score: players[id].score,
        tank: "0",
        body: "0",
      };
    });
    if (JSON.stringify(leaderboard) !== JSON.stringify(leaderboardplayers)) {//leaderboard did not change
      leaderboard = leaderboardplayers;
      var packet = JSON.stringify(["lb", leaderboardplayers]);
      wss.broadcast(packet);
    }
    //8.send stuff to the players. To edit the stuff you want to send to the players below, simply go to the client code and edit the variables in the function in gameStateUpdate
    //we must check each item in the game to see if it is visible on a 1080x1920 canvas for each player, and only send the things that are supposed to be visible, preventing field of vision hacking
    //NOTE: 1080 and 1920 refers to the canvas width and height
    let serverTime = Date.now();
    for (const playerId in players) {
      items = {};

      //get the stuff visible on client's screen using the quadtree collision code
      //width and height refers to width and height of viewable area
      var bulletelements = bulletTree.retrieve({
        x:
          players[playerId].x -
          (1920 * players[playerId].fovMultiplier) / 2,
        y:
          players[playerId].y -
          (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });
      var playerelements = playerTree.retrieve({
        x:
          players[playerId].x -
          (1920 * players[playerId].fovMultiplier) / 2,
        y:
          players[playerId].y -
          (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });
      var portalelements = portalTree.retrieve({
        x:
          players[playerId].x -
          (1920 * players[playerId].fovMultiplier) / 2,
        y:
          players[playerId].y -
          (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });
      var wallelements = mazewallTree.retrieve({
        x:
          players[playerId].x -
          (1920 * players[playerId].fovMultiplier) / 2,
        y:
          players[playerId].y -
          (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });
      var shapeelements = shapeTree.retrieve({
        x:
          players[playerId].x -
          (1920 * players[playerId].fovMultiplier) / 2,
        y:
          players[playerId].y -
          (1080 * players[playerId].fovMultiplier) / 2,
        width: 1920 * players[playerId].fovMultiplier,
        height: 1080 * players[playerId].fovMultiplier,
      });

      //the portal at center of crossroads
      if (
        Math.abs(enterCrPortal.y - players[playerId].y) <=
        (1080 / 2) * players[playerId].fovMultiplier &&
        Math.abs(enterCrPortal.x - players[playerId].x) <=
        (1920 / 2) * players[playerId].fovMultiplier
      ) {//check if visible on screen
        //in order to copy object instead of referencing, must use ={...object} instead of =object. Referencing an object would cause properties deleted in new object also deleted in original object
        if (!items.hasOwnProperty("Fixedportal")) {
          items.Fixedportal = {};
        }
        items.Fixedportal[1] = { ...enterCrPortal };
      }
      for (let thing of wallelements) {
        var wallID = thing.id;
        if (wallID in mazewalls) {
          if (
            Math.abs(mazewalls[wallID].y - players[playerId].y) <=
              ((1080 / 2) * players[playerId].fovMultiplier + mazewalls[wallID].h) &&
              Math.abs(mazewalls[wallID].x - players[playerId].x) <=
              ((1920 / 2) * players[playerId].fovMultiplier + mazewalls[wallID].w)
          ) {//check if visible on screen
            //maze wall uses w and h so cannot use sendStuffToClient
            if (!items.hasOwnProperty("wall")) {
              items.wall = {};
            }
            items.wall[wallID] = { ...mazewalls[wallID] };
          }
        }
      }
      for (let thing of shapeelements) {
        var shapeID = thing.id;
        if (shapeID in shapes) {
          sendStuffToClient(
            shapes,
            shapeID,
            players,
            playerId,
            "shape",
            [
              "angle",
              "hit",
              "radtier",
              "x",
              "y",
              "sides",
              "width",
              "health",
              "maxhealth",
            ]
          );
        }
      }
      for (let thing of bulletelements) {
        var bulletID = thing.id;
        if (bulletID in bullets) {
          sendStuffToClient(
            bullets,
            bulletID,
            players,
            playerId,
            "bullet",
            [
              "passive",
              "type",
              "ownsIt",
              "hit",
              "color",
              "outline",
              "bulletType",
              "x",
              "y",
              "width",
              "moveAngle",
              "barrels",
              "team",
            ]
          ); //barrels is the mine trap's barrel
        }
      }
      for (let thing of playerelements) {
        var playerID = thing.id;
        if (playerID in players) {
          sendStuffToClient(
            players,
            playerID,
            players,
            playerId,
            "player",
            [
              "turretBaseSize",
              "spawnProtectionDuration",
              "spawnProtection",
              "assets",
              "developer",
              "chats",
              "x",
              "y",
              "angle",
              "tankType",
              "bodyType",
              "width",
              "barrels",
              "bodybarrels",
              "hit",
              "team",
              "color",
              "outline",
              "name",
              "level",
              "health",
              "maxhealth",
              "fovMultiplier",
            ]
          );
        }
      }

      //combine arena portal and cavern portal lists together so that all portals can be sent together and shown on minimap
      let totalportals = {
        ...portals,
        ...cavernportals,
      };

      //PORTAL STUFF
      //check which portals send before, then only send the different stuff
      if (!prevportals.hasOwnProperty(playerId)) {//frst time sending stuff to this client
        prevportals[playerId] = {};
      }
      //compare differences between previtems and items
      var listOfUnwantedProperties = ["enterNumber", "prevList", "newList"];//list of properties that dont need to be sent to client
      var resultportals = {};
      for (const portal in totalportals) {
        if (!prevportals[playerId].hasOwnProperty(portal)) {//new portal
          resultportals[portal] = { ...totalportals[portal] };
          prevportals[playerId][portal] = JSON.parse(JSON.stringify(totalportals[portal]));//deep clone to prevent object reference
        }
        else if (totalportals[portal] != prevportals[playerId][portal]) {//a property changed (send that property only)
          resultportals[portal] = {};
          for (const prop in totalportals[portal]) {
            if (!listOfUnwantedProperties.includes(prop)) {//if this is a property that needs to be sent to client
              if (totalportals[portal][prop] != prevportals[playerId][portal][prop]) {
                resultportals[portal][prop] = totalportals[portal][prop];
              }
            }
          }
          prevportals[playerId][portal] = JSON.parse(JSON.stringify(totalportals[portal]));//deep clone to prevent object reference
        }
      }
      for (const portal in prevportals[playerId]) {
        if (!totalportals.hasOwnProperty(portal)) {
          resultportals[portal] = "del"
          delete prevportals[playerId][portal]
        }
      }


      //GAME STUFF
      //check which stuff send before, then only send the different stuff
      if (!previtems.hasOwnProperty(playerId)) {//frst time sending stuff to this client
        previtems[playerId] = {};
      }
      //compare differences between previtems and items

      var resultitems = diff(previtems[playerId], items);
      previtems[playerId] = JSON.parse(JSON.stringify(items));

      var packet = JSON.stringify(["game", resultitems, duration, resultportals, serverTime]);
      packet = pako.deflate(packet)
      lookup[playerId].send(packet);//send stuff to specific player
      //this is only sent to players in the players list, so that players who disconnected, died, or in home page will not receive this
    }
  }


  // we need to create our own http server so express and ws can share it.
  const server = http.createServer(app);
  // pass the created server to ws
  const wss = new WebSocket.Server({ server });
  wss.on('connection', function connection(client, req) {//someone connected to the server
    //Create Unique User ID for player
    client.id = UUID();

    console.log("User connected: ", client.id);
    lookup[client.id] = client;//allow the server to send stuff to specific client

    client.packetCount = 0;//number of packets sent, if exceed a certain amount, disconnect that dude
    client.packetTime = Date.now();

    //get ip address
    //prevent bots and multitab

    //reject websocket connection if header does not meet the requirements
    if (!req.headers.origin.includes("developer-rocketer.glitch.me") && !req.headers.origin.includes("rocketer.glitch.me")) {
      //must open website with rocketer (but origin header can be edited)
      //kick user
      var packet = JSON.stringify(["newNotification",
        "Server rejected your connection. Possible botter.",
        "red"]);
      client.send(packet)
      client.terminate();
    }
    else if (!req.headers.hasOwnProperty("pragma") || !req.headers.hasOwnProperty("user-agent") || !req.headers.hasOwnProperty("cache-control")) {
      //kick user
      var packet = JSON.stringify(["newNotification",
        "Server rejected your connection. Possible botter.",
        "red"]);
      client.send(packet)
      client.terminate();
    }

    if (req.headers['x-forwarded-for'] || req.socket.remoteAddress) {
      var clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress; //ip of proxies
      var arr = clientIp.split(",");
      var ip = arr.shift(); //actual originating ip
      if (clientIP.hasOwnProperty(ip)) {
        //if already have ip address inside, means user connected more than once
        if (typeof clientIP[ip][0] === 'undefined') {//client might become undefined if player teleports
          lookup[clientIP[ip][0]] = client;
          clientIP[ip][0] = client.id;
        }
        else if (typeof clientIP[ip][1] === 'undefined') {//allow 2 connections per ip, this is the 2nd one
          lookup[clientIP[ip][1]] = client;
          clientIP[ip][1] = client.id;
        }
        else {
          console.log("bruh bot or multitab");
          console.log(clientIP[ip][0])
          console.log(clientIP[ip][1])
          //kick user
          var packet = JSON.stringify(["newNotification",
            "Too many connections! Kicking...",
            "red"]);
          lookup[clientIP[ip][0]].send(packet)
          lookup[clientIP[ip][0]].terminate();
          clientIP[ip][0] = client.id;//upadte client id to new client
        }
      } else {
        clientIP[ip] = [client.id]; //add ip to list of ip addresses
      }
      findIpUsingId[client.id] = clientIp;//allow respawning with score (which uses ip addr)
      console.log(clientIP);
    } else {
      //no ip address?!?!
      console.log("stoopid");
      //kick user
      var packet = JSON.stringify(["newNotification",
        "Error: No IP address detected! Kicking...",
        "red"]);
      client.send(packet)
      client.terminate();//kick current client
    }

    if (gamemode == "arena" || gamemode == "2tdm" || gamemode == "editor") {
      //the code below is to send the player's id to the player, note that if a new player enters the game, his id is sent to all the players in the game
      var packet = JSON.stringify(["sendID", client.id]);
      client.send(packet)
    }
    if (gamemode == "arena") {
      //send featured youtuber
      var whichYouTuber = Math.floor(Math.random() * numberOfYoutubers); //random choose which youtuber to send
      packet = JSON.stringify(["youtuber", youtuberlist[whichYouTuber].youtuberIcon, youtuberlist[whichYouTuber].youtuberName, youtuberlist[whichYouTuber].youtuberURL]);
      client.send(packet)
    }


    client.on('message', function(message) {//client send stuff to the server
      //limit the number of packets per second
      //if keep moving mouse, max mouse packets sent is 33. Current packet limit is 50.
      client.packetCount++;
      if ((Date.now() - client.packetTime) > 3000) {//3 seconds (dont put 1 second, or else lag will cause paket exceed)
        if (client.packetCount > 225) {//client sent more than 75 packets within a second
          var packet = JSON.stringify(["newNotification", "Exceeded max packet limit.", "rgb(150,0,0)"]);
          client.send(packet)
          client.terminate();
        }
        else {
          client.packetTime = Date.now();
          client.packetCount = 0;
        }
      }
      let info = "";
      let type = "unknown";
      try {//try to parse the mesage
        info = JSON.parse(message);
        type = info[0];//type of event
      }
      catch (err) {//if user sends an malformed packet
        console.log("fak u")
      }
      if (type == "up") {
        if (players.hasOwnProperty(client.id)) {
          //check if client exists in game, must check because client can send this function even when havent joined game as it has id
          if (players[client.id].amountAddWhenMoveY > 0){//pressing down arrow and up arrow
            players[client.id].amountAddWhenMoveY = 0;
          }
          else{
            players[client.id].amountAddWhenMoveY = -players[client.id].speed;
          }
        }
      }
      else if (type == "down") {
        if (players.hasOwnProperty(client.id)) {
          if (players[client.id].amountAddWhenMoveY < 0){//pressing down arrow and up arrow
            players[client.id].amountAddWhenMoveY = 0;
          }
          else{
            players[client.id].amountAddWhenMoveY = players[client.id].speed;
          }
        }
      }
      else if (type == "left") {
        if (players.hasOwnProperty(client.id)) {
          if (players[client.id].amountAddWhenMoveX > 0){//pressing left and right arrow
            players[client.id].amountAddWhenMoveX = 0;
          }
          else{
            players[client.id].amountAddWhenMoveX = -players[client.id].speed;
          }
        }
      }
      else if (type == "right") {
        if (players.hasOwnProperty(client.id)) {
          if (players[client.id].amountAddWhenMoveX < 0){//pressing left and right arrow
            players[client.id].amountAddWhenMoveX = 0;
          }
          else{
            players[client.id].amountAddWhenMoveX = players[client.id].speed;
          }
        }
      }
      else if (type == "upRelease") {
        if (players.hasOwnProperty(client.id)) {
          if (players[client.id].amountAddWhenMoveY < 0) {
            players[client.id].amountAddWhenMoveY = 0;
          }
          else{//pressing both up and down arrow, then release up arrow
            players[client.id].amountAddWhenMoveY = players[client.id].speed;
          }
        }
      }
      else if (type == "downRelease") {
        if (players.hasOwnProperty(client.id)) {
          if (players[client.id].amountAddWhenMoveY > 0) {
            players[client.id].amountAddWhenMoveY = 0;
          }
          else{
            players[client.id].amountAddWhenMoveY = -players[client.id].speed;
          }
        }
      }
      else if (type == "leftRelease") {
        if (players.hasOwnProperty(client.id)) {
          if (players[client.id].amountAddWhenMoveX < 0) {
            players[client.id].amountAddWhenMoveX = 0;
          }
          else{
            players[client.id].amountAddWhenMoveX = players[client.id].speed;
          }
        }
      }
      else if (type == "rightRelease") {
        if (players.hasOwnProperty(client.id)) {
          if (players[client.id].amountAddWhenMoveX > 0) {
            players[client.id].amountAddWhenMoveX = 0;
          }
          else{
            players[client.id].amountAddWhenMoveX = -players[client.id].speed;
          }
        }
      }
      else if (type == "wr") {
        //if client request for world record information
        var packet = JSON.stringify(["receiveWR", worldrecord]);
        client.send(packet);
      }
      else if (type == "mouseMoved") {
        let x = info[1];
        let y = info[2];
        let angle = info[3];
        //retrieve angle of mouse from tank from client
        //if player exists in game and player is not tank with AI, e.g. mono
        if (players.hasOwnProperty(client.id) && angle < 10 && angle > -10) {//too large number will allow octo stack script
          var rotateAngle = angle - 90 * Math.PI / 180;//must minus 90 degress to change axis, then change to radians
          if (players[client.id].autorotate == "no" && players[client.id].fastautorotate == "no") { //if auto-rotate off
            players[client.id].angle = rotateAngle;
          }
          if (players[client.id].hasOwnProperty("mousex") && players[client.id].hasOwnProperty("mousey")) { //needed for calculating drone movement angle
            players[client.id].mousex = x;
            players[client.id].mousey = y;
            if (players[client.id].droneMode != "repel") {
              players[client.id].droneMode = "moving";
            }
          }
        }
      }
      else if (type == "mousePressed") {
        let button = info[1];
        //client tell server that user pressed mouse
        if (players.hasOwnProperty(client.id)) {
          players[client.id].shooting = "yes";
          if (button == 1) {
            //1 refers to left click, 3 refers to right click
            players[client.id].droneMode = "moving";
          }
          else if (button == 3) {
            players[client.id].droneMode = "repel";
          }
        }
      }
      else if (type == "mouseReleased") {
        let button = info[1];
        //client tell server that user released mouse
        if (players.hasOwnProperty(client.id)) {
          players[client.id].shooting = "no";
        }
      }
      else if (type == "auto-fire") {
        //client press 'e' to turn on/off auto-fire
        if (players.hasOwnProperty(client.id)) {
          if (players[client.id].autofire == "yes") {
            players[client.id].autofire = "no";
          } else {
            players[client.id].autofire = "yes";
          }
        }
      }
      else if (type == "auto-rotate") {
        //client press 'c' to turn on/off auto-rotate
        if (players.hasOwnProperty(client.id)) {
          if (players[client.id].autorotate == "yes") {
            players[client.id].autorotate = "no";
          } else {
            players[client.id].autorotate = "yes";
            players[client.id].fastautorotate = "no";
          }
        }
      }
      else if (type == "fast-auto-rotate") {
        //client press 'f' to turn on/off fast-auto-rotate
        if (players.hasOwnProperty(client.id)) {
          if (players[client.id].fastautorotate == "yes") {
            players[client.id].fastautorotate = "no";
          } else {
            players[client.id].fastautorotate = "yes";
            players[client.id].autorotate = "no";
          }
        }
      }
      else if (type == "passive-mode") {
        //client press 'p' to turn on/off passive mode
        if (players.hasOwnProperty(client.id)) {
          if (players[client.id].passive == "yes") {
            players[client.id].passive = "no";
          } else {
            players[client.id].passive = "yes";
          }
        }
      }
      else if (type == "logInOrSignUp") {
        let username = info[1];
        let password = info[2];
        let description = info[3];
        let which = info[4];
        //client want to sign up or log in to an account
        //check if account exists, if it does, then tell client that successfully log in
        //else, create account and tell client that successfully sign up
        //all those stuff are done in a function trigered by findAccount, cannot do here because findAccount is synchronous
        if (!clientAccountIDs.hasOwnProperty(client.id)) {
          //if client has not created an account
          if (username.length <= 15 && password.length <= 15 && password.length >= 5 && description.length <= 50) {
            var packetToMainServer = ["findacc", process.env.teleportingPassword, gamemode, username, password, description, client.id, which];//send password to verify
            axios.post(mainserverURL, packetToMainServer)
              .then(function(response) {
                //console.log(response);
                console.log("sent acc 2")
              })
              .catch(function(error) {
                console.log("Connectivity error");
                var packet = JSON.stringify(["newNotification",
                  "Server error occured when trying to log in.", "orange"]);
                lookup[client.id].send(packet);
              });
          }
        }
      }
      else if (type == "editaccount") {
        let username = info[1];
        let password = info[2];
        let description = info[3];
        let nusername = info[4];
        let npassword = info[5];
        let ndescription = info[6];
        if (clientAccountIDs.hasOwnProperty(client.id) && nusername.length < 15 && npassword.length < 15 && npassword.length > 5 && ndescription.length < 50) {
          var packetToMainServer = ["editacc", process.env.teleportingPassword, gamemode, username, password, description, nusername, npassword, ndescription, client.id, clientAccountIDs[client.id]]; //send password to verify
          axios.post(mainserverURL, packetToMainServer)
            .then(function(response) {
              //console.log(response);
              console.log("sent acc 3")
            })
            .catch(function(error) {
              console.log("Connectivity error");
              var packet = JSON.stringify(["newNotification",
                "Server error occured when trying to edit your account.", "orange"]);
              lookup[client.id].send(packet);
            });
        }
      }
      else if (type == "upgradeSkillPoints") {
        let skillNumber = info[1];
        //client wants to upgrade skill points
        var arrayNumber = skillNumber - 1; //because array values start from 0, instead of 1, so fisrt skill point is 0 not 1
        var maxSkillPoint = 15; //maximum number of skill points
        if (players.hasOwnProperty(client.id)) {
          if (players[client.id].unusedPoints > 0 && players[client.id].skillPoints[arrayNumber] < maxSkillPoint) {
            players[client.id].skillPoints[arrayNumber]++;
            players[client.id].unusedPoints--;
            updateStatsSkillPoint(players, client.id, arrayNumber);
          }
        }
      }
      else if (type == "developerTest") {
        let token = info[1];
        //if client give token
        if (token == process.env.developerToken) {
          //correct token
          var packet = JSON.stringify(["newNotification", "Correct token! Note: you must provide the token every time you enter the game.", "green"]);
          client.send(packet);
          peopleWithToken.push(client.id); //add client's id to list of people who gave correct token
        } else {
          var packet = JSON.stringify(["newNotification", "Wrong token! Are you guessing?", "red"]);
          client.send(packet);
        }
      }
      else if (type == "chat") {
        let message = info[1];
        //client send message
        if (players.hasOwnProperty(client.id)) {
          var player = players[client.id];
        }
        if (player) {
          //later on, add code for removing message after 5 seconds
          try {
            message = message.toString();//change to string
          }
          catch (err) {
            message = "";//someone sending invalid message type
          }
          if (message != null && message != "") {
            message = message.replace(/[^\x00-\x7F]/g, ""); //remove non ascii characters
            if (message.length > 750) {
              //maximum chat length of 750
              message = message.substring(0, 750); //get first 750 characters
              var packet = JSON.stringify(["newNotification", "Your message exceeds the 750 character limit.", "dimgrey"]);
              client.send(packet);
            }

            if (player.chats.length == 3) {
              //if messages already have 3
              player.chats.shift(); //delete oldest chat
            }
            if (player.chats.length < 3) {
              //if messages less than 3
              var messageObj = {
                chat: message,
                time: 0,
              };
              player.chats.push(messageObj);
            }

            //developer commands
            if (player.developer == "yes") {
              //if a developer
              if (message.includes("?help")) {//send list of commands
                player.chats.shift(); //prevent command from appearing as a chat
                var packet = JSON.stringify(["newNotification", "Command list:\n?bc (broadcast notification)\n?name (changes name)\n?col (override color)\n?fov\n?rainbow\n?stoprainbow\n?blackandwhite\n?stopblackandwhite\n?xp (change score)\n?u1 (ball tank)\n?u2 (gun tank)\n?u3 (anchor tank)\n?u4 (bomber tank)\n?u5 (surveyor)\n?u6 (ring)", "rgb(15,15,15)"]);
                client.send(packet);
              } else if (message.includes("?bc")) {
                //broadcast command
                let broadcastmessage = message.replace("?bc", "");
                if (broadcastmessage.length >= 100) {
                  broadcastmessage = broadcastmessage.substring(0, 100);
                }
                player.chats.shift(); //prevent command from appearing as a chat
                var packet = JSON.stringify(["newNotification", broadcastmessage, "dimgrey"]);
                wss.broadcast(packet);//send to everyone
              } else if (message.includes("?name")) {
                //broadcast command
                let nameset = message.replace("?name", "");
                player.chats.shift(); //prevent command from appearing as a chat
                player.name = nameset;
              } else if (message.includes("?col")) {
                let col = message.replace("?col", "");
                let col2 = message.replace("?col", "");
                if (col.length == 7 && col.startsWith("#")) {
                  //if is hex code
                  try {
                    player.color = col;
                    player.outline = col;
                  } catch (err) {
                    console.log(err);
                  }
                } else if (isNaN(col2)) {
                  //if is color name or anything else but hex
                  try {
                    player.color = col2;
                    player.outline = col2;
                  } catch (err) {
                    console.log(err);
                  }
                } else {
                  var packet = JSON.stringify(["newNotification", "Syntax: ?col [rgba/hsla/rgb/hsl/hex/color name]. Try ?col transparent lol", "dimgrey"]);
                  client.send(packet);
                }
                player.chats.shift();
              } else if (message.includes("?rainbow")) {
                player.rainbow = 0;
                player.chats.shift();
              } else if (message.includes("?stoprainbow")) {
                player.rainbow = -1;//turn off rainbow
                player.color = "#00B0E1";
                player.outline = "#0092C3";
                player.chats.shift();
              } else if (message.includes("?blackandwhite")) {
                player.blackandwhite = 0;
                player.blackandwhiteState = 0;
                player.chats.shift();
              } else if (message.includes("?stopblackandwhite")) {
                player.blackandwhite = -1;
                player.color = "#00B0E1";
                player.outline = "#0092C3";
                player.chats.shift();
              } else if (message.includes("?xp")) {
                let maxscore = 10000000000;
                if (message == "?xp max") {
                  player.score = maxscore;
                } else {
                  let xp = Number(message.replace("?xp ", ""));
                  if (xp <= maxscore && xp >= 0) {
                    player.score = xp;
                  } else {
                    if (xp <= maxscore) {
                      //player score too big
                      player.score = maxscore;
                    } else {
                      //player score too small
                      player.score = 0;
                    }
                    var packet = JSON.stringify(["newNotification", "Invalid score!", "dimgrey"]);
                    client.send(packet);
                  }
                }
                player.chats.shift();
              } else if (message.includes("?fov")) {
                if (isNaN(+message.replace("?fov ", "")) !== true) {
                  player.fovMultiplier = +message.replace("?fov ", ""); //change fov to set fov
                  player.chats.shift(); //prevent command from appearing as a chat
                  var packet = JSON.stringify(["newNotification", "Set your FoV multiplier to " + player.fovMultiplier, "rgb(15,15,15)"]); //send confirmation to player
                  client.send(packet);
                }
              } else if (message.includes("?logdatatoserver")) {
                player.chats.shift(); //prevent command from appearing as a chat
                console.log(JSON.stringify(player)); //log player data to server (i need this pls dont remove)		
              } else if (message.includes("?u1")) {
                //ball upgrade command
                //upgrade to ball
                player.barrels = {};
                player.bodybarrels = {};
                player.assets = {};
                player.health = 10000;
                player.maxhealth = 10000000;
                player.damage = 5000;
                player.healthRegenTime = 0;
                player.healthRegenSpeed = 10000000;
                player.fovMultiplier = 2;
                player.speed = 20;
                player.tankType = "ball";
                player.bodyType = "ball";
                player.chats.shift(); //prevent command from appearing as a chat
              } else if (message.includes("?u2")) {
                //ball upgrade command
                //upgrade to gun
                player.barrels = {
                  barrelOne: {
                    barrelWidth: (player.width / 5) * 2.78,
                    barrelHeight: (player.height / 25) * 50,
                    additionalAngle: 0,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 1 * player.statMultiplier[5], //lesser is more bullets
                    bulletHealth: 100,
                    bulletDamage: 100 * player.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 30, //max amount of time that bullet can move
                    bulletSpeed: 25 * player.statMultiplier[3], //this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, //reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, //this reload changes in amount when shooting
                    recoil: 5,
                  },
                };
                player.bodybarrels = {};
                player.assets = {};
                player.health = 10000;
                player.maxhealth = 10000;
                player.damage = 100;
                player.healthRegenTime = 20;
                player.healthRegenSpeed = 100;
                player.speed = 30;
                player.fovMultiplier = 1.5;
                player.tankType = "gun";
                player.bodyType = "ball";
                player.chats.shift(); //prevent command from appearing as a chat
              } else if (message.includes("?u3")) {
                //ANCHOR
                (player.mousex = 0),
                  (player.mousey = 0),
                  (player.barrels = {
                    barrelOne: {
                      barrelWidth: player.width,
                      barrelHeight: player.height * 1.2,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "drone",
                      droneLimit: 5,
                      droneCount: 0, //changes when drones spawn and die
                      reloadRecover: 10,
                      bulletHealth: 7050,
                      bulletDamage: 4542.5,
                      bulletPenetration: 0,
                      bulletTimer: 1000,
                      bulletSpeed: 50,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                  }),
                  (player.bodybarrels = {});
                player.assets = {};
                player.health = 10000;
                player.maxhealth = 10000;
                player.damage = 100;
                player.healthRegenTime = 20;
                player.healthRegenSpeed = 100;
                player.speed = 30;
                player.fovMultiplier = 1.5;
                player.tankType = "anchor";
                player.bodyType = "ball";
                playerUpgrade.dronesControlling = [];
                player.chats.shift(); //prevent command from appearing as a chat
              } else if (message.includes("?u4")) {
                player.mousex = 0;
                player.mousey = 0;
                player.barrels = {
                  barrelOne: {
                    barrelWidth: (player.width / 5) * 5, // Smaller barrel width
                    barrelHeight: (player.height / 25) * 50, // Smaller barrel height
                    additionalAngle: 150,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 6 * player.statMultiplier[5], // lesser is more bullets
                    bulletHealth: 100,
                    bulletDamage: 100 * player.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 30, // max amount of time that bullet can move
                    bulletSpeed: 25 * player.statMultiplier[3], // this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, // reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, // this reload changes in amount when shooting
                    recoil: 0,
                  },
                  barrelTwo: {
                    barrelWidth: (player.width / 5) * 5, // Smaller barrel width
                    barrelHeight: (player.height / 25) * 50, // Smaller barrel height
                    additionalAngle: 90,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 6 * player.statMultiplier[5], // lesser is more bullets
                    bulletHealth: 100,
                    bulletDamage: 100 * player.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 30, // max amount of time that bullet can move
                    bulletSpeed: 25 * player.statMultiplier[3], // this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, // reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, // this reload changes in amount when shooting
                    recoil: 0,
                  },
                  barrelThree: {
                    barrelWidth: (player.width / 5) * 5, // Smaller barrel width
                    barrelHeight: (player.height / 25) * 50, // Smaller barrel height
                    additionalAngle: 30,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 6 * player.statMultiplier[5], // lesser is more bullets
                    bulletHealth: 100,
                    bulletDamage: 100 * player.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 30, // max amount of time that bullet can move
                    bulletSpeed: 25 * player.statMultiplier[3], // this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, // reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, // this reload changes in amount when shooting
                    recoil: 0,
                  },
                  barrelFour: {
                    barrelWidth: (player.width / 5) * 5, // Smaller barrel width
                    barrelHeight: (player.height / 25) * 50, // Smaller barrel height
                    additionalAngle: 330,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 6 * player.statMultiplier[5], // lesser is more bullets
                    bulletHealth: 100,
                    bulletDamage: 100 * player.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 30, // max amount of time that bullet can move
                    bulletSpeed: 25 * player.statMultiplier[3], // this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, // reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, // this reload changes in amount when shooting
                    recoil: 0,
                  },
                  barrelFive: {
                    barrelWidth: (player.width / 5) * 5, // Smaller barrel width
                    barrelHeight: (player.height / 25) * 50, // Smaller barrel height
                    additionalAngle: 210,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 6 * player.statMultiplier[5], // lesser is more bullets
                    bulletHealth: 100,
                    bulletDamage: 100 * player.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 30, // max amount of time that bullet can move
                    bulletSpeed: 25 * player.statMultiplier[3], // this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, // reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, // this reload changes in amount when shooting
                    recoil: 0,
                  },
                  barrelSix: {
                    barrelWidth: (player.width / 5) * 5, // Smaller barrel width
                    barrelHeight: (player.height / 25) * 50, // Smaller barrel height
                    additionalAngle: 270,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 6 * player.statMultiplier[5], // lesser is more bullets
                    bulletHealth: 100,
                    bulletDamage: 100 * player.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 30, // max amount of time that bullet can move
                    bulletSpeed: 25 * player.statMultiplier[3], // this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, // reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, // this reload changes in amount when shooting
                    recoil: 0,
                  },
                  barrelSeven: {
                    barrelWidth: (player.width / 5) * 5, // Smaller barrel width
                    barrelHeight: (player.height / 25) * 50, // Smaller barrel height
                    additionalAngle: 180,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 6 * player.statMultiplier[5], // lesser is more bullets
                    bulletHealth: 100,
                    bulletDamage: 100 * player.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 30, // max amount of time that bullet can move
                    bulletSpeed: 25 * player.statMultiplier[3], // this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, // reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, // this reload changes in amount when shooting
                    recoil: 0,
                  },
                  barrelEight: {
                    barrelWidth: (player.width / 5) * 5, // Smaller barrel width
                    barrelHeight: (player.height / 25) * 50, // Smaller barrel height
                    additionalAngle: 150,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 6 * player.statMultiplier[5], // lesser is more bullets
                    bulletHealth: 100,
                    bulletDamage: 100 * player.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 30, // max amount of time that bullet can move
                    bulletSpeed: 25 * player.statMultiplier[3], // this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, // reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, // this reload changes in amount when shooting
                    recoil: 0,
                  },
                  barrelNine: {
                    barrelWidth: (player.width / 5) * 5, // Smaller barrel width
                    barrelHeight: (player.height / 25) * 50, // Smaller barrel height
                    additionalAngle: 90,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 6 * player.statMultiplier[5], // lesser is more bullets
                    bulletHealth: 100,
                    bulletDamage: 100 * player.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 30, // max amount of time that bullet can move
                    bulletSpeed: 25 * player.statMultiplier[3], // this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, // reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, // this reload changes in amount when shooting
                    recoil: 0,
                  },
                  barrelTen: {
                    barrelWidth: (player.width / 5) * 5, // Smaller barrel width
                    barrelHeight: (player.height / 25) * 50, // Smaller barrel height
                    additionalAngle: 30,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 6 * player.statMultiplier[5], // lesser is more bullets
                    bulletHealth: 100,
                    bulletDamage: 100 * player.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 30, // max amount of time that bullet can move
                    bulletSpeed: 25 * player.statMultiplier[3], // this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, // reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, // this reload changes in amount when shooting
                    recoil: 0,
                  },
                  barrelEleven: {
                    barrelWidth: (player.width / 5) * 5, // Smaller barrel width
                    barrelHeight: (player.height / 25) * 50, // Smaller barrel height
                    additionalAngle: 330,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 6 * player.statMultiplier[5], // lesser is more bullets
                    bulletHealth: 100,
                    bulletDamage: 100 * player.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 30, // max amount of time that bullet can move
                    bulletSpeed: 25 * player.statMultiplier[3], // this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, // reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, // this reload changes in amount when shooting
                    recoil: 0,
                  },
                  barrelTwelve: {
                    barrelWidth: (player.width / 5) * 5, // Smaller barrel width
                    barrelHeight: (player.height / 25) * 50, // Smaller barrel height
                    additionalAngle: 210,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 6 * player.statMultiplier[5], // lesser is more bullets
                    bulletHealth: 100,
                    bulletDamage: 100 * player.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 30, // max amount of time that bullet can move
                    bulletSpeed: 25 * player.statMultiplier[3], // this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, // reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, // this reload changes in amount when shooting
                    recoil: 0,
                  },
                };

                player.bodybarrels = {};
                player.assets = {};
                player.health = 10000;
                player.maxhealth = 10000;
                player.damage = 100;
                player.healthRegenTime = 20;
                player.healthRegenSpeed = 100;
                player.speed = 30;
                player.fovMultiplier = 1.5;
                player.tankType = "bomber";
                player.bodyType = "ball";
                player.chats.shift(); // Prevent command from appearing as a chat
              } else if (message.includes("?u5")) {
                player.barrels = {};
                player.bodybarrels = {};
                player.assets = {};
                player.health = 1000000;
                player.maxhealth = 1000000;
                player.damage = 0;
                player.healthRegenTime = 20;
                player.healthRegenSpeed = 100;
                player.fovMultiplier = 5;
                player.speed = 100;
                player.tankType = "surveyor";
                player.bodyType = "harmless";
                player.chats.shift(); //prevent command from appearing as a chat
              } else if (message.includes("?u6")) {
                player.barrels = {
                  barrelOne: {
                    barrelWidth: (player.width / 5) * 5, // Smaller barrel width
                    barrelHeight: (player.height / 25) * 50, // Smaller barrel height
                    additionalAngle: 30,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 1 * player.statMultiplier[5], // lesser is more bullets
                    bulletHealth: 100,
                    bulletDamage: 100 * player.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 2, // max amount of time that bullet can move
                    bulletSpeed: 100 * player.statMultiplier[3], // this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, // reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, // this reload changes in amount when shooting
                    recoil: 0,
                  },
                  barrelTwo: {
                    barrelWidth: (player.width / 5) * 5, // Smaller barrel width
                    barrelHeight: (player.height / 25) * 50, // Smaller barrel height
                    additionalAngle: 60,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 1 * player.statMultiplier[5], // lesser is more bullets
                    bulletHealth: 100,
                    bulletDamage: 100 * player.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 2, // max amount of time that bullet can move
                    bulletSpeed: 100 * player.statMultiplier[3], // this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, // reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, // this reload changes in amount when shooting
                    recoil: 0,
                  },
                  barrelThree: {
                    barrelWidth: (player.width / 5) * 5, // Smaller barrel width
                    barrelHeight: (player.height / 25) * 50, // Smaller barrel height
                    additionalAngle: 90,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 1 * player.statMultiplier[5], // lesser is more bullets
                    bulletHealth: 100,
                    bulletDamage: 100 * player.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 2, // max amount of time that bullet can move
                    bulletSpeed: 100 * player.statMultiplier[3], // this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, // reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, // this reload changes in amount when shooting
                    recoil: 0,
                  },
                  barrelFour: {
                    barrelWidth: (player.width / 5) * 5, // Smaller barrel width
                    barrelHeight: (player.height / 25) * 50, // Smaller barrel height
                    additionalAngle: 120,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 1 * player.statMultiplier[5], // lesser is more bullets
                    bulletHealth: 100,
                    bulletDamage: 100 * player.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 2, // max amount of time that bullet can move
                    bulletSpeed: 100 * player.statMultiplier[3], // this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, // reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, // this reload changes in amount when shooting
                    recoil: 0,
                  },
                  barrelFive: {
                    barrelWidth: (player.width / 5) * 5, // Smaller barrel width
                    barrelHeight: (player.height / 25) * 50, // Smaller barrel height
                    additionalAngle: 150,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 1 * player.statMultiplier[5], // lesser is more bullets
                    bulletHealth: 100,
                    bulletDamage: 100 * player.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 2, // max amount of time that bullet can move
                    bulletSpeed: 100 * player.statMultiplier[3], // this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, // reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, // this reload changes in amount when shooting
                    recoil: 0,
                  },
                  barrelSix: {
                    barrelWidth: (player.width / 5) * 5, // Smaller barrel width
                    barrelHeight: (player.height / 25) * 50, // Smaller barrel height
                    additionalAngle: 180,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 1 * player.statMultiplier[5], // lesser is more bullets
                    bulletHealth: 100,
                    bulletDamage: 100 * player.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 2, // max amount of time that bullet can move
                    bulletSpeed: 100 * player.statMultiplier[3], // this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, // reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, // this reload changes in amount when shooting
                    recoil: 0,
                  },
                  barrelSeven: {
                    barrelWidth: (player.width / 5) * 5, // Smaller barrel width
                    barrelHeight: (player.height / 25) * 50, // Smaller barrel height
                    additionalAngle: 210,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 1 * player.statMultiplier[5], // lesser is more bullets
                    bulletHealth: 100,
                    bulletDamage: 100 * player.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 2, // max amount of time that bullet can move
                    bulletSpeed: 100 * player.statMultiplier[3], // this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, // reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, // this reload changes in amount when shooting
                    recoil: 0,
                  },
                  barrelEight: {
                    barrelWidth: (player.width / 5) * 5, // Smaller barrel width
                    barrelHeight: (player.height / 25) * 50, // Smaller barrel height
                    additionalAngle: 240,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 1 * player.statMultiplier[5], // lesser is more bullets
                    bulletHealth: 100,
                    bulletDamage: 100 * player.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 2, // max amount of time that bullet can move
                    bulletSpeed: 100 * player.statMultiplier[3], // this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, // reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, // this reload changes in amount when shooting
                    recoil: 0,
                  },
                  barrelNine: {
                    barrelWidth: (player.width / 5) * 5, // Smaller barrel width
                    barrelHeight: (player.height / 25) * 50, // Smaller barrel height
                    additionalAngle: 270,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 1 * player.statMultiplier[5], // lesser is more bullets
                    bulletHealth: 100,
                    bulletDamage: 100 * player.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 2, // max amount of time that bullet can move
                    bulletSpeed: 100 * player.statMultiplier[3], // this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, // reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, // this reload changes in amount when shooting
                    recoil: 0,
                  },
                  barrelTen: {
                    barrelWidth: (player.width / 5) * 5, // Smaller barrel width
                    barrelHeight: (player.height / 25) * 50, // Smaller barrel height
                    additionalAngle: 300,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 1 * player.statMultiplier[5], // lesser is more bullets
                    bulletHealth: 100,
                    bulletDamage: 100 * player.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 2, // max amount of time that bullet can move
                    bulletSpeed: 100 * player.statMultiplier[3], // this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, // reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, // this reload changes in amount when shooting
                    recoil: 0,
                  },
                  barrelEleven: {
                    barrelWidth: (player.width / 5) * 5, // Smaller barrel width
                    barrelHeight: (player.height / 25) * 50, // Smaller barrel height
                    additionalAngle: 330,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 1 * player.statMultiplier[5], // lesser is more bullets
                    bulletHealth: 100,
                    bulletDamage: 100 * player.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 2, // max amount of time that bullet can move
                    bulletSpeed: 100 * player.statMultiplier[3], // this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, // reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, // this reload changes in amount when shooting
                    recoil: 0,
                  },
                  barrelTwelve: {
                    barrelWidth: (player.width / 5) * 5, // Smaller barrel width
                    barrelHeight: (player.height / 25) * 50, // Smaller barrel height
                    additionalAngle: 360,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 1 * player.statMultiplier[5], // lesser is more bullets
                    bulletHealth: 100,
                    bulletDamage: 100 * player.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 2, // max amount of time that bullet can move
                    bulletSpeed: 100 * player.statMultiplier[3], // this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, // reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, // this reload changes in amount when shooting
                    recoil: 0,
                  },
                };

                player.bodybarrels = {};
                player.assets = {
                  assetOne: {
                    //grey aura base asset
                    type: "above",
                    sides: 0,
                    color: "rgb(105, 104, 104)",
                    outline: "rgb(79, 78, 78)",
                    outlineThickness: 5,
                    size: 2, //in comparison to the player's width
                    angle: 0,
                    x: 0,
                    y: 0,
                  },
                  assetTwo: {
                    //grey aura base asset
                    type: "above",
                    sides: 0,
                    color: "white",
                    outline: "rgb(79, 78, 78)",
                    outlineThickness: 5,
                    size: 0.3, //in comparison to the player's width
                    angle: 0,
                    x: 0,
                    y: 10,
                  },
                  assetThree: {
                    //grey aura base asset
                    type: "above",
                    sides: 0,
                    color: "white",
                    outline: "rgb(79, 78, 78)",
                    outlineThickness: 5,
                    size: 0.3, //in comparison to the player's width
                    angle: 0,
                    x: 0,
                    y: -10,
                  },
                };
                player.health = 10000;
                player.maxhealth = 10000;
                player.damage = 100;
                player.healthRegenTime = 20;
                player.healthRegenSpeed = 100;
                player.speed = 30;
                player.fovMultiplier = 1.5;
                player.tankType = "ring";
                player.bodyType = "ball";
                player.chats.shift(); // Prevent command from appearing as a chat
              }
            }
          }
        }
      }
      else if (type == "upgradePlease") {
        let button = info[1];
        let type = info[2];
        //client pressed upgrade button
        let dummyTank = {};
        let realPlayer;
        let tanklocation;
        if (
          players.hasOwnProperty(client.id)
        ) {
          //NOTE: when upgrading, must specify ALL properties that can be changed because you must reset the properties from the previous tank
          //Note: width and height of barrel must be based on player width and height and not a specific number, because the player can upgrade at any level that they want
          //check if player in arena or dune
          playerUpgrade = players[client.id];
          tanklocation = gamemode;

          if (type == "tankButton") {
            //if client send this because he want information about how to draw tank on tank select button
            //create fake tank and upgrade that tank, then later send this fake tank to client
            dummyTank = {
              level: playerUpgrade.level,
              tankTypeLevel: playerUpgrade.tankTypeLevel,
              bodyTypeLevel: playerUpgrade.bodyTypeLevel,
              width: 25,
              height: 25,
              tankType: playerUpgrade.tankType,
              bodyType: playerUpgrade.bodyType,
              statMultiplier: [1, 1, 1, 1, 1, 1, 1, 1, 1],
              barrels: {},
              bodybarrels: {},
              assets: {},
            };
            realPlayer = playerUpgrade;
            playerUpgrade = dummyTank;
            tanklocation = "sanc"; //to allow eternal tanks to load
          }
          const a = playerUpgrade.statMultiplier[5];
          //const b = playerUpgrade.statMultiplier[4];
          const c = playerUpgrade.statMultiplier[4];
          const d = playerUpgrade.statMultiplier[3];
          //--WEAPON UPGRADES--

          if (type == "weaponUpgrade" || type == "tankButton") {
            //TIER 2
            if (playerUpgrade.level >= 1 && playerUpgrade.tankTypeLevel < 1) {
              //if change the level, remember to change the tankTypelevel below
              //if can uprgade to tier 2
              if (button == "button1") {
                //TWIN
                (playerUpgrade.barrels = {
                  barrelOne: {
                    barrelWidth: (playerUpgrade.width / 5) * 4,
                    barrelHeight: (playerUpgrade.height / 25) * 50,
                    additionalAngle: 0,
                    //x and y zero refers to barrel in middle, if it is negative, the barrel is towards the left of the tank
                    x: (-playerUpgrade.width / 5) * 3, //x is width divided by 5 time 3
                    barrelMoveIncrement: -0.6, //width divided by 5 time 3 is 0.6 width
                    barrelType: "bullet",
                    reloadRecover: 10 * playerUpgrade.statMultiplier[5], //lesser is more bullets
                    bulletHealth: 10,
                    bulletDamage: 0.16 * playerUpgrade.statMultiplier[4],
                    bulletPenetration: 2,
                    bulletTimer: 40, //max amount of time that bullet can move
                    bulletSpeed: 15 * playerUpgrade.statMultiplier[3], //this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, //reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 0, //this reload changes in amount when shooting
                    recoil: 0.3,
                  },
                  barrelTwo: {
                    barrelWidth: (playerUpgrade.width / 5) * 4,
                    barrelHeight: (playerUpgrade.height / 25) * 50,
                    additionalAngle: 0,
                    //x and y zero refers to barrel in middle, if it is negative, the barrel is towards the left of the tank
                    x: (playerUpgrade.width / 5) * 3,
                    barrelMoveIncrement: 0.6,
                    barrelType: "bullet",
                    reloadRecover: 10 * playerUpgrade.statMultiplier[5], //lesser is more bullets
                    bulletHealth: 10,
                    bulletDamage: 0.16 * playerUpgrade.statMultiplier[4],
                    bulletPenetration: 2,
                    bulletTimer: 40, //max amount of time that bullet can move
                    bulletSpeed: 15 * playerUpgrade.statMultiplier[3], //this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                    barrelHeightChange: 0, //reset barrel height change which changes when shooting
                    shootingState: "no",
                    reload: 5, //half of weapon reload so that it starts shooting later than first barrel
                    recoil: 0.3,
                  },
                }),
                  (playerUpgrade.tankType = "twin"),
                  (playerUpgrade.tankTypeLevel = 1), //the level that upgraded to the current tank
                  (playerUpgrade.fovMultiplier =
                    1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
              } else if (button == "button2") {
                //SNIPER
                (playerUpgrade.barrels = {
                  barrelOne: {
                    barrelWidth: (playerUpgrade.width / 25) * 30,
                    barrelHeight: (playerUpgrade.height / 25) * 60,
                    additionalAngle: 0,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 50 * playerUpgrade.statMultiplier[5],
                    bulletHealth: 10,
                    bulletDamage: 1.6 * playerUpgrade.statMultiplier[4],
                    bulletPenetration: 1,
                    bulletTimer: 45,
                    bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                    barrelHeightChange: 0,
                    shootingState: "no",
                    reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                    recoil: 1.25,
                  },
                }),
                  (playerUpgrade.tankType = "sniper"),
                  (playerUpgrade.tankTypeLevel = 1),
                  (playerUpgrade.fovMultiplier =
                    1.125 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
              } else if (button == "button3") {
                //CANNON
                (playerUpgrade.barrels = {
                  barrelOne: {
                    barrelWidth: (playerUpgrade.width / 25) * 35,
                    barrelHeight: (playerUpgrade.height / 25) * 45,
                    additionalAngle: 0,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 50 * playerUpgrade.statMultiplier[5],
                    bulletHealth: 20,
                    bulletDamage: 1.5 * playerUpgrade.statMultiplier[4],
                    bulletPenetration: 2,
                    bulletTimer: 50,
                    bulletSpeed: 9 * playerUpgrade.statMultiplier[3],
                    barrelHeightChange: 0,
                    shootingState: "no",
                    reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                    recoil: 4,
                  },
                }),
                  (playerUpgrade.tankType = "cannon"),
                  (playerUpgrade.tankTypeLevel = 1),
                  (playerUpgrade.fovMultiplier =
                    1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
              } else if (button == "button4") {
                //FLANK
                (playerUpgrade.barrels = {
                  barrelOne: {
                    barrelWidth: playerUpgrade.width,
                    barrelHeight: (playerUpgrade.height / 25) * 50,
                    additionalAngle: 0,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 15 * playerUpgrade.statMultiplier[5],
                    bulletHealth: 10,
                    bulletDamage: 0.5 * playerUpgrade.statMultiplier[4],
                    bulletPenetration: 2,
                    bulletTimer: 50,
                    bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                    barrelHeightChange: 0,
                    shootingState: "no",
                    reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                    recoil: 1,
                  },
                  barrelTwo: {
                    barrelWidth: playerUpgrade.width,
                    barrelHeight: (playerUpgrade.height / 25) * 35,
                    additionalAngle: 180,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 15 * playerUpgrade.statMultiplier[5],
                    bulletHealth: 10,
                    bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                    bulletPenetration: 2,
                    bulletTimer: 50,
                    bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                    barrelHeightChange: 0,
                    shootingState: "no",
                    reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                    recoil: 1,
                  },
                }),
                  (playerUpgrade.tankType = "flank"),
                  (playerUpgrade.tankTypeLevel = 1),
                  (playerUpgrade.fovMultiplier =
                    1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
              } else if (button == "button5") {
                //FORTRESS
                (playerUpgrade.barrels = {
                  barrelOne: {
                    barrelWidth: playerUpgrade.width * 0.75,
                    barrelHeight: (playerUpgrade.height / 25) * 50,
                    additionalAngle: 0,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "trap",
                    trapDistBeforeStop: 15,
                    reloadRecover: 25 * playerUpgrade.statMultiplier[5],
                    bulletHealth: 100,
                    bulletDamage: 0.32 * playerUpgrade.statMultiplier[4],
                    bulletPenetration: 2,
                    bulletTimer: 100,
                    bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                    barrelHeightChange: 0,
                    shootingState: "no",
                    reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                    recoil: 0.5,
                  },
                }),
                  (playerUpgrade.tankType = "fortress"),
                  (playerUpgrade.tankTypeLevel = 1),
                  (playerUpgrade.fovMultiplier =
                    1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
              } else if (button == "button6") {
                //GUARD
                (playerUpgrade.mousex = 0), //needed for calculating drone movement angle
                  (playerUpgrade.mousey = 0),
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "drone",
                      droneLimit: 5,
                      droneCount: 0, //changes when drones spawn and die
                      reloadRecover: 25 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 30,
                      bulletDamage: 0.15 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 1000,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.5,
                    },
                  }),
                  (playerUpgrade.tankType = "guard"),
                  (playerUpgrade.tankTypeLevel = 1),
                  (playerUpgrade.fovMultiplier =
                    1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level),
                  (playerUpgrade.dronesControlling = []);
              }
            }
            //TIER 3
            else if (
              playerUpgrade.level >= 5 &&
              playerUpgrade.tankTypeLevel < 5
            ) {
              //if change the level, remember to change the tankTypelevel below
              //if can upgrade to tier 3
              if (playerUpgrade.tankType == "twin") {
                //twin upgrades
                if (button == "button1") {
                  //GUNNER
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 0,
                      x: (-playerUpgrade.width / 5) * 4,
                      barrelMoveIncrement: -0.8,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 3, //reload delay
                      recoil: 0.05,
                    },
                    barrelTwo: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: (-playerUpgrade.width / 5) * 1.5,
                      barrelMoveIncrement: -0.3,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.05,
                    },
                    barrelThree: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: (playerUpgrade.width / 5) * 1.5,
                      barrelMoveIncrement: 0.3,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.05,
                    },
                    barrelFour: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 0,
                      x: (playerUpgrade.width / 5) * 4,
                      barrelMoveIncrement: 0.8,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 3, //reload delay
                      recoil: 0.05,
                    },
                  }),
                    (playerUpgrade.tankType = "gunner"),
                    (playerUpgrade.tankTypeLevel = 5),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                } else if (button == "button2") {
                  //QUAD
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.5 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 90,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.5 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 180,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.5 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelFour: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 270,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.5 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                  }),
                    (playerUpgrade.tankType = "quad"),
                    (playerUpgrade.tankTypeLevel = 5),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                } else if (button == "button3") {
                  //SPLIT
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width/2,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: -30,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.5,
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width/2,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 30,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.5,
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width/1.2,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.5,
                    },
                  }),
                    (playerUpgrade.tankType = "split"),
                    (playerUpgrade.tankTypeLevel = 5),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                } else if (button == "button4") {
                  //STREAM
                  //bullets grow bigger
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: playerUpgrade.height * 1.2,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 25 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 30,
                      bulletDamage: 0.8 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 2,
                      growth: "yes",
                    },
                  }),
                    (playerUpgrade.tankType = "stream"),
                    (playerUpgrade.tankTypeLevel = 5),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "sniper") {
                //sniper upgrades
                if (button == "button1") {
                  //TARGETER
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 5 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.3 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.3,
                    },
                  }),
                    (playerUpgrade.tankType = "targeter"),
                    (playerUpgrade.tankTypeLevel = 5),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                } else if (button == "button2") {
                  //MARKSMAN
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 70,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 50 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 30,
                      bulletDamage: 1.5 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 45,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.75,
                    },
                  }),
                    (playerUpgrade.tankType = "marksman"),
                    (playerUpgrade.tankTypeLevel = 5),
                    (playerUpgrade.fovMultiplier =
                      1.25 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "fortress") {
                //fortress upgrades
                if (button == "button1") {
                  //PALISADE
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 10,
                      reloadRecover: 25 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 100,
                      bulletDamage: 0.2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 100,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.5,
                    },
                  }),
                    (playerUpgrade.tankType = "palisade"),
                    (playerUpgrade.tankTypeLevel = 5),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                } else if (button == "button2") {
                  //MINELAYER
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 40,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "mine",
                      trapDistBeforeStop: 10,
                      reloadRecover: 50 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 150,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 100,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.5,
                      haveAI: "yes", //mine's barrel have AI
                      AIdetectRange: 450,
                      barrels: {
                        barrelOne: {
                          barrelWidth: playerUpgrade.width / 5, //playerUpgrade in this situation would refer to the trap from parent barrel
                          barrelHeight: playerUpgrade.height * 0.5,
                          additionalAngle: 0,
                          x: 0,
                          barrelMoveIncrement: 0,
                          barrelType: "bullet",
                          reloadRecover: 15 * playerUpgrade.statMultiplier[5],
                          bulletHealth: 20,
                          bulletDamage: 0.25 * playerUpgrade.statMultiplier[4],
                          bulletPenetration: 2,
                          bulletTimer: 30,
                          bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                          barrelHeightChange: 0,
                          shootingState: "no",
                          reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                          recoil: 0.5,
                        },
                      },
                    },
                  }),
                    (playerUpgrade.tankType = "minelayer"),
                    (playerUpgrade.tankTypeLevel = 5),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "cannon") {
                //cannon upgrades
                if (button == "button1") {
                  //SINGLE
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: (playerUpgrade.width / 2) * 3,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 50 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 50,
                      bulletDamage: 2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 9 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 5,
                    },
                  }),
                    (playerUpgrade.tankType = "single"),
                    (playerUpgrade.tankTypeLevel = 5),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "flank") {
                //flank upgrades
                if (button == "button1") {
                  //TRI-ANGLE
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.4 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.5,
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 150,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 210,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                  }),
                    (playerUpgrade.tankType = "tri-angle"),
                    (playerUpgrade.tankTypeLevel = 5),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "guard") {
                //guard upgrades
                if (button == "button1") {
                  //COMMANDER
                  (playerUpgrade.mousex = 0), //needed for calculating drone movement angle
                    (playerUpgrade.mousey = 0),
                    (playerUpgrade.barrels = {
                      barrelOne: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: (playerUpgrade.height / 25) * 50,
                        additionalAngle: 0,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 7,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 15 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 75,
                        bulletDamage: 0.15 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 1,
                      },
                    }),
                    (playerUpgrade.tankType = "commander"),
                    (playerUpgrade.tankTypeLevel = 5),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level),
                    (playerUpgrade.dronesControlling = []);
                }
                if (button == "button2") {
                  //PROTECTOR
                  (playerUpgrade.mousex = 0), //needed for calculating drone movement angle
                    (playerUpgrade.mousey = 0),
                    (playerUpgrade.barrels = {
                      barrelOne: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: (playerUpgrade.height / 25) * 37.5,
                        additionalAngle: -90,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 5,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 30 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 45,
                        bulletDamage: 0.135 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 1,
                      },
                      barrelTwo: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: (playerUpgrade.height / 25) * 37.5,
                        additionalAngle: 90,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 5,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 25 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 75,
                        bulletDamage: 0.135 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 1,
                      },
                    }),
                    (playerUpgrade.tankType = "protector"),
                    (playerUpgrade.tankTypeLevel = 5),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level),
                    (playerUpgrade.dronesControlling = []);
                }
              }
            } else if (
              playerUpgrade.level >= 20 &&
              playerUpgrade.tankTypeLevel < 20
            ) {
              //if can upgrade to tier 4
              if (playerUpgrade.tankType == "gunner") {
                //gunner upgrades
                if (button == "button1") {
                  //BLASTER
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: (-playerUpgrade.width / 5) * 3,
                      barrelMoveIncrement: -0.6,
                      barrelType: "bullet",
                      reloadRecover: 8 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 10,
                      bulletDamage: 0.35 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 4, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.16,
                    },
                    barrelTwo: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 8 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 10,
                      bulletDamage: 0.35 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.16,
                    },
                    barrelThree: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: (playerUpgrade.width / 5) * 3,
                      barrelMoveIncrement: 0.6,
                      barrelType: "bullet",
                      reloadRecover: 8 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 10,
                      bulletDamage: 0.35 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 4, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.16,
                    },
                  }),
                    (playerUpgrade.tankType = "blaster"),
                    (playerUpgrade.tankTypeLevel = 20),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                } else if (button == "button2") {
                  //RIMFIRE
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: (playerUpgrade.width / 5) * 3.5,
                      barrelHeight: (playerUpgrade.height / 25) * 45,
                      additionalAngle: -15,
                      x: (-playerUpgrade.width / 5) * 3,
                      barrelMoveIncrement: -0.6,
                      barrelType: "bullet",
                      reloadRecover: 20 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 25,
                      bulletDamage: 1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 25 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelTwo: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: (-playerUpgrade.width / 5) * 1.5,
                      barrelMoveIncrement: -0.3,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.2,
                    },
                    barrelThree: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: (playerUpgrade.width / 5) * 1.5,
                      barrelMoveIncrement: 0.3,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.2,
                    },
                    barrelFour: {
                      barrelWidth: (playerUpgrade.width / 5) * 3.5,
                      barrelHeight: (playerUpgrade.height / 25) * 45,
                      additionalAngle: 15,
                      x: (playerUpgrade.width / 5) * 3,
                      barrelMoveIncrement: 0.6,
                      barrelType: "bullet",
                      reloadRecover: 20 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 25,
                      bulletDamage: 1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 25 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                  }),
                    (playerUpgrade.tankType = "rimfire"),
                    (playerUpgrade.tankTypeLevel = 20),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                } else if (button == "button3") {
                  //MINESWEEPER
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 0,
                      x: (-playerUpgrade.width / 5) * 1.5,
                      barrelMoveIncrement: 0.3,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 30,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 5, //reload delay
                      recoil: 0.05,
                    },
                    barrelTwo: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 0,
                      x: (-playerUpgrade.width / 5) * -1.5,
                      barrelMoveIncrement: -0.3,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 30,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.05,
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width * 0.85,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 180,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 15,
                      reloadRecover: 25 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 100,
                      bulletDamage: 0.32 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 100,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.5,
                    },
                  }),
                    (playerUpgrade.tankType = "minesweeper"),
                    (playerUpgrade.tankTypeLevel = 20),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "single") {
                //single upgrades
                if (button == "button1") {
                  //DESTROYER
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width * 2,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 60 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 100,
                      bulletDamage: 2.5 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 8 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 7,
                    },
                  }),
                    (playerUpgrade.tankType = "destroyer"),
                    (playerUpgrade.tankTypeLevel = 20),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "targeter") {
                //targeter upgrades
                if (button == "button1") {
                  //STREAMLINER
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width * 0.8,
                      barrelHeight: playerUpgrade.height * 2.3,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 8 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.3,
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width * 0.8,
                      barrelHeight: playerUpgrade.height * 1.8,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 8 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 4, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.3,
                    },
                  }),
                    (playerUpgrade.tankType = "streamliner"),
                    (playerUpgrade.tankTypeLevel = 20),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "quad") {
                //quad upgrades
                if (button == "button1") {
                  //BLITZ
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 15 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.9 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 13 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 45,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 15 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.9 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 13 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 90,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 15 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.9 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 13 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelFour: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 135,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 15 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.9 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 13 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelFive: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 180,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 15 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.9 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 13 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelSix: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 225,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 15 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.9 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 13 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelSeven: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 270,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 15 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.9 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 13 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelEight: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 315,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 15 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.9 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 13 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                  }),
                    (playerUpgrade.tankType = "blitz"),
                    (playerUpgrade.tankTypeLevel = 20),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "tri-angle") {
                //tri-angle upgrades
                if (button == "button1") {
                  //BOOSTER
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 30,
                      bulletDamage: 0.45 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0,
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 135,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 3 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 5,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.2,
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 43,
                      additionalAngle: 155,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 3 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 5,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.4,
                    },
                    barrelFour: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 225,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 3 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 5,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.2,
                    },
                    barrelFive: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 43,
                      additionalAngle: 205,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 3 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 5,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.4,
                    },
                  }),
                    (playerUpgrade.tankType = "booster"),
                    (playerUpgrade.tankTypeLevel = 20),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                } else if (button == "button2") {
                  //FIGHTER
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 30,
                      bulletDamage: 0.45 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0,
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 36,
                      additionalAngle: 90,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 6.5 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 5,
                      bulletDamage: 0.3 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 2,
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width - 5,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 150,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 6 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 5,
                      bulletDamage: 0.15 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 2,
                    },
                    barrelFour: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 36,
                      additionalAngle: -90,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 6.5 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 5,
                      bulletDamage: 0.3 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 2,
                    },
                    barrelFive: {
                      barrelWidth: playerUpgrade.width - 5,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 210,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 6 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 5,
                      bulletDamage: 0.15 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 2,
                    },
                  }),
                    (playerUpgrade.tankType = "fighter"),
                    (playerUpgrade.tankTypeLevel = 20),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "marksman") {
                //marksman upgrades
                if (button == "button1") {
                  //DUEL
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 75,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 50 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 35,
                      bulletDamage: 2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                  }),
                    (playerUpgrade.tankType = "duel"),
                    (playerUpgrade.tankTypeLevel = 20),
                    (playerUpgrade.fovMultiplier =
                      1.375 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "split") {
                //split upgrades
                if (button == "button1") {
                  //TOWER
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 40,
                      additionalAngle: 40,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.18 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.06,
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 40,
                      additionalAngle: -40,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.18 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.06,
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 45,
                      additionalAngle: 20,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.18 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.06,
                    },
                    barrelFour: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 45,
                      additionalAngle: -20,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.18 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.06,
                    },
                    barrelFive: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.18 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.06,
                    },
                  }),
                    (playerUpgrade.tankType = "tower"),
                    (playerUpgrade.tankTypeLevel = 20),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "commander") {
                //commander upgrades
                if (button == "button1") {
                  //MANAGER
                  (playerUpgrade.mousex = 0),
                    (playerUpgrade.mousey = 0),
                    (playerUpgrade.barrels = {
                      barrelOne: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: playerUpgrade.height * 2,
                        additionalAngle: 0,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 10,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 75,
                        bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0.5,
                      },
                    }),
                    (playerUpgrade.tankType = "manager"),
                    (playerUpgrade.tankTypeLevel = 20),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level),
                    (playerUpgrade.dronesControlling = []);
                } else if (button == "button2") {
                  //EXECUTIVE
                  (playerUpgrade.mousex = 0),
                    (playerUpgrade.mousey = 0),
                    (playerUpgrade.barrels = {
                      barrelOne: {
                        barrelWidth: (playerUpgrade.width / 2) * 2.5,
                        barrelHeight: (playerUpgrade.height / 25) * 50,
                        additionalAngle: 0,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 3,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 35 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 150,
                        bulletDamage: 0.7 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 8 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0.5,
                      },
                    }),
                    (playerUpgrade.tankType = "executive"),
                    (playerUpgrade.tankTypeLevel = 20),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level),
                    (playerUpgrade.dronesControlling = []);
                } else if (button == "button3") {
                  //SPAWNER
                  (playerUpgrade.mousex = 0),
                    (playerUpgrade.mousey = 0),
                    (playerUpgrade.barrels = {
                      barrelOne: {
                        barrelWidth: playerUpgrade.width * 0.7,
                        barrelHeight: playerUpgrade.height * 2,
                        additionalAngle: 0,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "minion",
                        droneLimit: 5,
                        droneCount: 0, //changes when drones spawn and die
                        minDist: 300,//if minion too close to mouse, will move away
                        reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 100,
                        bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 8 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0.5,
                        barrels: {
                          barrelOne: {
                            barrelWidth: playerUpgrade.width / 2, //playerUpgrade in this situation would refer to the trap from parent barrel
                            barrelHeight: playerUpgrade.height * 0.7,
                            additionalAngle: 0,
                            x: 0,
                            barrelMoveIncrement: 0,
                            barrelType: "bullet",
                            reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                            bulletHealth: 20,
                            bulletDamage: 0.10 * playerUpgrade.statMultiplier[4],
                            bulletPenetration: 2,
                            bulletTimer: 30,
                            bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                            barrelHeightChange: 0,
                            shootingState: "no",
                            reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                            recoil: 0.5,
                          },
                        },
                      },
                    }),
                    (playerUpgrade.tankType = "spawner"),
                    (playerUpgrade.tankTypeLevel = 20),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level),
                    (playerUpgrade.dronesControlling = []);
                }
              } else if (playerUpgrade.tankType == "protector") {
                //commander upgrades
                if (button == "button1") {
                  //KING
                  (playerUpgrade.mousex = 0), //needed for calculating drone movement angle
                    (playerUpgrade.mousey = 0),
                    (playerUpgrade.barrels = {
                      barrelOne: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: (playerUpgrade.height / 25) * 37.5,
                        additionalAngle: 0,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 5,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 40 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 45,
                        bulletDamage: 0.135 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 1,
                      },
                      barrelTwo: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: (playerUpgrade.height / 25) * 37.5,
                        additionalAngle: -120,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 5,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 30 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 75,
                        bulletDamage: 0.135 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 1,
                      },
                      barrelThree: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: (playerUpgrade.height / 25) * 37.5,
                        additionalAngle: 120,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 5,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 30 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 75,
                        bulletDamage: 0.135 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 1,
                      },
                    }),
                    (playerUpgrade.tankType = "king"),
                    (playerUpgrade.tankTypeLevel = 20),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level),
                    (playerUpgrade.dronesControlling = []);
                }
              } else if (playerUpgrade.tankType == "palisade") {
                //palisade upgrades
                if (button == "button1") {
                  //BUILDER
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width * 1.25,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 15,
                      reloadRecover: 50 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 100,
                      bulletDamage: 1.2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 200,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1.5,
                    },
                  }),
                    (playerUpgrade.tankType = "builder"),
                    (playerUpgrade.tankTypeLevel = 20),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                } else if (button == "button2") {
                  //WARDEN
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width/2,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 10,
                      reloadRecover: 15 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 100,
                      bulletDamage: 0.4 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 100,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width/2,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 90,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 10,
                      reloadRecover: 15 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 100,
                      bulletDamage: 0.4 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 100,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width/2,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 180,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 10,
                      reloadRecover: 15 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 100,
                      bulletDamage: 0.4 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 100,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelFour: {
                      barrelWidth: playerUpgrade.width/2,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 270,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 10,
                      reloadRecover: 15 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 100,
                      bulletDamage: 0.4 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 100,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                  }),
                    (playerUpgrade.tankType = "warden"),
                    (playerUpgrade.tankTypeLevel = 20),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "minelayer") {
                if (button == "button1") {
                  //ENGINEER
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 45,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "mine",
                      trapDistBeforeStop: 10,
                      reloadRecover: 25 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 250,
                      bulletDamage: 0.5 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 100,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.5,
                      haveAI: "yes", //mine's barrel have AI
                      AIdetectRange: 450,
                      barrels: {
                        barrelOne: {
                          barrelWidth: playerUpgrade.width / 5, //playerUpgrade in this situation would refer to the trap from parent barrel
                          barrelHeight: playerUpgrade.height * 0.5,
                          additionalAngle: 0,
                          x: 0,
                          barrelMoveIncrement: 0,
                          barrelType: "bullet",
                          reloadRecover: 20 * playerUpgrade.statMultiplier[5],
                          bulletHealth: 20,
                          bulletDamage: 0.2 * playerUpgrade.statMultiplier[4],
                          bulletPenetration: 2,
                          bulletTimer: 30,
                          bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                          barrelHeightChange: 0,
                          shootingState: "no",
                          reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                          recoil: 0.5,
                        },
                      },
                    },
                  }),
                    (playerUpgrade.tankType = "engineer"),
                    (playerUpgrade.tankTypeLevel = 20),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "stream") {
                //stream upgrades
                if (button == "button1") {
                  //JET
                  //bullets grow bigger
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: playerUpgrade.height * 1.2,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.46 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 60,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.7,
                      growth: "yes",
                    },
                  }),
                    (playerUpgrade.tankType = "jet"),
                    (playerUpgrade.tankTypeLevel = 20),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              }
            } else if (
              playerUpgrade.level >= 45 &&
              playerUpgrade.tankTypeLevel < 45
            ) {
              //if can upgrade to tier 5
              if (playerUpgrade.tankType == "rimfire") {
                if (button == "button1") {
                  //CENTREFIRE
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: (playerUpgrade.width / 5) * 3.5,
                      barrelHeight: (playerUpgrade.height / 25) * 40,
                      additionalAngle: -10,
                      x: (-playerUpgrade.width / 5) * 3,
                      barrelMoveIncrement: -0.6,
                      barrelType: "bullet",
                      reloadRecover: 20 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.9 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 54,
                      bulletSpeed: 25 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelFour: {
                      barrelWidth: (playerUpgrade.width / 5) * 3.5,
                      barrelHeight: (playerUpgrade.height / 25) * 40,
                      additionalAngle: 10,
                      x: (playerUpgrade.width / 5) * 3,
                      barrelMoveIncrement: 0.6,
                      barrelType: "bullet",
                      reloadRecover: 17 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.9 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 54,
                      bulletSpeed: 25 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelTwo: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: (playerUpgrade.height / 25) * 45,
                      additionalAngle: 0,
                      x: (-playerUpgrade.width / 5) * 1.5,
                      barrelMoveIncrement: -0.3,
                      barrelType: "bullet",
                      reloadRecover: 9 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 54,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.2,
                    },
                    barrelThree: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: (playerUpgrade.height / 25) * 45,
                      additionalAngle: 0,
                      x: (playerUpgrade.width / 5) * 1.5,
                      barrelMoveIncrement: 0.3,
                      barrelType: "bullet",
                      reloadRecover: 9 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 54,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.2,
                    },
                    barrelFive: {
                      barrelWidth: (playerUpgrade.width / 5) * 2.5,
                      barrelHeight: (playerUpgrade.height / 25) * 55,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 20 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.3 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 54,
                      bulletSpeed: 27 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                  }),
                    (playerUpgrade.tankType = "centrefire"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                } else if (button == "button2") {
                  //MACROFIRE
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: (playerUpgrade.width / 5) * 3.5,
                      barrelHeight: (playerUpgrade.height / 25) * 45,
                      additionalAngle: -25,
                      x: (-playerUpgrade.width / 5) * 3,
                      barrelMoveIncrement: -0.6,
                      barrelType: "bullet",
                      reloadRecover: 50 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 17,
                      bulletSpeed: 35 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelTwo: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: (-playerUpgrade.width / 5) * 1.5,
                      barrelMoveIncrement: -0.3,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.2,
                    },
                    barrelThree: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: (playerUpgrade.width / 5) * 1.5,
                      barrelMoveIncrement: 0.3,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.2,
                    },
                    barrelFour: {
                      barrelWidth: (playerUpgrade.width / 5) * 3.5,
                      barrelHeight: (playerUpgrade.height / 25) * 45,
                      additionalAngle: 25,
                      x: (playerUpgrade.width / 5) * 3,
                      barrelMoveIncrement: 0.6,
                      barrelType: "bullet",
                      reloadRecover: 50 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 17,
                      bulletSpeed: 35 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                  }),
                    (playerUpgrade.tankType = "macrofire"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              }
              else if (playerUpgrade.tankType == "minesweeper") {
                if (button == "button1") {
                  //Battler
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: (playerUpgrade.width / 5) * 3.5,
                      barrelHeight: (playerUpgrade.height / 25) * 45,
                      additionalAngle: -15,
                      x: (-playerUpgrade.width / 5) * 3,
                      barrelMoveIncrement: -0.6,
                      barrelType: "bullet",
                      reloadRecover: 20 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 25,
                      bulletDamage: 1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 25 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelTwo: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: (-playerUpgrade.width / 5) * 1.5,
                      barrelMoveIncrement: -0.3,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.2,
                    },
                    barrelThree: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: (playerUpgrade.width / 5) * 1.5,
                      barrelMoveIncrement: 0.3,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.2,
                    },
                    barrelFour: {
                      barrelWidth: (playerUpgrade.width / 5) * 3.5,
                      barrelHeight: (playerUpgrade.height / 25) * 45,
                      additionalAngle: 15,
                      x: (playerUpgrade.width / 5) * 3,
                      barrelMoveIncrement: 0.6,
                      barrelType: "bullet",
                      reloadRecover: 20 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 25,
                      bulletDamage: 1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 25 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelFive: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 180,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 10,
                      reloadRecover: 25 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 100,
                      bulletDamage: 0.2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 100,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.5,
                    },
                  }),
                    (playerUpgrade.tankType = "battler"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                } else if (button == "button2") {
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 0,
                      x: (-playerUpgrade.width / 5) * 1.5,
                      barrelMoveIncrement: 0.3,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.15 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 5, //reload delay
                      recoil: 0.05,
                    },
                    barrelTwo: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 0,
                      x: (-playerUpgrade.width / 5) * -1.5,
                      barrelMoveIncrement: -0.3,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.15 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 2.5, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.05,
                    },
                    barrelThree: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: (playerUpgrade.height / 25) * 45,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.15 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.05,
                    },
                    barrelFour: {
                      barrelWidth: playerUpgrade.width * 0.85,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 180,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 15,
                      reloadRecover: 20 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 80,
                      bulletDamage: 0.32 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 75,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.5,
                    },
                    barrelFive: {
                      barrelWidth: playerUpgrade.width * 0.85,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 180,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 15,
                      reloadRecover: 20 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 80,
                      bulletDamage: 0.32 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 75,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 4, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.5,
                    },
                  }),
                    (playerUpgrade.tankType = "pinnace"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }

              } else if (playerUpgrade.tankType == "blitz") {
                //blitz upgrades
                if (button == "button1") {
                  //CYCLONE
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: (playerUpgrade.width / 3) * 2,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 14 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.76 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 35,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelTwo: {
                      barrelWidth: (playerUpgrade.width / 3) * 2,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 30,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 14 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.76 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 35,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelThree: {
                      barrelWidth: (playerUpgrade.width / 3) * 2,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 60,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 14 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.76 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 35,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelFour: {
                      barrelWidth: (playerUpgrade.width / 3) * 2,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 90,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 14 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.76 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 35,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelFive: {
                      barrelWidth: (playerUpgrade.width / 3) * 2,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 120,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 14 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.76 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 35,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelSix: {
                      barrelWidth: (playerUpgrade.width / 3) * 2,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 150,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 14 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.76 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 35,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelSeven: {
                      barrelWidth: (playerUpgrade.width / 3) * 2,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 180,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 14 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.76 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 35,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelEight: {
                      barrelWidth: (playerUpgrade.width / 3) * 2,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 210,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 14 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.76 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 35,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelNine: {
                      barrelWidth: (playerUpgrade.width / 3) * 2,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 240,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 14 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.76 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 35,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelTen: {
                      barrelWidth: (playerUpgrade.width / 3) * 2,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 270,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 14 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.76 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 35,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelEleven: {
                      barrelWidth: (playerUpgrade.width / 3) * 2,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 300,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 14 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.76 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 35,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelTwelve: {
                      barrelWidth: (playerUpgrade.width / 3) * 2,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 330,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 14 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.76 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 35,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                  }),
                    (playerUpgrade.tankType = "cyclone"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                } else if (button == "button2") {
                  //TORNADO
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: (playerUpgrade.width / 6) * 5,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 1 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.18 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 10,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelTwo: {
                      barrelWidth: (playerUpgrade.width / 6) * 5,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 36,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 1 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.15 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 10,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelThree: {
                      barrelWidth: (playerUpgrade.width / 6) * 5,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 72,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 1 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.15 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 10,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelFour: {
                      barrelWidth: (playerUpgrade.width / 6) * 5,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 108,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 1 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.15 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 10,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelFive: {
                      barrelWidth: (playerUpgrade.width / 6) * 5,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 144,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 1 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.15 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 10,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelSix: {
                      barrelWidth: (playerUpgrade.width / 6) * 5,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 180,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 1 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.15 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 10,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelSeven: {
                      barrelWidth: (playerUpgrade.width / 6) * 5,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 216,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 1 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.15 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 10,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelEight: {
                      barrelWidth: (playerUpgrade.width / 6) * 5,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 252,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 1 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.15 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 10,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelNine: {
                      barrelWidth: (playerUpgrade.width / 6) * 5,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 288,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 1 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.15 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 10,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelTen: {
                      barrelWidth: (playerUpgrade.width / 6) * 5,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 324,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 1 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.15 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 10,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                  }),
                    (playerUpgrade.tankType = "tornado"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "blaster") {
                //blaster upgrades
                if (button == "button1") {
                  //TETRA
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: (-playerUpgrade.width / 5) * 3,
                      barrelMoveIncrement: -0.6,
                      barrelType: "bullet",
                      reloadRecover: 4 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.225 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 25,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.05,
                    },
                    barrelTwo: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: -playerUpgrade.width / 5,
                      barrelMoveIncrement: -0.2,
                      barrelType: "bullet",
                      reloadRecover: 4 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.225 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 25,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 2, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.05,
                    },
                    barrelThree: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: playerUpgrade.width / 5,
                      barrelMoveIncrement: 0.2,
                      barrelType: "bullet",
                      reloadRecover: 4 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.225 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 25,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 2, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.05,
                    },
                    barrelFour: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: (playerUpgrade.width / 5) * 3,
                      barrelMoveIncrement: 0.6,
                      barrelType: "bullet",
                      reloadRecover: 4 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.225 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 25,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.05,
                    },
                  }),
                    (playerUpgrade.tankType = "tetra"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                } else if (button == "button2") {
                  //KNOCKBACK
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: (playerUpgrade.width / 5) * 4,
                      barrelHeight: playerUpgrade.height * 1.5,
                      additionalAngle: 0,
                      x: (-playerUpgrade.width / 5) * 3,
                      barrelMoveIncrement: -0.6,
                      barrelType: "bullet",
                      reloadRecover: 15 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 50,
                      bulletDamage: 0.6 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 25,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                      knockback: "yes",
                    },
                    barrelTwo: {
                      barrelWidth: (playerUpgrade.width / 5) * 4,
                      barrelHeight: playerUpgrade.height * 1.5,
                      additionalAngle: 0,
                      x: (playerUpgrade.width / 5) * 3,
                      barrelMoveIncrement: 0.6,
                      barrelType: "bullet",
                      reloadRecover: 15 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 50,
                      bulletDamage: 0.6 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 25,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 7.5, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                      knockback: "yes",
                    },
                  }),
                    (playerUpgrade.tankType = "knockback"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "streamliner") {
                //streamliner upgrades
                if (button == "button1") {
                  //CONQUERER
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width * 0.8,
                      barrelHeight: playerUpgrade.height * 2.5,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 8 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.3,
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width * 0.8,
                      barrelHeight: playerUpgrade.height * 2.25,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 8 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 2, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.3,
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width * 0.8,
                      barrelHeight: playerUpgrade.height * 2,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 8 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 4, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.3,
                    },
                    barrelFour: {
                      barrelWidth: playerUpgrade.width * 0.8,
                      barrelHeight: playerUpgrade.height * 1.75,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 8 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 6, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.3,
                    },
                  }),
                    (playerUpgrade.tankType = "conquerer"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                } else if (button == "button2") {
                  //ASSASSIN
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width / 2,
                      barrelHeight: playerUpgrade.height * 2,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 1 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 0.15 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 35,
                      bulletSpeed: 30 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.05,
                    },
                  }),
                    (playerUpgrade.tankType = "assassin"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "destroyer") {
                //destroyer upgrades
                if (button == "button1") {
                  //HEX (renamed from DEATH-STAR)
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width * 1.2,
                      barrelHeight: playerUpgrade.height * 2,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 50 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 40,
                      bulletDamage: 1.5 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 75,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width * 1.2,
                      barrelHeight: playerUpgrade.height * 2,
                      additionalAngle: 60,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 50 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 40,
                      bulletDamage: 1.5 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 75,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width * 1.2,
                      barrelHeight: playerUpgrade.height * 2,
                      additionalAngle: 120,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 50 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 40,
                      bulletDamage: 1.5 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 75,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelFour: {
                      barrelWidth: playerUpgrade.width * 1.2,
                      barrelHeight: playerUpgrade.height * 2,
                      additionalAngle: 180,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 50 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 40,
                      bulletDamage: 1.5 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 75,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelFive: {
                      barrelWidth: playerUpgrade.width * 1.2,
                      barrelHeight: playerUpgrade.height * 2,
                      additionalAngle: 240,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 50 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 40,
                      bulletDamage: 1.5 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 75,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelSix: {
                      barrelWidth: playerUpgrade.width * 1.2,
                      barrelHeight: playerUpgrade.height * 2,
                      additionalAngle: 300,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 50 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 40,
                      bulletDamage: 1.5 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 75,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                  }),
                    (playerUpgrade.tankType = "hex"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1.05 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                } else if (button == "button2") {
                  //HARBINGER
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width * 2,
                      barrelHeight: playerUpgrade.height * 2.5,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 80 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 150,
                      bulletDamage: 3 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 5,
                      bulletTimer: 75,
                      bulletSpeed: 8 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 15,
                    },
                  }),
                    (playerUpgrade.tankType = "harbinger"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "booster") {
                //booster upgrades
                if (button == "button1") {
                  //RIOT
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width * 1.1,
                      barrelHeight: playerUpgrade.height * 2,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 20,
                      bulletDamage: 1.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 25,
                      bulletSpeed: 19.5 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.2,
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: playerUpgrade.height * 1.9,
                      additionalAngle: 190,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 5 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 25,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.5,
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: playerUpgrade.height * 1.9,
                      additionalAngle: 170,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 5 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 25,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.5,
                    },
                    barrelFour: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: playerUpgrade.height * 2.05,
                      additionalAngle: 180,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 5 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 25,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.5,
                    },
                  }),
                    (playerUpgrade.tankType = "riot"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1.1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                } else if (button == "button2") {
                  //GUARDIAN
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width * 1.3,
                      barrelHeight: playerUpgrade.height * 2,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 5 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 25,
                      bulletDamage: 0.65 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 25,
                      bulletSpeed: 35 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.0001,
                    },
                    barrelTwo: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: playerUpgrade.height * 2,
                      additionalAngle: 195,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 10,
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 40,
                      bulletDamage: 0.13 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 45,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelThree: {
                      barrelWidth: (playerUpgrade.width / 5) * 2,
                      barrelHeight: playerUpgrade.height * 2,
                      additionalAngle: 165,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 10,
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 40,
                      bulletDamage: 0.13 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 45,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelFour: {
                      barrelWidth: playerUpgrade.width / 2,
                      barrelHeight: playerUpgrade.height * 2.2,
                      additionalAngle: 180,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 10,
                      reloadRecover: 2 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 30,
                      bulletDamage: 0.13 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 25,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.2,
                    },
                  }),
                    (playerUpgrade.tankType = "guardian"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1.05 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
                if (button == "button3") {
                  //COMET
                  (playerUpgrade.barrels = {
                    1: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 33.5,
                      additionalAngle: 245,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 3 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 10,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.2,
                    },
                    2: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 33.5,
                      additionalAngle: -245,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 3 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 5,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.2,
                    },
                    3: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 225,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 3 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 5,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.4,
                    },
                    4: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 43,
                      additionalAngle: 205,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 3 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 5,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.4,
                    },
                    5: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 135,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 3 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 5,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.6,
                    },
                    6: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 43,
                      additionalAngle: 155,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 3 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 5,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.6,
                    },
                    7: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 30,
                      bulletDamage: 0.3 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0,
                    },
                  }),
                    (playerUpgrade.tankType = "comet"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "fighter") {
                if (button == "button1") {
                  //SOLDIER
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 30,
                      bulletDamage: 0.5 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 36,
                      additionalAngle: 100,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 6.5 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 5,
                      bulletDamage: 0.3 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1.9,
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width - 5,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 145,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 6 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 5,
                      bulletDamage: 0.3 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1.9,
                    },
                    barrelFour: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 36,
                      additionalAngle: -100,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 6.5 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 5,
                      bulletDamage: 0.3 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1.9,
                    },
                    barrelFive: {
                      barrelWidth: playerUpgrade.width - 5,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: -145,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 6 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 5,
                      bulletDamage: 0.3 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 40,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1.9,
                    },
                    barrelSix: {
                      barrelWidth: playerUpgrade.width - 5,
                      barrelHeight: (playerUpgrade.height / 25) * 45,
                      additionalAngle: 180,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 10,
                      reloadRecover: 7 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 100,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1.1,
                    },
                  }),
                    (playerUpgrade.tankType = "soldier"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                } else if (button == "button2") {
                    //AMALGAM
                  (playerUpgrade.mousex = 0), //needed for calculating drone movement angle
                    (playerUpgrade.mousey = 0),
                    (playerUpgrade.barrels = {
                      barrelOne: {
                        barrelWidth: playerUpgrade.width/5*4.2,
                        barrelHeight: (playerUpgrade.height / 25) * 50,
                        additionalAngle: 0,
                        x: (-playerUpgrade.width / 5) * 2.5,
                        barrelMoveIncrement: -0.5,
                        barrelType: "bullet",
                        reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 30,
                        bulletDamage: 0.5 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 2,
                        bulletTimer: 40,
                        bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0.2,
                      },
                      barrelTwo: {
                        barrelWidth: playerUpgrade.width/5*4.2,
                        barrelHeight: (playerUpgrade.height / 25) * 50,
                        additionalAngle: 0,
                        x: (playerUpgrade.width / 5) * 2.5,
                        barrelMoveIncrement: 0.5,
                        barrelType: "bullet",
                        reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 5,
                        bulletDamage: 0.3 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 2,
                        bulletTimer: 40,
                        bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 5, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0.2,
                      },
                      barrelThree: {
                        barrelWidth: playerUpgrade.width/1.5,
                        barrelHeight: (playerUpgrade.height / 25) * 35,
                        additionalAngle: -20,
                        x: (-playerUpgrade.width / 5) * 2,
                        barrelMoveIncrement: -0.4,
                        barrelType: "trap",
                        trapDistBeforeStop: 10,
                        reloadRecover: 7 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 100,
                        bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 2,
                        bulletTimer: 75,
                        bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0.3,
                      },
                      barrelFour: {
                        barrelWidth: playerUpgrade.width/1.5,
                          barrelHeight: (playerUpgrade.height / 25) * 35,
                          additionalAngle: 20,
                          x: (playerUpgrade.width / 5) * 2,
                          barrelMoveIncrement: 0.4,
                          barrelType: "trap",
                          trapDistBeforeStop: 10,
                          reloadRecover: 7 * playerUpgrade.statMultiplier[5],
                          bulletHealth: 100,
                          bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                          bulletPenetration: 2,
                          bulletTimer: 75,
                          bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                          barrelHeightChange: 0,
                          shootingState: "no",
                          reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                          recoil: 0.3,
                      },
                      barrelFive: {
                        barrelWidth: playerUpgrade.width/2,
                          barrelHeight: (playerUpgrade.height / 25) * 40,
                          additionalAngle: 140,
                          x: 0,
                          barrelMoveIncrement: 0,
                          barrelType: "drone",
                          droneLimit: 7,
                          droneCount: 0, //changes when drones spawn and die
                          reloadRecover: 15 * playerUpgrade.statMultiplier[5],
                          bulletHealth: 75,
                          bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                          bulletPenetration: 2,
                          bulletTimer: 1000,
                          bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                          barrelHeightChange: 0,
                          shootingState: "no",
                          reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                          recoil: 0.2,
                      },
                      barrelSix: {
                        barrelWidth: playerUpgrade.width/2,
                          barrelHeight: (playerUpgrade.height / 25) * 40,
                          additionalAngle: 220,
                          x: 0,
                          barrelMoveIncrement: 0,
                          barrelType: "drone",
                          droneLimit: 7,
                          droneCount: 0, //changes when drones spawn and die
                          reloadRecover: 15 * playerUpgrade.statMultiplier[5],
                          bulletHealth: 75,
                          bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                          bulletPenetration: 2,
                          bulletTimer: 1000,
                          bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                          barrelHeightChange: 0,
                          shootingState: "no",
                          reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                          recoil: 0.2,
                      },
                    }),
                      (playerUpgrade.tankType = "amalgam"),
                      (playerUpgrade.tankTypeLevel = 45),
                      (playerUpgrade.fovMultiplier =
                        1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                  }
              } else if (playerUpgrade.tankType == "duel") {
                //duel upgrades
                if (button == "button1") {
                  //HUNTER
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: playerUpgrade.height * 3.2,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 50 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 35,
                      bulletDamage: 2.5 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 25 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                  }),
                    (playerUpgrade.tankType = "hunter"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1.5 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "tower") {
                //tower upgrades
                if (button == "button1") {
                  //STRONGHOLD
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 45,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * a,
                      bulletHealth: 20,
                      bulletDamage: 0.2 * c,
                      bulletPenetration: 2,
                      bulletTimer: 35,
                      bulletSpeed: 20 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.1,
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: -45,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * a,
                      bulletHealth: 20,
                      bulletDamage: 0.2 * c,
                      bulletPenetration: 2,
                      bulletTimer: 35,
                      bulletSpeed: 20 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.1,
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 40,
                      additionalAngle: 30,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * a,
                      bulletHealth: 20,
                      bulletDamage: 0.2 * c,
                      bulletPenetration: 2,
                      bulletTimer: 35,
                      bulletSpeed: 20 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.1,
                    },
                    barrelFour: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 40,
                      additionalAngle: -30,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * a,
                      bulletHealth: 20,
                      bulletDamage: 0.2 * c,
                      bulletPenetration: 2,
                      bulletTimer: 35,
                      bulletSpeed: 20 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.1,
                    },
                    barrelFive: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 45,
                      additionalAngle: 15,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * a,
                      bulletHealth: 20,
                      bulletDamage: 0.2 * c,
                      bulletPenetration: 2,
                      bulletTimer: 35,
                      bulletSpeed: 20 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.1,
                    },
                    barrelSix: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 45,
                      additionalAngle: -15,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * a,
                      bulletHealth: 20,
                      bulletDamage: 0.2 * c,
                      bulletPenetration: 2,
                      bulletTimer: 35,
                      bulletSpeed: 20 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.1,
                    },
                    barrelSeven: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * a,
                      bulletHealth: 20,
                      bulletDamage: 0.2 * c,
                      bulletPenetration: 2,
                      bulletTimer: 35,
                      bulletSpeed: 20 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.1,
                    },
                  }),
                    (playerUpgrade.tankType = "stronghold"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "manager") {
                //mnager upgrades
                if (button == "button1") {
                  //director
                  (playerUpgrade.mousex = 0),
                    (playerUpgrade.mousey = 0),
                    (playerUpgrade.barrels = {
                      barrelOne: {
                        barrelWidth: playerUpgrade.width * 1.7,
                        barrelHeight: (playerUpgrade.height / 25) * 50,
                        additionalAngle: 0,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 10,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 10 * a,
                        bulletHealth: 75,
                        bulletDamage: 0.12 * c,
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 10 * d,
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0.5,
                      },
                    }),
                    (playerUpgrade.tankType = "director"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level),
                    (playerUpgrade.dronesControlling = []);
                }
              } else if (playerUpgrade.tankType == "executive") {
                if (button == "button1") {
                  //CEO
                  (playerUpgrade.mousex = 0),
                    (playerUpgrade.mousey = 0),
                    (playerUpgrade.barrels = {
                      barrelOne: {
                        barrelWidth: playerUpgrade.width * 2,
                        barrelHeight: (playerUpgrade.height / 25) * 50,
                        additionalAngle: 0,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 3,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 50 * a,
                        bulletHealth: 200,
                        bulletDamage: 1 * c,
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 7 * d,
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0.5,
                      },
                    }),
                    (playerUpgrade.tankType = "ceo"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level),
                    (playerUpgrade.dronesControlling = []);
                }
              } else if (playerUpgrade.tankType == "spawner") {
                if (button == "button1") {
                  //FACTORY
                  (playerUpgrade.mousex = 0),
                    (playerUpgrade.mousey = 0),
                    (playerUpgrade.barrels = {
                      barrelOne: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: playerUpgrade.height * 2,
                        additionalAngle: 0,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "minion",
                        droneLimit: 5,
                        droneCount: 0, //changes when drones spawn and die
                        minDist: 300,//if minion too close to mouse, will move away
                        reloadRecover: 5 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 200,
                        bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 2,
                        bulletTimer: 3000,
                        bulletSpeed: 8 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0.5,
                        barrels: {
                          barrelOne: {
                            barrelWidth: playerUpgrade.width / 2, //playerUpgrade in this situation would refer to the trap from parent barrel
                            barrelHeight: playerUpgrade.height * 1,
                            additionalAngle: 0,
                            x: 0,
                            barrelMoveIncrement: 0,
                            barrelType: "bullet",
                            reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                            bulletHealth: 20,
                            bulletDamage: 0.3 * playerUpgrade.statMultiplier[4],
                            bulletPenetration: 2,
                            bulletTimer: 35,
                            bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                            barrelHeightChange: 0,
                            shootingState: "no",
                            reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                            recoil: 0.5,
                          },
                        },
                      },
                    }),
                    (playerUpgrade.tankType = "factory"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level),
                    (playerUpgrade.dronesControlling = []);
                }
              } else if (playerUpgrade.tankType == "king") {
                if (button == "button1") {
                  //MASTER
                  (playerUpgrade.mousex = 0), //needed for calculating drone movement angle
                    (playerUpgrade.mousey = 0),
                    (playerUpgrade.barrels = {
                      barrelOne: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: (playerUpgrade.height / 25) * 37.5,
                        additionalAngle: 0,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 5,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 45 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 65,
                        bulletDamage: 0.12 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 1,
                      },
                      barrelTwo: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: (playerUpgrade.height / 25) * 37.5,
                        additionalAngle: -90,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 5,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 30 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 65,
                        bulletDamage: 0.12 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 1,
                      },
                      barrelThree: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: (playerUpgrade.height / 25) * 37.5,
                        additionalAngle: 90,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 5,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 30 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 65,
                        bulletDamage: 0.12 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 1,
                      },
                      barrelFour: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: (playerUpgrade.height / 25) * 37.5,
                        additionalAngle: 180,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 5,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 30 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 65,
                        bulletDamage: 0.12 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 1,
                      },
                    }),
                    (playerUpgrade.tankType = "master"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level),
                    (playerUpgrade.dronesControlling = []);
                }
                else if (button == "button2") {
                  //TYRANT
                  (playerUpgrade.mousex = 0), //needed for calculating drone movement angle
                    (playerUpgrade.mousey = 0),
                    (playerUpgrade.barrels = {
                      barrelOne: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: (playerUpgrade.height / 25) * 37.5,
                        additionalAngle: 0,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 5,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 100 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 50,
                        bulletDamage: 0.135 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 1,
                      },
                      barrelTwo: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: (playerUpgrade.height / 25) * 37.5,
                        additionalAngle: -72,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 5,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 100 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 50,
                        bulletDamage: 0.135 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 1,
                      },
                      barrelThree: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: (playerUpgrade.height / 25) * 37.5,
                        additionalAngle: 72,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 5,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 100 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 50,
                        bulletDamage: 0.135 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 1,
                      },
                      barrelFour: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: (playerUpgrade.height / 25) * 37.5,
                        additionalAngle: -144,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 5,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 100 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 50,
                        bulletDamage: 0.135 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 1,
                      },
                      barrelFive: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: (playerUpgrade.height / 25) * 37.5,
                        additionalAngle: 144,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 5,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 100 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 50,
                        bulletDamage: 0.135 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 1,
                      },
                    }),
                    (playerUpgrade.tankType = "tyrant"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level),
                    (playerUpgrade.dronesControlling = []);
                }
              } else if (playerUpgrade.tankType == "builder") {
                //builder upgrades
                if (button == "button1") {
                  //ALPHA
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width * 1.5,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 15,
                      reloadRecover: 80 * a,
                      bulletHealth: 300,
                      bulletDamage: 3 * c,
                      bulletPenetration: 2,
                      bulletTimer: 200,
                      bulletSpeed: 20 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 3,
                    },
                  }),
                    (playerUpgrade.tankType = "alpha"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                } else if (button == "button2") {
                  //MECHANIC
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width / 2,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: playerUpgrade.width / 2,
                      barrelMoveIncrement: 0.5,
                      barrelType: "trap",
                      trapDistBeforeStop: 15,
                      reloadRecover: 40 * a,
                      bulletHealth: 35,
                      bulletDamage: 1.5 * c,
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 15 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.02,
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width / 2,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: -playerUpgrade.width / 2,
                      barrelMoveIncrement: -0.5,
                      barrelType: "trap",
                      trapDistBeforeStop: 15,
                      reloadRecover: 40 * a,
                      bulletHealth: 35,
                      bulletDamage: 0.54 * c,
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 15 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 1.5, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.02,
                    },
                  }),
                    (playerUpgrade.tankType = "mechanic"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                } else if (button == "button3") {
                  //CITADEL
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width * 0.6,
                      barrelHeight: playerUpgrade.height * 2.5,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 15,
                      reloadRecover: 15 * a,
                      bulletHealth: 50,
                      bulletDamage: 0.15 * c,
                      bulletPenetration: 2,
                      bulletTimer: 100,
                      bulletSpeed: 15 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.02,
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width * 0.6,
                      barrelHeight: playerUpgrade.height * 2,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 15,
                      reloadRecover: 15 * a,
                      bulletHealth: 50,
                      bulletDamage: 0.15 * c,
                      bulletPenetration: 2,
                      bulletTimer: 100,
                      bulletSpeed: 15 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 5, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.02,
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width * 0.6,
                      barrelHeight: playerUpgrade.height * 1.5,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 15,
                      reloadRecover: 15 * a,
                      bulletHealth: 50,
                      bulletDamage: 0.15 * c,
                      bulletPenetration: 2,
                      bulletTimer: 100,
                      bulletSpeed: 15 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 10, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.02,
                    },
                  }),
                    (playerUpgrade.tankType = "citadel"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "engineer") {
                if (button == "button1") {
                  //MACHINE
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "mine",
                      trapDistBeforeStop: 10,
                      reloadRecover: 25 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 300,
                      bulletDamage: 0.7 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 300,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.5,
                      haveAI: "yes", //mine's barrel have AI
                      AIdetectRange: 500,
                      barrels: {
                        barrelOne: {
                          barrelWidth: playerUpgrade.width / 5, //playerUpgrade in this situation would refer to the trap from parent barrel
                          barrelHeight: playerUpgrade.height * 0.5,
                          additionalAngle: 0,
                          x: 0,
                          barrelMoveIncrement: 0,
                          barrelType: "bullet",
                          reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                          bulletHealth: 20,
                          bulletDamage: 0.10 * playerUpgrade.statMultiplier[4],
                          bulletPenetration: 2,
                          bulletTimer: 30,
                          bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                          barrelHeightChange: 0,
                          shootingState: "no",
                          reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                          recoil: 0.5,
                        },
                      },
                    },
                  }),
                    (playerUpgrade.tankType = "machine"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                } else if (button == "button2") {
                  //MANUFACTURER
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width * 1.3,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "mine",
                      trapDistBeforeStop: 10,
                      reloadRecover: 80 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 900,
                      bulletDamage: 0.4 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 300,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 2,
                      haveAI: "yes", //mine's barrel have AI
                      AIdetectRange: 500,
                      barrels: {
                        barrelOne: {
                          barrelWidth: (playerUpgrade.width / 5) * 1.5, //playerUpgrade in this situation would refer to the trap from parent barrel
                          barrelHeight: playerUpgrade.height * 0.8,
                          additionalAngle: 0,
                          x: 0,
                          barrelMoveIncrement: 0,
                          barrelType: "bullet",
                          reloadRecover: 60 * playerUpgrade.statMultiplier[5],
                          bulletHealth: 20,
                          bulletDamage: 2 * playerUpgrade.statMultiplier[4],
                          bulletPenetration: 2,
                          bulletTimer: 30,
                          bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                          barrelHeightChange: 0,
                          shootingState: "no",
                          reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                          recoil: 0.5,
                        },
                      },
                    },
                  }),
                    (playerUpgrade.tankType = "manufacturer"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                } else if (button == "button3") {
                  //Detonator
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "mine",
                      trapDistBeforeStop: 10,
                      reloadRecover: 50 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 500,
                      bulletDamage: 0.5 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 2,
                      bulletTimer: 150,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.5,
                      haveAI: "no", //no need ai although it is a mine
                      AIdetectRange: 500,
                      barrels: {
                        barrelOne: {
                          barrelWidth: playerUpgrade.width / 2, //playerUpgrade in this situation would refer to the trap from parent barrel
                          barrelHeight: playerUpgrade.height * 0.5,
                          additionalAngle: 0,
                          x: 0,
                          barrelMoveIncrement: 0,
                          barrelType: "trap",
                          trapDistBeforeStop: 10,
                          reloadRecover: 0 * playerUpgrade.statMultiplier[5],
                          bulletHealth: 150,
                          bulletDamage: 2 * playerUpgrade.statMultiplier[4],
                          bulletPenetration: 2,
                          bulletTimer: 100,
                          bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                          barrelHeightChange: 0,
                          shootingState: "no",
                          reload: 148, //slightly lower than the lifespan of the mine trap
                          recoil: 0.5,
                        },
                        barrelTwo: {
                          barrelWidth: playerUpgrade.width / 2, //playerUpgrade in this situation would refer to the trap from parent barrel
                          barrelHeight: playerUpgrade.height * 0.5,
                          additionalAngle: 60,
                          x: 0,
                          barrelMoveIncrement: 0,
                          barrelType: "trap",
                          trapDistBeforeStop: 10,
                          reloadRecover: 0 * playerUpgrade.statMultiplier[5],
                          bulletHealth: 150,
                          bulletDamage: 2 * playerUpgrade.statMultiplier[4],
                          bulletPenetration: 2,
                          bulletTimer: 100,
                          bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                          barrelHeightChange: 0,
                          shootingState: "no",
                          reload: 148, //must be zero, for the weapon reload, change the reloadRecover property above
                          recoil: 0.5,
                        },
                        barrelThree: {
                          barrelWidth: playerUpgrade.width / 2, //playerUpgrade in this situation would refer to the trap from parent barrel
                          barrelHeight: playerUpgrade.height * 0.5,
                          additionalAngle: 120,
                          x: 0,
                          barrelMoveIncrement: 0,
                          barrelType: "trap",
                          trapDistBeforeStop: 10,
                          reloadRecover: 0 * playerUpgrade.statMultiplier[5],
                          bulletHealth: 150,
                          bulletDamage: 2 * playerUpgrade.statMultiplier[4],
                          bulletPenetration: 2,
                          bulletTimer: 100,
                          bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                          barrelHeightChange: 0,
                          shootingState: "no",
                          reload: 148, //must be zero, for the weapon reload, change the reloadRecover property above
                          recoil: 0.5,
                        },
                        barrelFour: {
                          barrelWidth: playerUpgrade.width / 2, //playerUpgrade in this situation would refer to the trap from parent barrel
                          barrelHeight: playerUpgrade.height * 0.5,
                          additionalAngle: 180,
                          x: 0,
                          barrelMoveIncrement: 0,
                          barrelType: "trap",
                          trapDistBeforeStop: 10,
                          reloadRecover: 0 * playerUpgrade.statMultiplier[5],
                          bulletHealth: 150,
                          bulletDamage: 2 * playerUpgrade.statMultiplier[4],
                          bulletPenetration: 2,
                          bulletTimer: 100,
                          bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                          barrelHeightChange: 0,
                          shootingState: "no",
                          reload: 148, //must be zero, for the weapon reload, change the reloadRecover property above
                          recoil: 0.5,
                        },
                        barrelFive: {
                          barrelWidth: playerUpgrade.width / 2, //playerUpgrade in this situation would refer to the trap from parent barrel
                          barrelHeight: playerUpgrade.height * 0.5,
                          additionalAngle: 240,
                          x: 0,
                          barrelMoveIncrement: 0,
                          barrelType: "trap",
                          trapDistBeforeStop: 10,
                          reloadRecover: 0 * playerUpgrade.statMultiplier[5],
                          bulletHealth: 150,
                          bulletDamage: 2 * playerUpgrade.statMultiplier[4],
                          bulletPenetration: 2,
                          bulletTimer: 100,
                          bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                          barrelHeightChange: 0,
                          shootingState: "no",
                          reload: 148, //must be zero, for the weapon reload, change the reloadRecover property above
                          recoil: 0.5,
                        },
                        barrelSix: {
                          barrelWidth: playerUpgrade.width / 2, //playerUpgrade in this situation would refer to the trap from parent barrel
                          barrelHeight: playerUpgrade.height * 0.5,
                          additionalAngle: 300,
                          x: 0,
                          barrelMoveIncrement: 0,
                          barrelType: "trap",
                          trapDistBeforeStop: 10,
                          reloadRecover: 0 * playerUpgrade.statMultiplier[5],
                          bulletHealth: 150,
                          bulletDamage: 2 * playerUpgrade.statMultiplier[4],
                          bulletPenetration: 2,
                          bulletTimer: 100,
                          bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                          barrelHeightChange: 0,
                          shootingState: "no",
                          reload: 148, //must be zero, for the weapon reload, change the reloadRecover property above
                          recoil: 0.5,
                        },
                        barrelSeven: {//VISUAL BARREL (DOES NOT SHOOT cuz of high reload value)
                          barrelWidth: playerUpgrade.width / 2,
                          barrelHeight: playerUpgrade.height * 0.5,
                          additionalAngle: 2.4,//Server shoots traps using this in degrees, but client draws in radians, so use radians for visual barrels
                          x: 0,
                          barrelMoveIncrement: 0,
                          barrelType: "trap",
                          trapDistBeforeStop: 10,
                          reloadRecover: 0 * playerUpgrade.statMultiplier[5],
                          bulletHealth: 150,
                          bulletDamage: 2 * playerUpgrade.statMultiplier[4],
                          bulletPenetration: 2,
                          bulletTimer: 100,
                          bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                          barrelHeightChange: 0,
                          shootingState: "no",
                          reload: 200,
                          recoil: 0.5,
                        },
                        barrelEight: {//VISUAL BARREL (DOES NOT SHOOT cuz of high reload value)
                          barrelWidth: playerUpgrade.width / 2,
                          barrelHeight: playerUpgrade.height * 0.5,
                          additionalAngle: -0.8,//Server shoots traps using this in degrees, but client draws in radians, so use radians for visual barrels
                          x: 0,
                          barrelMoveIncrement: 0,
                          barrelType: "trap",
                          trapDistBeforeStop: 10,
                          reloadRecover: 0 * playerUpgrade.statMultiplier[5],
                          bulletHealth: 150,
                          bulletDamage: 2 * playerUpgrade.statMultiplier[4],
                          bulletPenetration: 2,
                          bulletTimer: 100,
                          bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                          barrelHeightChange: 0,
                          shootingState: "no",
                          reload: 200,
                          recoil: 0.5,
                        },
                      },
                    },
                  }),
                    (playerUpgrade.tankType = "detonator"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "warden") {
                //warden upgrades
                if (button == "button1") {
                  //DEFENDER
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width * 0.5,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 10,
                      reloadRecover: 15 * a,
                      bulletHealth: 100,
                      bulletDamage: 0.6 * c,
                      bulletPenetration: 2,
                      bulletTimer: 100,
                      bulletSpeed: 15 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width * 0.5,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 60,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 10,
                      reloadRecover: 15 * a,
                      bulletHealth: 100,
                      bulletDamage: 0.6 * c,
                      bulletPenetration: 2,
                      bulletTimer: 100,
                      bulletSpeed: 15 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width * 0.5,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 120,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 10,
                      reloadRecover: 15 * a,
                      bulletHealth: 100,
                      bulletDamage: 0.6 * c,
                      bulletPenetration: 2,
                      bulletTimer: 100,
                      bulletSpeed: 15 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelFour: {
                      barrelWidth: playerUpgrade.width * 0.5,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 180,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 10,
                      reloadRecover: 15 * a,
                      bulletHealth: 100,
                      bulletDamage: 0.6 * c,
                      bulletPenetration: 2,
                      bulletTimer: 100,
                      bulletSpeed: 15 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelFive: {
                      barrelWidth: playerUpgrade.width * 0.5,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 240,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 10,
                      reloadRecover: 15 * a,
                      bulletHealth: 100,
                      bulletDamage: 0.6 * c,
                      bulletPenetration: 2,
                      bulletTimer: 100,
                      bulletSpeed: 15 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelSix: {
                      barrelWidth: playerUpgrade.width * 0.5,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 300,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 10,
                      reloadRecover: 15 * a,
                      bulletHealth: 100,
                      bulletDamage: 0.6 * c,
                      bulletPenetration: 2,
                      bulletTimer: 100,
                      bulletSpeed: 15 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                  }),
                    (playerUpgrade.tankType = "defender"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "jet") {
                //jet upgrades
                if (button == "button1") {
                  //FLAMETHROWER
                  //bullets grow bigger
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: playerUpgrade.height * 1.2,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 3 * a,
                      bulletHealth: 20,
                      bulletDamage: 0.4 * c,
                      bulletPenetration: 2,
                      bulletTimer: 35,
                      bulletSpeed: 25 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.5,
                      growth: "yes",
                    },
                  }),
                    (playerUpgrade.tankType = "flamethrower"),
                    (playerUpgrade.tankTypeLevel = 45),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              }
            } else if (
              playerUpgrade.level >= 100 &&
              playerUpgrade.tankTypeLevel < 100
            ) {
              if (
                playerUpgrade.tankType == "eternal" &&
                tanklocation == "sanc"
              ) {
                //if player is an eternal AND is in the sanctuary
                if (button == "button1") {
                  //HAILSTORM
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: playerUpgrade.height * 1.2,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 5 * a,
                      bulletHealth: 20,
                      bulletDamage: 0.7 * c,
                      bulletPenetration: 2,
                      bulletTimer: 25,
                      bulletSpeed: 20 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: playerUpgrade.height * 1.2,
                      additionalAngle: 120,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 5 * a,
                      bulletHealth: 20,
                      bulletDamage: 0.7 * c,
                      bulletPenetration: 2,
                      bulletTimer: 25,
                      bulletSpeed: 20 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelFive: {
                      barrelWidth: playerUpgrade.width,
                      barrelHeight: playerUpgrade.height * 1.2,
                      additionalAngle: 240,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 5 * a,
                      bulletHealth: 20,
                      bulletDamage: 0.7 * c,
                      bulletPenetration: 2,
                      bulletTimer: 25,
                      bulletSpeed: 20 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                  }),
                    (playerUpgrade.tankType = "hailstorm"),
                    (playerUpgrade.tankTypeLevel = 100),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                } else if (button == "button2") {
                  //BUNKER
                  (playerUpgrade.barrels = {
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width / 2,
                      barrelHeight: playerUpgrade.height * 1.5,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 10,
                      reloadRecover: 30 * a,
                      bulletHealth: 100,
                      bulletDamage: 0.33 * c,
                      bulletPenetration: 2,
                      bulletTimer: 150,
                      bulletSpeed: 15 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width / 2,
                      barrelHeight: playerUpgrade.height * 1.5,
                      additionalAngle: 120,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 10,
                      reloadRecover: 30 * a,
                      bulletHealth: 100,
                      bulletDamage: 0.33 * c,
                      bulletPenetration: 2,
                      bulletTimer: 150,
                      bulletSpeed: 15 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelFour: {
                      barrelWidth: playerUpgrade.width / 2,
                      barrelHeight: playerUpgrade.height * 1.5,
                      additionalAngle: 240,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 10,
                      reloadRecover: 30 * a,
                      bulletHealth: 100,
                      bulletDamage: 0.33 * c,
                      bulletPenetration: 2,
                      bulletTimer: 150,
                      bulletSpeed: 15 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                  }),
                    (playerUpgrade.tankType = "bunker"),
                    (playerUpgrade.tankTypeLevel = 100),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                } else if (button == "button3") {
                  //CHAOS
                  (playerUpgrade.mousex = 0),
                    (playerUpgrade.mousey = 0),
                    (playerUpgrade.barrels = {
                      barrelOne: {
                        barrelWidth: playerUpgrade.width / 1.5,
                        barrelHeight: playerUpgrade.height * 1.3,
                        additionalAngle: 90,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 3,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 10 * a,
                        bulletHealth: 50,
                        bulletDamage: 0.15 * c,
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 15 * d,
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0,
                      },
                      barrelTwo: {
                        barrelWidth: playerUpgrade.width / 1.5,
                        barrelHeight: playerUpgrade.height * 1.3,
                        additionalAngle: -90,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 3,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 10 * a,
                        bulletHealth: 50,
                        bulletDamage: 0.15 * c,
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 15 * d,
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0,
                      },
                    }),
                    (playerUpgrade.tankType = "chaos"),
                    (playerUpgrade.tankTypeLevel = 100),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level),
                    (playerUpgrade.dronesControlling = []);
                } else if (button == "button4") {
                  //BOMBSHELL
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width * 1.5,
                      barrelHeight: playerUpgrade.height * 1.2,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 70 * a,
                      bulletHealth: 100,
                      bulletDamage: 1.2 * c,
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 10 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width * 1.5,
                      barrelHeight: playerUpgrade.height * 1.2,
                      additionalAngle: 120,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 70 * a,
                      bulletHealth: 100,
                      bulletDamage: 1.2 * c,
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 10 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width * 1.5,
                      barrelHeight: playerUpgrade.height * 1.2,
                      additionalAngle: 240,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 70 * a,
                      bulletHealth: 100,
                      bulletDamage: 1.2 * c,
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 10 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                  }),
                    (playerUpgrade.tankType = "bombshell"),
                    (playerUpgrade.tankTypeLevel = 100),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                } else if (button == "button5") {
                  //warrior
                  (playerUpgrade.mousex = 0),
                    (playerUpgrade.mousey = 0),
                    (playerUpgrade.barrels = {
                      barrelEight: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: (playerUpgrade.height / 25) * 35,
                        additionalAngle: 0,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 5,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 15 * a,
                        bulletHealth: 120,
                        bulletDamage: 0.35 * c,
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 10 * d,
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0,
                      },
                      barrelOne: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: (playerUpgrade.height / 25) * 50,
                        additionalAngle: 0,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "bullet",
                        reloadRecover: 10 * a,
                        bulletHealth: 30,
                        bulletDamage: 0.6 * c,
                        bulletPenetration: 2,
                        bulletTimer: 40,
                        bulletSpeed: 25 * d,
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0,
                      },
                      barrelTwo: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: (playerUpgrade.height / 25) * 36,
                        additionalAngle: 120,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "bullet",
                        reloadRecover: 3.25 * a,
                        bulletHealth: 5,
                        bulletDamage: 0.1 * c,
                        bulletPenetration: 2,
                        bulletTimer: 40,
                        bulletSpeed: 10 * d,
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0.03,
                      },
                      barrelFour: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: (playerUpgrade.height / 25) * 36,
                        additionalAngle: -120,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "bullet",
                        reloadRecover: 3.25 * a,
                        bulletHealth: 5,
                        bulletDamage: 0.1 * c,
                        bulletPenetration: 2,
                        bulletTimer: 40,
                        bulletSpeed: 10 * d,
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0.03,
                      },
                      barrelSix: {
                        barrelWidth: playerUpgrade.width - 5,
                        barrelHeight: (playerUpgrade.height / 25) * 45,
                        additionalAngle: 180,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "trap",
                        trapDistBeforeStop: 10,
                        reloadRecover: 7 * a,
                        bulletHealth: 50,
                        bulletDamage: 0.2 * c,
                        bulletPenetration: 2,
                        bulletTimer: 50,
                        bulletSpeed: 10 * d,
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0.3,
                      },
                    }),
                    (playerUpgrade.tankType = "warrior"),
                    (playerUpgrade.tankTypeLevel = 100),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level),
                    (playerUpgrade.dronesControlling = []);
                }
              }
            } else if (
              playerUpgrade.level >= 111 &&
              playerUpgrade.tankTypeLevel < 111 &&
              tanklocation == "sanc"
            ) {
              //eternal tier 2
              if (playerUpgrade.tankType == "hailstorm") {
                if (button == "button1") {
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width / 1.1,
                      barrelHeight: playerUpgrade.height * 1.3,
                      additionalAngle: 180,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 5 * a,
                      bulletHealth: 15,
                      bulletDamage: 0.7 * c,
                      bulletPenetration: 1,
                      bulletTimer: 25,
                      bulletSpeed: 20 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width / 1.1,
                      barrelHeight: playerUpgrade.height * 1.3,
                      additionalAngle: 60,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 5 * a,
                      bulletHealth: 15,
                      bulletDamage: 0.7 * c,
                      bulletPenetration: 1,
                      bulletTimer: 25,
                      bulletSpeed: 20 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width / 1.1,
                      barrelHeight: playerUpgrade.height * 1.3,
                      additionalAngle: 120,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 5 * a,
                      bulletHealth: 15,
                      bulletDamage: 0.7 * c,
                      bulletPenetration: 1,
                      bulletTimer: 25,
                      bulletSpeed: 20 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },

                    barrelFour: {
                      barrelWidth: playerUpgrade.width / 1.1,
                      barrelHeight: playerUpgrade.height * 1.3,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 5 * a,
                      bulletHealth: 20,
                      bulletDamage: 0.7 * c,
                      bulletPenetration: 1,
                      bulletTimer: 25,
                      bulletSpeed: 20 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelFive: {
                      barrelWidth: playerUpgrade.width / 1.1,
                      barrelHeight: playerUpgrade.height * 1.3,
                      additionalAngle: 240,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 5 * a,
                      bulletHealth: 20,
                      bulletDamage: 0.7 * c,
                      bulletPenetration: 1,
                      bulletTimer: 25,
                      bulletSpeed: 20 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelSix: {
                      barrelWidth: playerUpgrade.width / 1.1,
                      barrelHeight: playerUpgrade.height * 1.3,
                      additionalAngle: 300,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 5 * a,
                      bulletHealth: 20,
                      bulletDamage: 0.7 * c,
                      bulletPenetration: 1,
                      bulletTimer: 25,
                      bulletSpeed: 20 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                  }),
                    (playerUpgrade.tankType = "thunderstorm"),
                    (playerUpgrade.tankTypeLevel = 111),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                } if (button == "button2") {
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width / 1.1,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 180,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * a,
                      bulletHealth: 15,
                      bulletDamage: 0.9 * c,
                      bulletPenetration: 1,
                      bulletTimer: 25,
                      bulletSpeed: 25 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width / 1.1,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 60,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * a,
                      bulletHealth: 15,
                      bulletDamage: 0.9 * c,
                      bulletPenetration: 1,
                      bulletTimer: 25,
                      bulletSpeed: 25 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width / 1.3,
                      barrelHeight: playerUpgrade.height * 1.3,
                      additionalAngle: 120,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 14 * a,
                      bulletHealth: 15,
                      bulletDamage: 1.2 * c,
                      bulletPenetration: 1,
                      bulletTimer: 25,
                      bulletSpeed: 20 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },

                    barrelFour: {
                      barrelWidth: playerUpgrade.width / 1.3,
                      barrelHeight: playerUpgrade.height * 1.3,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 14 * a,
                      bulletHealth: 20,
                      bulletDamage: 1.2 * c,
                      bulletPenetration: 1,
                      bulletTimer: 25,
                      bulletSpeed: 25 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelFive: {
                      barrelWidth: playerUpgrade.width / 1.3,
                      barrelHeight: playerUpgrade.height * 1.3,
                      additionalAngle: 240,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 14 * a,
                      bulletHealth: 20,
                      bulletDamage: 1.7 * c,
                      bulletPenetration: 1,
                      bulletTimer: 25,
                      bulletSpeed: 20 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelSix: {
                      barrelWidth: playerUpgrade.width / 1.1,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 300,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * a,
                      bulletHealth: 20,
                      bulletDamage: 0.9 * c,
                      bulletPenetration: 1,
                      bulletTimer: 25,
                      bulletSpeed: 25 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                  }),
                    (playerUpgrade.tankType = "cosmetic"),
                    (playerUpgrade.tankTypeLevel = 111),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "bunker") {
                if (button == "button1") {
                  //VAULT
                  (playerUpgrade.barrels = {
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width - 17,
                      barrelHeight: playerUpgrade.height * 1.2,
                      additionalAngle: 60,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 10,
                      reloadRecover: 20 * a,
                      bulletHealth: 15,
                      bulletDamage: 0.33 * c,
                      bulletPenetration: 1,
                      bulletTimer: 100,
                      bulletSpeed: 20 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width - 17,
                      barrelHeight: playerUpgrade.height * 1.2,
                      additionalAngle: 120,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 10,
                      reloadRecover: 20 * a,
                      bulletHealth: 15,
                      bulletDamage: 0.33 * c,
                      bulletPenetration: 1,
                      bulletTimer: 100,
                      bulletSpeed: 20 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelFour: {
                      barrelWidth: playerUpgrade.width - 17,
                      barrelHeight: playerUpgrade.height * 1.2,
                      additionalAngle: 180,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 10,
                      reloadRecover: 20 * a,
                      bulletHealth: 15,
                      bulletDamage: 0.33 * c,
                      bulletPenetration: 1,
                      bulletTimer: 100,
                      bulletSpeed: 20 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelFive: {
                      barrelWidth: playerUpgrade.width - 17,
                      barrelHeight: playerUpgrade.height * 1.2,
                      additionalAngle: 240,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 10,
                      reloadRecover: 20 * a,
                      bulletHealth: 15,
                      bulletDamage: 0.33 * c,
                      bulletPenetration: 1,
                      bulletTimer: 100,
                      bulletSpeed: 20 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelSix: {
                      barrelWidth: playerUpgrade.width - 17,
                      barrelHeight: playerUpgrade.height * 1.2,
                      additionalAngle: 300,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 10,
                      reloadRecover: 20 * a,
                      bulletHealth: 15,
                      bulletDamage: 0.33 * c,
                      bulletPenetration: 1,
                      bulletTimer: 100,
                      bulletSpeed: 20 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelOne: {
                      barrelWidth: playerUpgrade.width - 17,
                      barrelHeight: playerUpgrade.height * 1.2,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "trap",
                      trapDistBeforeStop: 10,
                      reloadRecover: 20 * a,
                      bulletHealth: 15,
                      bulletDamage: 0.33 * c,
                      bulletPenetration: 1,
                      bulletTimer: 100,
                      bulletSpeed: 20 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                  }),
                    (playerUpgrade.tankType = "vault"),
                    (playerUpgrade.tankTypeLevel = 111),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              } else if (playerUpgrade.tankType == "chaos") {
                if (button == "button1") {
                  //MAYHEM
                  (playerUpgrade.mousex = 0),
                    (playerUpgrade.mousey = 0),
                    (playerUpgrade.barrels = {
                      barrelOne: {
                        barrelWidth: playerUpgrade.width / 1.5,
                        barrelHeight: playerUpgrade.height * 1.3,
                        additionalAngle: 90,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 3,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 10 * a,
                        bulletHealth: 50,
                        bulletDamage: 0.08 * c,
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 15 * d,
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0,
                      },
                      barrelTwo: {
                        barrelWidth: playerUpgrade.width / 1.5,
                        barrelHeight: playerUpgrade.height * 1.3,
                        additionalAngle: -90,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 3,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 10 * a,
                        bulletHealth: 50,
                        bulletDamage: 0.08 * c,
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 15 * d,
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0,
                      },
                      barrelThree: {
                        barrelWidth: playerUpgrade.width / 1.5,
                        barrelHeight: playerUpgrade.height * 1.3,
                        additionalAngle: 0,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 3,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 10 * a,
                        bulletHealth: 50,
                        bulletDamage: 0.08 * c,
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 15 * d,
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0,
                      },
                      barrelFour: {
                        barrelWidth: playerUpgrade.width / 1.5,
                        barrelHeight: playerUpgrade.height * 1.3,
                        additionalAngle: 180,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 3,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 10 * a,
                        bulletHealth: 50,
                        bulletDamage: 0.08 * c,
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 15 * d,
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0,
                      },
                    }),
                    (playerUpgrade.tankType = "mayhem"),
                    (playerUpgrade.tankTypeLevel = 111),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level),
                    (playerUpgrade.dronesControlling = []);
                }
                else if (button == "button2") {
                  //INDUSTRY
                  (playerUpgrade.mousex = 0),
                    (playerUpgrade.mousey = 0),
                    (playerUpgrade.barrels = {
                      barrelOne: {
                        barrelWidth: playerUpgrade.width * 0.75,
                        barrelHeight: playerUpgrade.height * 1.5,
                        additionalAngle: 0,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "minion",
                        droneLimit: 2,
                        droneCount: 0, //changes when drones spawn and die
                        minDist: 300,//if minion too close to mouse, will move away
                        reloadRecover: 5 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 200,
                        bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 2,
                        bulletTimer: 3000,
                        bulletSpeed: 8 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0.5,
                        barrels: {
                          barrelOne: {
                            barrelWidth: playerUpgrade.width / 1.5, //playerUpgrade in this situation would refer to the trap from parent barrel
                            barrelHeight: playerUpgrade.height * 0.7,
                            additionalAngle: 0,
                            x: 0,
                            barrelMoveIncrement: 0,
                            barrelType: "bullet",
                            reloadRecover: 20 * playerUpgrade.statMultiplier[5],
                            bulletHealth: 20,
                            bulletDamage: 0.27 * playerUpgrade.statMultiplier[4],
                            bulletPenetration: 2,
                            bulletTimer: 35,
                            bulletSpeed: 25 * playerUpgrade.statMultiplier[3],
                            barrelHeightChange: 0,
                            shootingState: "no",
                            reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                            recoil: 0.5,
                          },
                        },
                      },
                      barrelTwo: {
                        barrelWidth: playerUpgrade.width * 0.75,
                        barrelHeight: playerUpgrade.height * 1.5,
                        additionalAngle: 120,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "minion",
                        droneLimit: 2,
                        droneCount: 0, //changes when drones spawn and die
                        minDist: 200,//if minion too close to mouse, will move away
                        reloadRecover: 5 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 200,
                        bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 2,
                        bulletTimer: 3000,
                        bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0.5,
                        barrels: {
                          barrelOne: {
                            barrelWidth: playerUpgrade.width / 1.5, //playerUpgrade in this situation would refer to the trap from parent barrel
                            barrelHeight: playerUpgrade.height * 0.7,
                            additionalAngle: 0,
                            x: 0,
                            barrelMoveIncrement: 0,
                            barrelType: "bullet",
                            reloadRecover: 20 * playerUpgrade.statMultiplier[5],
                            bulletHealth: 20,
                            bulletDamage: 0.27 * playerUpgrade.statMultiplier[4],
                            bulletPenetration: 2,
                            bulletTimer: 35,
                            bulletSpeed: 25 * playerUpgrade.statMultiplier[3],
                            barrelHeightChange: 0,
                            shootingState: "no",
                            reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                            recoil: 0.5,
                          },
                        },
                      },
                      barrelThree: {
                        barrelWidth: playerUpgrade.width * 0.75,
                        barrelHeight: playerUpgrade.height * 1.5,
                        additionalAngle: 240,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "minion",
                        droneLimit: 2,
                        droneCount: 0, //changes when drones spawn and die
                        minDist: 200,//if minion too close to mouse, will move away
                        reloadRecover: 5 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 200,
                        bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 2,
                        bulletTimer: 3000,
                        bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0.5,
                        barrels: {
                          barrelOne: {
                            barrelWidth: playerUpgrade.width / 1.5, //playerUpgrade in this situation would refer to the trap from parent barrel
                            barrelHeight: playerUpgrade.height * 0.7,
                            additionalAngle: 0,
                            x: 0,
                            barrelMoveIncrement: 0,
                            barrelType: "bullet",
                            reloadRecover: 20 * playerUpgrade.statMultiplier[5],
                            bulletHealth: 20,
                            bulletDamage: 0.27 * playerUpgrade.statMultiplier[4],
                            bulletPenetration: 2,
                            bulletTimer: 35,
                            bulletSpeed: 25 * playerUpgrade.statMultiplier[3],
                            barrelHeightChange: 0,
                            shootingState: "no",
                            reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                            recoil: 0.5,
                          },
                        },
                      },
                    }),
                    (playerUpgrade.tankType = "industry"),
                    (playerUpgrade.tankTypeLevel = 111),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level),
                    (playerUpgrade.dronesControlling = []);
                }
              } else if (playerUpgrade.tankType == "bombshell") {
                if (button == "button1") {
                  //DEMOLISHER
                  (playerUpgrade.barrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width * 1.5,
                      barrelHeight: playerUpgrade.height * 1.3,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 90 * a,
                      bulletHealth: 60,
                      bulletDamage: 1.7 * c,
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 10 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width * 1.5,
                      barrelHeight: playerUpgrade.height * 1.3,
                      additionalAngle: 60,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 90 * a,
                      bulletHealth: 60,
                      bulletDamage: 1.7 * c,
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 10 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width * 1.5,
                      barrelHeight: playerUpgrade.height * 1.3,
                      additionalAngle: 120,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 90 * a,
                      bulletHealth: 60,
                      bulletDamage: 1.7 * c,
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 10 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelFour: {
                      barrelWidth: playerUpgrade.width * 1.5,
                      barrelHeight: playerUpgrade.height * 1.3,
                      additionalAngle: 180,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 90 * a,
                      bulletHealth: 60,
                      bulletDamage: 1.7 * c,
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 10 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelFive: {
                      barrelWidth: playerUpgrade.width * 1.5,
                      barrelHeight: playerUpgrade.height * 1.3,
                      additionalAngle: 240,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 90 * a,
                      bulletHealth: 60,
                      bulletDamage: 1.7 * c,
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 10 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                    barrelSix: {
                      barrelWidth: playerUpgrade.width * 1.5,
                      barrelHeight: playerUpgrade.height * 1.3,
                      additionalAngle: 300,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 90 * a,
                      bulletHealth: 60,
                      bulletDamage: 1.7 * c,
                      bulletPenetration: 2,
                      bulletTimer: 50,
                      bulletSpeed: 10 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                    },
                  }),
                    (playerUpgrade.tankType = "demolisher"),
                    (playerUpgrade.tankTypeLevel = 111),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level);
                }
              }
              else if (playerUpgrade.tankType == "warrior") {
                if (button == "button1") {
                  //VETERAN
                  (playerUpgrade.mousex = 0),
                    (playerUpgrade.mousey = 0),
                    (playerUpgrade.barrels = {
                      barrelOne: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: (playerUpgrade.height / 25) * 35,
                        additionalAngle: 20,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 3,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 15 * a,
                        bulletHealth: 75,
                        bulletDamage: 0.6 * c,
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 8 * d,
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0,
                      },
                      barrelTwo: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: (playerUpgrade.height / 25) * 35,
                        additionalAngle: -20,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 3,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 15 * a,
                        bulletHealth: 75,
                        bulletDamage: 0.6 * c,
                        bulletPenetration: 2,
                        bulletTimer: 1000,
                        bulletSpeed: 8 * d,
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0,
                      },
                      barrelThree: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: (playerUpgrade.height / 25) * 50,
                        additionalAngle: 0,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "bullet",
                        reloadRecover: 10 * a,
                        bulletHealth: 30,
                        bulletDamage: 0.8 * c,
                        bulletPenetration: 2,
                        bulletTimer: 30,
                        bulletSpeed: 25 * d,
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0,
                      },
                      barrelFour: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: (playerUpgrade.height / 25) * 36,
                        additionalAngle: 110,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "bullet",
                        reloadRecover: 3.25 * a,
                        bulletHealth: 5,
                        bulletDamage: 0.4 * c,
                        bulletPenetration: 1,
                        bulletTimer: 40,
                        bulletSpeed: 10 * d,
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0.03,
                      },
                      barrelFive: {
                        barrelWidth: playerUpgrade.width - 5,
                        barrelHeight: (playerUpgrade.height / 25) * 35,
                        additionalAngle: 145,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "bullet",
                        reloadRecover: 3 * a,
                        bulletHealth: 5,
                        bulletDamage: 0.1 * c,
                        bulletPenetration: 1,
                        bulletTimer: 40,
                        bulletSpeed: 10 * d,
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0.3,
                      },
                      barrelSix: {
                        barrelWidth: playerUpgrade.width,
                        barrelHeight: (playerUpgrade.height / 25) * 36,
                        additionalAngle: -110,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "bullet",
                        reloadRecover: 3.25 * a,
                        bulletHealth: 5,
                        bulletDamage: 0.1 * c,
                        bulletPenetration: 1,
                        bulletTimer: 40,
                        bulletSpeed: 10 * d,
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0.03,
                      },
                      barrelSeven: {
                        barrelWidth: playerUpgrade.width - 5,
                        barrelHeight: (playerUpgrade.height / 25) * 35,
                        additionalAngle: -145,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "bullet",
                        reloadRecover: 3 * a,
                        bulletHealth: 5,
                        bulletDamage: 0.1 * c,
                        bulletPenetration: 1,
                        bulletTimer: 40,
                        bulletSpeed: 10 * d,
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0.3,
                      },
                      barrelEight: {
                        barrelWidth: playerUpgrade.width - 5,
                        barrelHeight: (playerUpgrade.height / 25) * 45,
                        additionalAngle: 180,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "trap",
                        trapDistBeforeStop: 10,
                        reloadRecover: 7 * a,
                        bulletHealth: 50,
                        bulletDamage: 0.2 * c,
                        bulletPenetration: 1,
                        bulletTimer: 50,
                        bulletSpeed: 10 * d,
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0.05,
                      },
                    }),
                    (playerUpgrade.tankType = "veteran"),
                    (playerUpgrade.tankTypeLevel = 111),
                    (playerUpgrade.fovMultiplier =
                      1 * playerUpgrade.statMultiplier[7] + fovincrease * playerUpgrade.level),
                    (playerUpgrade.dronesControlling = []);
                }
              }
            }

            if (type == "tankButton") {
              //send the information on how to draw tank on button
              var packet = JSON.stringify(["tankButton",
                playerUpgrade,
                button,
                realPlayer]);
              client.send(packet);
            }
          }
          if (type == "bodyUpgrade" || type == "tankButton") {
            if (playerUpgrade.level >= 1 && playerUpgrade.bodyTypeLevel < 1) {
              //if change the level, remember to change the bodyTypelevel below
              //if can uprgade to tier 2
              if (button == "button8") {
                //smasher
                playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                playerUpgrade.healthRegenSpeed =
                  0.2 * playerUpgrade.statMultiplier[0];
                playerUpgrade.healthRegenTime =
                  100 * playerUpgrade.statMultiplier[0];
                playerUpgrade.damage = 0.25 * playerUpgrade.statMultiplier[2];
                playerUpgrade.speed = 9 * playerUpgrade.statMultiplier[6];
                playerUpgrade.bodybarrels = {};
                playerUpgrade.assets = {
                  assetOne: {
                    type: "under",
                    sides: 6,
                    color: "#5F676C",
                    outline: "#41494E",
                    outlineThickness: 5,
                    size: 1.25, //in comparison to the player's width
                    angle: 0,
                    x: 0,
                    y: 0,
                  },
                };
                playerUpgrade.bodyType = "smasher";
                playerUpgrade.bodyTypeLevel = 1;
              } else if (button == "button9") {
                //raider
                //it have aura, which is a bullet that doesnt move
                playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                playerUpgrade.healthRegenSpeed =
                  0.2 * playerUpgrade.statMultiplier[0];
                playerUpgrade.healthRegenTime =
                  100 * playerUpgrade.statMultiplier[0];
                playerUpgrade.damage = 0.1 * playerUpgrade.statMultiplier[2];
                playerUpgrade.speed = 9 * playerUpgrade.statMultiplier[6];
                playerUpgrade.bodybarrels = {
                  barrelOne: {
                    barrelWidth: 0,
                    barrelHeight: 0,
                    additionalAngle: 0,
                    x: 0,
                    y: 0,
                    barrelMoveIncrementY: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "aura",
                    auraSize: 3,
                    auraColor: "rgba(255,0,0,.15)",
                    auraOutline: "rgba(255,0,0,.15)",
                    //old aura color
                    //auraColor: "rgba(255,0,0,.5)",
                    //auraOutline: "rgba(255, 105, 105)",
                    reloadRecover: 1 * playerUpgrade.statMultiplier[5],
                    bulletHealth: 1000,
                    bulletDamage: 0.15 * playerUpgrade.statMultiplier[4],
                    bulletPenetration: 0,
                    bulletTimer: 3,
                    bulletSpeed: 0,
                    barrelHeightChange: 0,
                    shootingState: "no",
                    reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                    recoil: 0,
                    shooting: "yes",
                  },
                };
                playerUpgrade.assets = {
                  assetOne: {
                    //grey aura base asset
                    type: "above",
                    sides: 0,
                    color: "rgb(153,153,151)",
                    outline: "rgb(122,124,123)",
                    outlineThickness: 5,
                    size: 0.5, //in comparison to the player's width
                    angle: 0,
                    x: 0,
                    y: 0,
                  },
                  assetTwo: {
                    //red aura base asset
                    type: "above",
                    sides: 0,
                    color: "rgb(253,118,118)",
                    outline: "rgb(222,88,88)",
                    outlineThickness: 5,
                    size: 0.3, //in comparison to the player's width
                    angle: 0,
                    x: 0,
                    y: 0,
                  },
                };
                playerUpgrade.thickestBarrel = "aura";
                playerUpgrade.bodyType = "raider";
                playerUpgrade.bodyTypeLevel = 1;
              } else if (button == "button10") {
                //wall
                playerUpgrade.maxhealth = 120 * playerUpgrade.statMultiplier[1];
                playerUpgrade.healthRegenSpeed =
                  0.2 * playerUpgrade.statMultiplier[0];
                playerUpgrade.healthRegenTime =
                  100 * playerUpgrade.statMultiplier[0];
                playerUpgrade.damage = 0.15 * playerUpgrade.statMultiplier[2];
                playerUpgrade.speed = 8 * playerUpgrade.statMultiplier[6];
                playerUpgrade.bodybarrels = {};
                playerUpgrade.assets = {
                  assetOne: {
                    type: "under",
                    sides: 0,
                    color: "#5F676C",
                    outline: "#41494E",
                    outlineThickness: 5,
                    size: 1.2, //in comparison to the player's width
                    angle: 0,
                    x: 0,
                    y: 0,
                  },
                };
                playerUpgrade.bodyType = "wall";
                playerUpgrade.bodyTypeLevel = 1;
              } else if (button == "button11") {
                //mono
                playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                playerUpgrade.healthRegenSpeed =
                  0.2 * playerUpgrade.statMultiplier[0];
                playerUpgrade.healthRegenTime =
                  100 * playerUpgrade.statMultiplier[0];
                playerUpgrade.damage = 0.1 * playerUpgrade.statMultiplier[2];
                playerUpgrade.speed = 9 * playerUpgrade.statMultiplier[6];
                playerUpgrade.turretBaseSize = 0.6; //for AI tanks only
                playerUpgrade.AIdetectRange = 350;
                playerUpgrade.bodybarrels = {
                  barrelOne: {
                    barrelWidth: playerUpgrade.width * 0.8,
                    barrelHeight: (playerUpgrade.height / 25) * 35,
                    additionalAngle: 0,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                    bulletHealth: 10,
                    bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                    bulletPenetration: 1,
                    bulletTimer: 50,
                    bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                    barrelHeightChange: 0,
                    shootingState: "no",
                    reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                    recoil: 0.5,
                    shooting: "yes",
                  },
                };
                playerUpgrade.assets = {};
                playerUpgrade.bodyType = "mono";
                playerUpgrade.bodyTypeLevel = 1;
              } else if (button == "button12") {
                //hangar
                playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                playerUpgrade.healthRegenSpeed =
                  0.2 * playerUpgrade.statMultiplier[0];
                playerUpgrade.healthRegenTime =
                  100 * playerUpgrade.statMultiplier[0];
                playerUpgrade.damage = 0.1 * playerUpgrade.statMultiplier[2];
                playerUpgrade.speed = 9 * playerUpgrade.statMultiplier[6];
                playerUpgrade.turretBaseSize = 0.6; //for AI tanks only
                playerUpgrade.AIdetectRange = 350;
                (playerUpgrade.AImousex = 0),
                  (playerUpgrade.AImousey = 0),
                  (playerUpgrade.bodybarrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width / 2,
                      barrelHeight: (playerUpgrade.height / 25) * 30,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "drone",
                      droneLimit: 5,
                      droneCount: 0, //changes when drones spawn and die
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 25,
                      bulletDamage: 0.04 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 1,
                      bulletTimer: 1000,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 1,
                      shooting: "yes",
                    },
                  });
                playerUpgrade.assets = {};
                playerUpgrade.bodyType = "hangar";
                playerUpgrade.bodyTypeLevel = 1;
                playerUpgrade.dronesControlling = [];
              } else if (button == "button13") {
                //propeller
                playerUpgrade.maxhealth = 80 * playerUpgrade.statMultiplier[1];
                playerUpgrade.healthRegenSpeed =
                  0.2 * playerUpgrade.statMultiplier[0];
                playerUpgrade.healthRegenTime =
                  100 * playerUpgrade.statMultiplier[0];
                playerUpgrade.damage = 0.15 * playerUpgrade.statMultiplier[2];
                playerUpgrade.speed = 10 * playerUpgrade.statMultiplier[6];
                playerUpgrade.bodybarrels = {};
                playerUpgrade.assets = {
                  assetOne: {
                    type: "above",
                    sides: 0,
                    color: "rgb(105, 104, 104)",
                    outline: "rgb(79, 78, 78)",
                    outlineThickness: 5,
                    size: 0.3, //in comparison to the player's width
                    angle: 0,
                    x: 0,
                    y: 0,
                  },
                };
                playerUpgrade.bodyType = "propeller";
                playerUpgrade.bodyTypeLevel = 1;
              }
            } else if (
              playerUpgrade.level >= 5 &&
              playerUpgrade.bodyTypeLevel < 5
            ) {
              //tier 3
              if (playerUpgrade.bodyType == "smasher") {
                if (button == "button8") {
                  //spike
                  playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.3 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.35 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 8 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {};
                  playerUpgrade.assets = {
                    assetOne: {
                      type: "under",
                      sides: 4,
                      color: "#5F676C",
                      outline: "#41494E",
                      outlineThickness: 5,
                      size: 1.5, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.bodyType = "spike";
                  playerUpgrade.bodyTypeLevel = 5;
                } else if (button == "button9") {
                  //armory
                  playerUpgrade.maxhealth = 110 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.3 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.25 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 8 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.turretBaseSize = 0.6; //for AI tanks only
                  playerUpgrade.AIdetectRange = 450;
                  playerUpgrade.bodybarrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width * 0.8,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 15 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 10,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 1,
                      bulletTimer: 50,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.2,
                      shooting: "yes",
                    },
                  };
                  playerUpgrade.assets = {
                    assetOne: {
                      type: "under",
                      sides: 6,
                      color: "#5F676C",
                      outline: "#41494E",
                      outlineThickness: 5,
                      size: 1.25, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.bodyType = "armory";
                  playerUpgrade.bodyTypeLevel = 5;
                }
              } else if (playerUpgrade.bodyType == "raider") {
                if (button == "button8") {
                  //forge
                  playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.3 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.2 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 8 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {
                    barrelOne: {
                      barrelWidth: 0,
                      barrelHeight: 0,
                      additionalAngle: 0,
                      x: 0,
                      y: 0,
                      barrelMoveIncrementY: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "aura",
                      auraSize: 4,
                      auraColor: "rgba(255,0,0,.15)",
                      auraOutline: "rgba(255,0,0,.15)",
                      reloadRecover: 1 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 1000,
                      bulletDamage: 0.2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 0,
                      bulletTimer: 3,
                      bulletSpeed: 0,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0,
                      shooting: "yes",
                    },
                  };
                  playerUpgrade.assets = {
                    assetOne: {
                      //grey aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgb(153,153,151)",
                      outline: "rgb(122,124,123)",
                      outlineThickness: 5,
                      size: 0.6, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                    assetTwo: {
                      //red aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgb(253,118,118)",
                      outline: "rgb(222,88,88)",
                      outlineThickness: 5,
                      size: 0.3, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.thickestBarrel = "aura";
                  playerUpgrade.bodyType = "forge";
                  playerUpgrade.bodyTypeLevel = 5;
                } else if (button == "button9") {
                  //hail
                  playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.3 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.2 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 8 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {
                    barrelOne: {
                      barrelWidth: 0,
                      barrelHeight: 0,
                      additionalAngle: 0,
                      x: 0,
                      y: 0,
                      barrelMoveIncrementY: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "aura",
                      auraSpecialty: "freeze",
                      auraSize: 4,
                      auraColor: "rgba(173,216,230,.3)",
                      auraOutline: "rgba(150, 208, 227,.5)",
                      reloadRecover: 1 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 1000,
                      bulletDamage: 0.15 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 0,
                      bulletTimer: 3,
                      bulletSpeed: 0,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0,
                      shooting: "yes",
                    },
                  };
                  playerUpgrade.assets = {
                    assetOne: {
                      //grey aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgb(105, 104, 104)",
                      outline: "rgb(79, 78, 78)",
                      outlineThickness: 5,
                      size: 0.65, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                    assetTwo: {
                      //red aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgba(150, 208, 227)",
                      outline: "rgba(132, 190, 209)",
                      outlineThickness: 5,
                      size: 0.3, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.thickestBarrel = "aura";
                  playerUpgrade.bodyType = "hail";
                  playerUpgrade.bodyTypeLevel = 5;
                } else if (button == "button10") {
                  //mender
                  playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.3 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.2 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 8 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {
                    barrelOne: {
                      barrelWidth: 0,
                      barrelHeight: 0,
                      additionalAngle: 0,
                      x: 0,
                      y: 0,
                      barrelMoveIncrementY: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "aura",
                      auraSpecialty: "heal",
                      auraSize: 4,
                      auraColor: "rgba(56,183,100,.15)",
                      auraOutline: "rgba(26,153,70,.15)",
                      reloadRecover: 1 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 1000,
                      bulletDamage: 0 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 0,
                      bulletTimer: 3,
                      bulletSpeed: 0,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0,
                      shooting: "yes",
                    },
                  };
                  playerUpgrade.assets = {
                    assetOne: {
                      //grey aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgb(153,153,151)",
                      outline: "rgb(122,124,123)",
                      outlineThickness: 5,
                      size: 0.65, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                    assetTwo: {
                      //red aura base asset
                      type: "above",
                      sides: 8,
                      color: "rgba(56,183,100)",
                      outline: "rgba(26,153,70)",
                      outlineThickness: 5,
                      size: 0.3, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.thickestBarrel = "aura";
                  playerUpgrade.bodyType = "mender";
                  playerUpgrade.bodyTypeLevel = 5;
                }
              } else if (playerUpgrade.bodyType == "wall") {
                if (button == "button8") {
                  //castle
                  playerUpgrade.maxhealth = 180 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.3 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.2 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 7 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {};
                  playerUpgrade.assets = {
                    assetOne: {
                      type: "under",
                      sides: 0,
                      color: "#5F676C",
                      outline: "#41494E",
                      outlineThickness: 5,
                      size: 1.3, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.bodyType = "castle";
                  playerUpgrade.bodyTypeLevel = 5;
                }
              } else if (playerUpgrade.bodyType == "mono") {
                if (button == "button8") {
                  //sentry
                  playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.3 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.2 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 8 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.turretBaseSize = 0.7; //for AI tanks only
                  playerUpgrade.AIdetectRange = 450;
                  playerUpgrade.bodybarrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width * 0.8,
                      barrelHeight: (playerUpgrade.height / 25) * 40,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 15 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.33 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 1,
                      bulletTimer: 50,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.5,
                      shooting: "yes",
                    },
                  };
                  playerUpgrade.assets = {};
                  playerUpgrade.bodyType = "sentry";
                  playerUpgrade.bodyTypeLevel = 5;
                } else if (button == "button9") {
                  //turret
                  playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.3 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.2 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 8 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.turretBaseSize = 0.7; //for AI tanks only
                  playerUpgrade.AIdetectRange = 450;
                  playerUpgrade.bodybarrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width * 0.6,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 0,
                      x: -playerUpgrade.width * 0.4,
                      barrelMoveIncrement: -0.4,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 10,
                      bulletDamage: 0.08 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 1,
                      bulletTimer: 50,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.25,
                      shooting: "yes",
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width * 0.6,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 0,
                      x: playerUpgrade.width * 0.4,
                      barrelMoveIncrement: 0.4,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 10,
                      bulletDamage: 0.08 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 1,
                      bulletTimer: 50,
                      bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 5, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.25,
                      shooting: "yes",
                    },
                  };
                  playerUpgrade.assets = {};
                  playerUpgrade.bodyType = "turret";
                  playerUpgrade.bodyTypeLevel = 5;
                }
              } else if (playerUpgrade.bodyType == "hangar") {
                if (button == "button8") {
                  //warship
                  playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.3 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.2 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 8 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.turretBaseSize = 0.6; //for AI tanks only
                  playerUpgrade.AIdetectRange = 450;
                  (playerUpgrade.AImousex = 0),
                    (playerUpgrade.AImousey = 0),
                    (playerUpgrade.bodybarrels = {
                      barrelOne: {
                        barrelWidth: playerUpgrade.width * 0.75,
                        barrelHeight: (playerUpgrade.height / 25) * 40,
                        additionalAngle: 0,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 5,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 50,
                        bulletDamage: 0.04 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 1,
                        bulletTimer: 1000,
                        bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 1,
                        shooting: "yes",
                      },
                    });
                  playerUpgrade.assets = {};
                  playerUpgrade.bodyType = "warship";
                  playerUpgrade.bodyTypeLevel = 5;
                  playerUpgrade.dronesControlling = [];
                }
              } else if (playerUpgrade.bodyType == "propeller") {
                if (button == "button8") {
                  //thruster
                  playerUpgrade.maxhealth = 80 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.3 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.25 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 10.5 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {};
                  playerUpgrade.assets = {
                    assetOne: {
                      type: "above",
                      sides: 0,
                      color: "rgb(105, 104, 104)",
                      outline: "rgb(79, 78, 78)",
                      outlineThickness: 5,
                      size: 0.4, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.bodyType = "thruster";
                  playerUpgrade.bodyTypeLevel = 5;
                }
              }
            } else if (
              playerUpgrade.level >= 20 &&
              playerUpgrade.bodyTypeLevel < 20
            ) {
              //tier 4
              if (playerUpgrade.bodyType == "spike") {
                if (button == "button8") {
                  //thorn
                  playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.4 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.45 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 7 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {};
                  playerUpgrade.assets = {
                    assetOne: {
                      type: "under",
                      sides: 5,
                      color: "#5F676C",
                      outline: "#41494E",
                      outlineThickness: 5,
                      size: 1.5, //in comparison to the player's width
                      angle: 17.5,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.bodyType = "thorn";
                  playerUpgrade.bodyTypeLevel = 20;
                }
              } else if (playerUpgrade.bodyType == "armory") {
                if (button == "button8") {
                  //brigade
                  playerUpgrade.maxhealth = 130 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.4 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.3 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 7 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.turretBaseSize = 0.7; //for AI tanks only
                  playerUpgrade.AIdetectRange = 500;
                  playerUpgrade.bodybarrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width * 0.8,
                      barrelHeight: playerUpgrade.height * 1.6,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 15 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.35 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 1,
                      bulletTimer: 50,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.3,
                      shooting: "yes",
                    },
                  };
                  playerUpgrade.assets = {
                    assetOne: {
                      type: "under",
                      sides: 4,
                      color: "#5F676C",
                      outline: "#41494E",
                      outlineThickness: 5,
                      size: 1.5, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.bodyType = "brigade";
                  playerUpgrade.bodyTypeLevel = 20;
                }
              } else if (playerUpgrade.bodyType == "forge") {
                if (button == "button8") {
                  //foundry
                  playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.4 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.25 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 7 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {
                    barrelOne: {
                      barrelWidth: 0,
                      barrelHeight: 0,
                      additionalAngle: 0,
                      x: 0,
                      y: 0,
                      barrelMoveIncrementY: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "aura",
                      auraSize: 5,
                      auraColor: "rgba(255,0,0,.15)",
                      auraOutline: "rgba(255,0,0,.15)",
                      reloadRecover: 1 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 1000,
                      bulletDamage: 0.25 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 0,
                      bulletTimer: 3,
                      bulletSpeed: 0,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0,
                      shooting: "yes",
                    },
                  };
                  playerUpgrade.assets = {
                    assetOne: {
                      //grey aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgb(153,153,151)",
                      outline: "rgb(122,124,123)",
                      outlineThickness: 5,
                      size: 0.65, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                    assetTwo: {
                      //red aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgb(253,118,118)",
                      outline: "rgb(222,88,88)",
                      outlineThickness: 5,
                      size: 0.3, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.thickestBarrel = "aura";
                  playerUpgrade.bodyType = "foundry";
                  playerUpgrade.bodyTypeLevel = 20;
                }
              } else if (playerUpgrade.bodyType == "mender") {
                if (button == "button8") {
                  //remedy
                  playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.4 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.25 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 7 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {
                    barrelOne: {
                      barrelWidth: 0,
                      barrelHeight: 0,
                      additionalAngle: 0,
                      x: 0,
                      y: 0,
                      barrelMoveIncrementY: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "aura",
                      auraSpecialty: "heal",
                      auraSize: 5,
                      auraColor: "rgba(56,183,100,.15)",
                      auraOutline: "rgba(26,153,70,.15)",
                      reloadRecover: 1 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 1000,
                      bulletDamage: 0 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 0,
                      bulletTimer: 3,
                      bulletSpeed: 0,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0,
                      shooting: "yes",
                    },
                  };
                  playerUpgrade.assets = {
                    assetOne: {
                      //grey aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgb(153,153,151)",
                      outline: "rgb(122,124,123)",
                      outlineThickness: 5,
                      size: 0.65, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                    assetTwo: {
                      //red aura base asset
                      type: "above",
                      sides: 8,
                      color: "rgba(56,183,100)",
                      outline: "rgba(26,153,70)",
                      outlineThickness: 5,
                      size: 0.3, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.thickestBarrel = "aura";
                  playerUpgrade.bodyType = "remedy";
                  playerUpgrade.bodyTypeLevel = 20;
                }
              } else if (playerUpgrade.bodyType == "hail") {
                if (button == "button8") {
                  //blizzard
                  playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.4 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.25 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 7 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {
                    barrelOne: {
                      barrelWidth: 0,
                      barrelHeight: 0,
                      additionalAngle: 0,
                      x: 0,
                      y: 0,
                      barrelMoveIncrementY: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "aura",
                      auraSpecialty: "freeze",
                      auraSize: 5,
                      auraColor: "rgba(173,216,230,.3)",
                      auraOutline: "rgba(150, 208, 227,.5)",
                      reloadRecover: 1 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 1000,
                      bulletDamage: 0.2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 0,
                      bulletTimer: 3,
                      bulletSpeed: 0,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0,
                      shooting: "yes",
                    },
                  };
                  playerUpgrade.assets = {
                    assetOne: {
                      //grey aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgb(105, 104, 104)",
                      outline: "rgb(79, 78, 78)",
                      outlineThickness: 5,
                      size: 0.65, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                    assetTwo: {
                      //red aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgba(150, 208, 227)",
                      outline: "rgba(132, 190, 209)",
                      outlineThickness: 5,
                      size: 0.3, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.thickestBarrel = "aura";
                  playerUpgrade.bodyType = "blizzard";
                  playerUpgrade.bodyTypeLevel = 20;
                }
              } else if (playerUpgrade.bodyType == "castle") {
                if (button == "button8") {
                  //palace
                  playerUpgrade.maxhealth = 240 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.8 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.25 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 6 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {};
                  playerUpgrade.assets = {
                    assetOne: {
                      type: "under",
                      sides: 0,
                      color: "#5F676C",
                      outline: "#41494E",
                      outlineThickness: 5,
                      size: 1.4, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.bodyType = "palace";
                  playerUpgrade.bodyTypeLevel = 20;
                }
              } else if (playerUpgrade.bodyType == "sentry") {
                if (button == "button8") {
                  //bastion
                  playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.4 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.25 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 7 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.turretBaseSize = 0.7; //for AI tanks only
                  playerUpgrade.AIdetectRange = 550;
                  playerUpgrade.bodybarrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width * 0.9,
                      barrelHeight: (playerUpgrade.height / 25) * 45,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 20 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 1,
                      bulletTimer: 50,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.75,
                      shooting: "yes",
                    },
                  };
                  playerUpgrade.assets = {};
                  playerUpgrade.bodyType = "bastion";
                  playerUpgrade.bodyTypeLevel = 20;
                }
              } else if (playerUpgrade.bodyType == "turret") {
                if (button == "button8") {
                  //triplet
                  playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.4 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.25 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 7 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.turretBaseSize = 0.7; //for AI tanks only
                  playerUpgrade.AIdetectRange = 550;
                  playerUpgrade.bodybarrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width * 0.4,
                      barrelHeight: (playerUpgrade.height / 25) * 30,
                      additionalAngle: 0,
                      x: -playerUpgrade.width * 0.4,
                      barrelMoveIncrement: -0.4,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 10,
                      bulletDamage: 0.08 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 1,
                      bulletTimer: 50,
                      bulletSpeed: 13 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.25,
                      shooting: "yes",
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width * 0.4,
                      barrelHeight: (playerUpgrade.height / 25) * 30,
                      additionalAngle: 0,
                      x: playerUpgrade.width * 0.4,
                      barrelMoveIncrement: 0.4,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 10,
                      bulletDamage: 0.08 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 1,
                      bulletTimer: 50,
                      bulletSpeed: 13 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 5, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.25,
                      shooting: "yes",
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width * 0.6,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 10,
                      bulletDamage: 0.08 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 1,
                      bulletTimer: 50,
                      bulletSpeed: 13 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 5, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.25,
                      shooting: "yes",
                    },
                  };
                  playerUpgrade.assets = {};
                  playerUpgrade.bodyType = "triplet";
                  playerUpgrade.bodyTypeLevel = 20;
                }
              } else if (playerUpgrade.bodyType == "warship") {
                if (button == "button8") {
                  //battleship
                  playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.4 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.25 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 7 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.turretBaseSize = 0.7; //for AI tanks only
                  playerUpgrade.AIdetectRange = 550;
                  (playerUpgrade.AImousex = 0),
                    (playerUpgrade.AImousey = 0),
                    (playerUpgrade.bodybarrels = {
                      barrelOne: {
                        barrelWidth: playerUpgrade.width * 0.9,
                        barrelHeight: (playerUpgrade.height / 25) * 40,
                        additionalAngle: 0,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 5,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 5 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 50,
                        bulletDamage: 0.05 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 1,
                        bulletTimer: 1000,
                        bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 1,
                        shooting: "yes",
                      },
                    });
                  playerUpgrade.assets = {};
                  playerUpgrade.bodyType = "battleship";
                  playerUpgrade.bodyTypeLevel = 20;
                  playerUpgrade.dronesControlling = [];
                }
              } else if (playerUpgrade.bodyType == "thruster") {
                if (button == "button8") {
                  //launcher
                  playerUpgrade.maxhealth = 80 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.4 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.25 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 11 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {};
                  playerUpgrade.assets = {
                    assetOne: {
                      type: "above",
                      sides: 0,
                      color: "rgb(105, 104, 104)",
                      outline: "rgb(79, 78, 78)",
                      outlineThickness: 5,
                      size: 0.5, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.bodyType = "launcher";
                  playerUpgrade.bodyTypeLevel = 20;
                }
              }
            } else if (
              playerUpgrade.level >= 45 &&
              playerUpgrade.bodyTypeLevel < 45
            ) {
              //tier 5
              if (playerUpgrade.bodyType == "thorn") {
                if (button == "button8") {
                  //saw
                  playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.5 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.55 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 7 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {};
                  playerUpgrade.assets = {
                    assetOne: {
                      type: "under",
                      sides: 4,
                      color: "#5F676C",
                      outline: "#41494E",
                      outlineThickness: 5,
                      size: 1.75, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.bodyType = "saw";
                  playerUpgrade.bodyTypeLevel = 45;
                }
              } else if (playerUpgrade.bodyType == "brigade") {
                if (button == "button8") {
                  //battalion
                  playerUpgrade.maxhealth = 160 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.5 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.4 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 7 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.turretBaseSize = 0.7; //for AI tanks only
                  playerUpgrade.AIdetectRange = 500;
                  playerUpgrade.bodybarrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width * 0.8,
                      barrelHeight: playerUpgrade.height * 1.7,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 15 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.35 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 1,
                      bulletTimer: 40,
                      bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.5,
                      shooting: "yes",
                    },
                  };
                  playerUpgrade.assets = {
                    assetOne: {
                      type: "under",
                      sides: 5,
                      color: "#5F676C",
                      outline: "#41494E",
                      outlineThickness: 5,
                      size: 1.5, //in comparison to the player's width
                      angle: 17.5,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.bodyType = "battalion";
                  playerUpgrade.bodyTypeLevel = 45;
                }
              } else if (playerUpgrade.bodyType == "foundry") {
                if (button == "button8") {
                  //flame
                  playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.5 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.45 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 7 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {
                    barrelOne: {
                      barrelWidth: 0,
                      barrelHeight: 0,
                      additionalAngle: 0,
                      x: 0,
                      y: 0,
                      barrelMoveIncrementY: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "aura",
                      auraSize: 6,
                      auraColor: "rgba(255,0,0,.15)",
                      auraOutline: "rgba(255,0,0,.15)",
                      reloadRecover: 1 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 1000,
                      bulletDamage: 0.3 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 0,
                      bulletTimer: 3,
                      bulletSpeed: 0,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0,
                      shooting: "yes",
                    },
                  };
                  playerUpgrade.assets = {
                    assetOne: {
                      //grey aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgb(153,153,151)",
                      outline: "rgb(122,124,123)",
                      outlineThickness: 5,
                      size: 0.75, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                    assetTwo: {
                      //red aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgb(253,118,118)",
                      outline: "rgb(222,88,88)",
                      outlineThickness: 5,
                      size: 0.3, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.thickestBarrel = "aura";
                  playerUpgrade.bodyType = "flame";
                  playerUpgrade.bodyTypeLevel = 45;
                } else if (button == "button9") {
                  //juggernaut
                  playerUpgrade.maxhealth = 130 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.5 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.25 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 7 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {
                    barrelOne: {
                      barrelWidth: 0,
                      barrelHeight: 0,
                      additionalAngle: 0,
                      x: 0,
                      y: 0,
                      barrelMoveIncrementY: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "aura",
                      auraSpecialty: "attraction",
                      auraSize: 6,
                      auraColor: "rgba(87, 85, 163, .3)",
                      auraOutline: "rgba(75, 73, 143)",
                      reloadRecover: 1 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 1000,
                      bulletDamage: 0.2 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 0,
                      bulletTimer: 3,
                      bulletSpeed: 0,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0,
                      shooting: "yes",
                    },
                  };
                  playerUpgrade.assets = {
                    assetOne: {
                      //grey aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgb(153,153,151)",
                      outline: "rgb(122,124,123)",
                      outlineThickness: 5,
                      size: 0.75, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                    assetTwo: {
                      //red aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgba(120, 118, 194)",
                      outline: "rgba(90, 88, 164)",
                      outlineThickness: 5,
                      size: 0.3, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.thickestBarrel = "aura";
                  playerUpgrade.bodyType = "juggernaut";
                  playerUpgrade.bodyTypeLevel = 45;
                }
              } else if (playerUpgrade.bodyType == "blizzard") {
                if (button == "button8") {
                  //snowstorm
                  playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.5 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.25 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 5 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {
                    barrelOne: {
                      barrelWidth: 0,
                      barrelHeight: 0,
                      additionalAngle: 0,
                      x: 0,
                      y: 0,
                      barrelMoveIncrementY: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "aura",
                      auraSpecialty: "freeze",
                      auraSize: 6,
                      auraColor: "rgba(173,216,230,.3)",
                      auraOutline: "rgba(150, 208, 227,.5)",
                      reloadRecover: 1 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 1000,
                      bulletDamage: 0.25 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 0,
                      bulletTimer: 3,
                      bulletSpeed: 0,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0,
                      shooting: "yes",
                    },
                  };
                  playerUpgrade.assets = {
                    assetOne: {
                      //grey aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgb(105, 104, 104)",
                      outline: "rgb(79, 78, 78)",
                      outlineThickness: 5,
                      size: 0.65, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                    assetTwo: {
                      //red aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgba(150, 208, 227)",
                      outline: "rgba(132, 190, 209)",
                      outlineThickness: 5,
                      size: 0.3, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.thickestBarrel = "aura";
                  playerUpgrade.bodyType = "snowstorm";
                  playerUpgrade.bodyTypeLevel = 45;
                }
              } else if (playerUpgrade.bodyType == "remedy") {
                if (button == "button8") {
                  //fabricator
                  playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.5 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.25 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 5 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {
                    barrelOne: {
                      barrelWidth: 0,
                      barrelHeight: 0,
                      additionalAngle: 0,
                      x: 0,
                      y: 0,
                      barrelMoveIncrementY: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "aura",
                      auraSpecialty: "heal",
                      auraSize: 6,
                      auraColor: "rgba(56,183,100,.15)",
                      auraOutline: "rgba(26,153,70,.15)",
                      reloadRecover: 1 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 1000,
                      bulletDamage: 0 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 0,
                      bulletTimer: 3,
                      bulletSpeed: 0,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0,
                      shooting: "yes",
                    },
                  };
                  playerUpgrade.assets = {
                    assetOne: {
                      //grey aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgb(153,153,151)",
                      outline: "rgb(122,124,123)",
                      outlineThickness: 5,
                      size: 0.75, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                    assetTwo: {
                      //red aura base asset
                      type: "above",
                      sides: 8,
                      color: "rgba(56,183,100)",
                      outline: "rgba(26,153,70)",
                      outlineThickness: 5,
                      size: 0.3, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.thickestBarrel = "aura";
                  playerUpgrade.bodyType = "fabricator";
                  playerUpgrade.bodyTypeLevel = 45;
                }
              } else if (playerUpgrade.bodyType == "palace") {
                if (button == "button8") {
                  //ziggurat
                  playerUpgrade.maxhealth = 290 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    1 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    75 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.25 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 5 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {};
                  playerUpgrade.assets = {
                    assetOne: {
                      type: "under",
                      sides: 0,
                      color: "#5F676C",
                      outline: "#41494E",
                      outlineThickness: 5,
                      size: 1.5, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.bodyType = "ziggurat";
                  playerUpgrade.bodyTypeLevel = 45;
                }
              } else if (playerUpgrade.bodyType == "bastion") {
                if (button == "button8") {
                  //artillery
                  playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.5 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.25 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 7 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.turretBaseSize = 0.7; //for AI tanks only
                  playerUpgrade.AIdetectRange = 600;
                  playerUpgrade.bodybarrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width * 0.9,
                      barrelHeight: (playerUpgrade.height / 25) * 50,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 20 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 1.87 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 1,
                      bulletTimer: 50,
                      bulletSpeed: 20 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.75,
                      shooting: "yes",
                    },
                  };
                  playerUpgrade.assets = {};
                  playerUpgrade.bodyType = "artillery";
                  playerUpgrade.bodyTypeLevel = 45;
                }
              } else if (playerUpgrade.bodyType == "triplet") {
                if (button == "button8") {
                  //quadruplet
                  playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.5 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.25 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 7 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.turretBaseSize = 0.7; //for AI tanks only
                  playerUpgrade.AIdetectRange = 550;
                  playerUpgrade.bodybarrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width * 0.4,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 0,
                      x: playerUpgrade.width * 0.4,
                      barrelMoveIncrement: 0.4,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 1,
                      bulletTimer: 50,
                      bulletSpeed: 13 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 5, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.2,
                      shooting: "yes",
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width * 0.4,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 0,
                      x: -playerUpgrade.width * 0.4,
                      barrelMoveIncrement: -0.4,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 1,
                      bulletTimer: 50,
                      bulletSpeed: 13 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 5, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.2,
                      shooting: "yes",
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width * 0.4,
                      barrelHeight: (playerUpgrade.height / 25) * 30,
                      additionalAngle: 0,
                      x: -playerUpgrade.width * 0.2,
                      barrelMoveIncrement: -0.2,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 1,
                      bulletTimer: 50,
                      bulletSpeed: 13 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.2,
                      shooting: "yes",
                    },
                    barrelFour: {
                      barrelWidth: playerUpgrade.width * 0.4,
                      barrelHeight: (playerUpgrade.height / 25) * 30,
                      additionalAngle: 0,
                      x: playerUpgrade.width * 0.2,
                      barrelMoveIncrement: 0.2,
                      barrelType: "bullet",
                      reloadRecover: 10 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.1 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 1,
                      bulletTimer: 50,
                      bulletSpeed: 13 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 5, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.2,
                      shooting: "yes",
                    },
                  };
                  playerUpgrade.assets = {};
                  playerUpgrade.bodyType = "quadruplet";
                  playerUpgrade.bodyTypeLevel = 45;
                }
              } else if (playerUpgrade.bodyType == "battleship") {
                if (button == "button8") {
                  //mothership
                  playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.5 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.25 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 7 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.turretBaseSize = 0.75; //for AI tanks only
                  playerUpgrade.AIdetectRange = 600;
                  (playerUpgrade.AImousex = 0),
                    (playerUpgrade.AImousey = 0),
                    (playerUpgrade.bodybarrels = {
                      barrelOne: {
                        barrelWidth: playerUpgrade.width * 1,
                        barrelHeight: (playerUpgrade.height / 25) * 50,
                        additionalAngle: 0,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 7,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 5 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 100,
                        bulletDamage: 0.07 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 1,
                        bulletTimer: 1000,
                        bulletSpeed: 10 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 1,
                        shooting: "yes",
                      },
                    });
                  playerUpgrade.assets = {};
                  playerUpgrade.bodyType = "mothership";
                  playerUpgrade.bodyTypeLevel = 45;
                  playerUpgrade.dronesControlling = [];
                }
              } else if (playerUpgrade.bodyType == "launcher") {
                if (button == "button8") {
                  //rocketer
                  playerUpgrade.maxhealth = 80 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.5 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.25 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 11.5 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {};
                  playerUpgrade.assets = {
                    assetOne: {
                      type: "above",
                      sides: 0,
                      color: "rgb(105, 104, 104)",
                      outline: "rgb(79, 78, 78)",
                      outlineThickness: 5,
                      size: 0.6, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.bodyType = "rocketer";
                  playerUpgrade.bodyTypeLevel = 45;
                }
              }
            } else if (
              playerUpgrade.level >= 100 &&
              playerUpgrade.bodyTypeLevel < 100
            ) {
              if (
                playerUpgrade.bodyType == "primordial" &&
                tanklocation == "sanc"
              ) {
                if (button == "button8") {
                  //OVEN
                  playerUpgrade.maxhealth = 120 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    1 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.3 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 7 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {
                    barrelOne: {
                      barrelWidth: 0,
                      barrelHeight: 0,
                      additionalAngle: 0,
                      x: 0,
                      y: 0,
                      barrelMoveIncrementY: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "aura",
                      auraSize: 6,
                      auraColor: "rgba(255,0,0,.15)",
                      auraOutline: "rgba(255,0,0,.15)",
                      reloadRecover: 1 * a,
                      bulletHealth: 1000,
                      bulletDamage: 0.4 * c,
                      bulletPenetration: 0,
                      bulletTimer: 3,
                      bulletSpeed: 0 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0,
                      shooting: "yes",
                    },
                  };
                  playerUpgrade.assets = {
                    assetOne: {
                      //grey aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgb(105, 104, 104)",
                      outline: "rgb(79, 78, 78)",
                      outlineThickness: 5,
                      size: 0.7, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                    assetTwo: {
                      //red aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgb(250, 112, 112)",
                      outline: "rgba(227, 61, 61)",
                      outlineThickness: 5,
                      size: 0.4, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.thickestBarrel = "aura";
                  playerUpgrade.bodyType = "oven";
                  playerUpgrade.bodyTypeLevel = 100;
                } else if (button == "button9") {
                  //POUNDER
                  playerUpgrade.maxhealth = 200 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    2 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.65 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 6.5 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {};
                  playerUpgrade.assets = {
                    assetTwo: {
                      type: "under",
                      sides: 6,
                      color: "slategrey",
                      outline: "black",
                      outlineThickness: 5,
                      size: 1.4, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                    assetOne: {
                      type: "under",
                      sides: 6,
                      color: "dimgrey",
                      outline: "black",
                      outlineThickness: 5,
                      size: 1.2, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.bodyType = "pounder";
                  playerUpgrade.bodyTypeLevel = 100;
                } else if (button == "button10") {
                  //LIGHTNING
                  playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    1 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.3 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 11.5 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {};
                  playerUpgrade.assets = {
                    assetOne: {
                      type: "above",
                      sides: 0,
                      color: "rgb(105, 104, 104)",
                      outline: "rgb(79, 78, 78)",
                      outlineThickness: 5,
                      size: 0.5, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.bodyType = "lightning";
                  playerUpgrade.bodyTypeLevel = 100;
                } else if (button == "button11") {
                  //METEOR
                  playerUpgrade.maxhealth = 120 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    1 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.3 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 7 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.turretBaseSize = 0.6; //for AI tanks only
                  playerUpgrade.AIdetectRange = 600;
                  playerUpgrade.bodybarrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width * 0.5,
                      barrelHeight: (playerUpgrade.height / 25) * 30,
                      additionalAngle: 0,
                      x: -playerUpgrade.width * 0.3,
                      barrelMoveIncrement: -0.3,
                      barrelType: "bullet",
                      reloadRecover: 5 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.3 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 1,
                      bulletTimer: 24,
                      bulletSpeed: 25 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.25,
                      shooting: "yes",
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width * 0.5,
                      barrelHeight: (playerUpgrade.height / 25) * 30,
                      additionalAngle: 0,
                      x: playerUpgrade.width * 0.3,
                      barrelMoveIncrement: 0.3,
                      barrelType: "bullet",
                      reloadRecover: 5 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.3 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 1,
                      bulletTimer: 24,
                      bulletSpeed: 25 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 2.5, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.25,
                      shooting: "yes",
                    },
                  };
                  playerUpgrade.assets = {};
                  playerUpgrade.bodyType = "meteor";
                  playerUpgrade.bodyTypeLevel = 100;
                } else if (button == "button12") {
                  //chainsaw
                  playerUpgrade.maxhealth = 75 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.5 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 3 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 7.5 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {};
                  playerUpgrade.assets = {
                    assetOne: {
                      type: "under",
                      sides: 8,
                      color: "grey",
                      outline: "dimgrey",
                      outlineThickness: 5,
                      size: 1.2, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.bodyType = "chainsaw";
                  playerUpgrade.bodyTypeLevel = 100;
                } else if (button == "button13") {
                  //SATELLITE
                  playerUpgrade.maxhealth = 120 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    1 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.3 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 7 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.turretBaseSize = 0.4; //for AI tanks only
                  playerUpgrade.AIdetectRange = 600;
                  (playerUpgrade.AImousex = 0),
                    (playerUpgrade.AImousey = 0),
                    (playerUpgrade.bodybarrels = {
                      barrelOne: {
                        barrelWidth: playerUpgrade.width * 0.5,
                        barrelHeight: playerUpgrade.height,
                        additionalAngle: 0,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 15,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 8 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 20,
                        bulletDamage: 0.05 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 1,
                        bulletTimer: 50,
                        bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0.3,
                        shooting: "yes",
                      },
                    });
                  playerUpgrade.assets = {};
                  playerUpgrade.assets = {};
                  playerUpgrade.bodyType = "satellite";
                  playerUpgrade.bodyTypeLevel = 100;
                  playerUpgrade.dronesControlling = [];
                }
              }
            } else if (
              playerUpgrade.level >= 111 &&
              playerUpgrade.bodyTypeLevel < 111 &&
              tanklocation == "sanc"
            ) {
              //eternal tier 2
              if (playerUpgrade.bodyType == "oven") {
                if (button == "button8") {
                  //heliosphere
                  playerUpgrade.maxhealth = 120 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    1 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.3 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 7 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {
                    barrelOne: {
                      barrelWidth: 0,
                      barrelHeight: 0,
                      additionalAngle: 0,
                      x: 0,
                      y: 0,
                      barrelMoveIncrement: 0,
                      barrelMoveIncrementY: 0,
                      barrelType: "aura",
                      auraSize: 6,
                      auraColor: "rgba(255,0,0,.15)",
                      auraOutline: "rgba(255,0,0,.15)",
                      reloadRecover: 1 * a,
                      bulletHealth: 1000,
                      bulletDamage: 0.4 * c,
                      bulletPenetration: 0,
                      bulletTimer: 3,
                      bulletSpeed: 0 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0,
                      shooting: "yes",
                    },
                    barrelTwo: {
                      barrelWidth: 0,
                      barrelHeight: 0,
                      additionalAngle: 0,
                      x: playerUpgrade.width * 0.7,
                      y: playerUpgrade.width * 0,
                      barrelMoveIncrement: 0.7,
                      barrelMoveIncrementY: 0,
                      barrelType: "aura",
                      auraSize: 3,
                      auraColor: "rgba(255,0,0,.15)",
                      auraOutline: "rgba(255,0,0,.15)",
                      reloadRecover: 1 * a,
                      bulletHealth: 1000,
                      bulletDamage: 0.3 * c,
                      bulletPenetration: 0,
                      bulletTimer: 3,
                      bulletSpeed: 0 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0,
                      shooting: "yes",
                    },
                    barrelThree: {
                      barrelWidth: 0,
                      barrelHeight: 0,
                      additionalAngle: 0,
                      x: playerUpgrade.width * -0.4,
                      y: playerUpgrade.width * -0.6,
                      barrelMoveIncrement: -0.4,
                      barrelMoveIncrementY: -0.6,
                      barrelType: "aura",
                      auraSize: 3,
                      auraColor: "rgba(255,0,0,.15)",
                      auraOutline: "rgba(255,0,0,.15)",
                      reloadRecover: 1 * a,
                      bulletHealth: 1000,
                      bulletDamage: 0.3 * c,
                      bulletPenetration: 0,
                      bulletTimer: 3,
                      bulletSpeed: 0 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0,
                      shooting: "yes",
                    },
                    barrelFour: {
                      barrelWidth: 0,
                      barrelHeight: 0,
                      additionalAngle: 0,
                      x: playerUpgrade.width * -0.4,
                      y: playerUpgrade.width * 0.6,
                      barrelMoveIncrement: -0.4,
                      barrelMoveIncrementY: 0.6,
                      barrelType: "aura",
                      auraSize: 3,
                      auraColor: "rgba(255,0,0,.15)",
                      auraOutline: "rgba(255,0,0,.15)",
                      reloadRecover: 1 * a,
                      bulletHealth: 1000,
                      bulletDamage: 0.3 * c,
                      bulletPenetration: 0,
                      bulletTimer: 3,
                      bulletSpeed: 0 * d,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0,
                      shooting: "yes",
                    },
                  };
                  playerUpgrade.assets = {
                    assetOne: {
                      //grey aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgb(105, 104, 104)",
                      outline: "rgb(79, 78, 78)",
                      outlineThickness: 5,
                      size: 0.4, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                    assetTwo: {
                      //red aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgb(250, 112, 112)",
                      outline: "rgba(227, 61, 61)",
                      outlineThickness: 5,
                      size: 0.2, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                    assetThree: {
                      //grey aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgb(105, 104, 104)",
                      outline: "rgb(79, 78, 78)",
                      outlineThickness: 5,
                      size: 0.2, //in comparison to the player's width
                      angle: 0,
                      x: 0.7,
                      y: 0,
                    },
                    assetFour: {
                      //red aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgb(250, 112, 112)",
                      outline: "rgba(227, 61, 61)",
                      outlineThickness: 5,
                      size: 0.1, //in comparison to the player's width
                      angle: 0,
                      x: 0.7,
                      y: 0,
                    },
                    assetFive: {
                      //grey aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgb(105, 104, 104)",
                      outline: "rgb(79, 78, 78)",
                      outlineThickness: 5,
                      size: 0.2, //in comparison to the player's width
                      angle: 0,
                      x: -0.4,
                      y: -0.6,
                    },
                    assetSix: {
                      //red aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgb(250, 112, 112)",
                      outline: "rgba(227, 61, 61)",
                      outlineThickness: 5,
                      size: 0.1, //in comparison to the player's width
                      angle: 0,
                      x: -0.4,
                      y: -0.6,
                    },
                    assetSeven: {
                      //grey aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgb(105, 104, 104)",
                      outline: "rgb(79, 78, 78)",
                      outlineThickness: 5,
                      size: 0.2, //in comparison to the player's width
                      angle: 0,
                      x: -0.4,
                      y: 0.6,
                    },
                    assetEight: {
                      //red aura base asset
                      type: "above",
                      sides: 0,
                      color: "rgb(250, 112, 112)",
                      outline: "rgba(227, 61, 61)",
                      outlineThickness: 5,
                      size: 0.1, //in comparison to the player's width
                      angle: 0,
                      x: -0.4,
                      y: 0.6,
                    },
                  };
                  playerUpgrade.thickestBarrel = "aura";
                  playerUpgrade.bodyType = "heliosphere";
                  playerUpgrade.bodyTypeLevel = 111;
                }
              } else if (playerUpgrade.bodyType == "lightning") {
                if (button == "button8") {
                  //FIREBOLT
                  playerUpgrade.maxhealth = 100 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    1 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.3 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 12 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {};
                  playerUpgrade.assets = {
                    assetOne: {
                      type: "above",
                      sides: 0,
                      color: "rgb(105, 104, 104)",
                      outline: "rgb(79, 78, 78)",
                      outlineThickness: 5,
                      size: 0.6, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.bodyType = "firebolt";
                  playerUpgrade.bodyTypeLevel = 111;
                }
              } else if (playerUpgrade.bodyType == "pounder") {
                if (button == "button8") {
                  //CHASM
                  playerUpgrade.maxhealth = 250 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    2 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.7 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 6 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {};
                  playerUpgrade.assets = {
                    assetOne: {
                      type: "under",
                      sides: 6,
                      color: "#383838",
                      outline: "black",
                      outlineThickness: 5,
                      size: 1.3, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.bodyType = "chasm";
                  playerUpgrade.bodyTypeLevel = 111;
                }
              } else if (playerUpgrade.bodyType == "meteor") {
                if (button == "button8") {
                  //NEBULA
                  playerUpgrade.maxhealth = 120 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    1 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.3 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 7 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.turretBaseSize = 0.6; //for AI tanks only
                  playerUpgrade.AIdetectRange = 600;
                  playerUpgrade.bodybarrels = {
                    barrelOne: {
                      barrelWidth: playerUpgrade.width * 0.5,
                      barrelHeight: (playerUpgrade.height / 25) * 30,
                      additionalAngle: 0,
                      x: -playerUpgrade.width * 0.3,
                      barrelMoveIncrement: -0.3,
                      barrelType: "bullet",
                      reloadRecover: 5 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.25 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 1,
                      bulletTimer: 24,
                      bulletSpeed: 25 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0,
                      recoil: 0.2,
                      shooting: "yes",
                    },
                    barrelTwo: {
                      barrelWidth: playerUpgrade.width * 0.5,
                      barrelHeight: (playerUpgrade.height / 25) * 30,
                      additionalAngle: 0,
                      x: playerUpgrade.width * 0.3,
                      barrelMoveIncrement: 0.3,
                      barrelType: "bullet",
                      reloadRecover: 5 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.25 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 1,
                      bulletTimer: 24,
                      bulletSpeed: 25 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0,
                      recoil: 0.2,
                      shooting: "yes",
                    },
                    barrelThree: {
                      barrelWidth: playerUpgrade.width * 0.5,
                      barrelHeight: (playerUpgrade.height / 25) * 35,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 5 * playerUpgrade.statMultiplier[5],
                      bulletHealth: 15,
                      bulletDamage: 0.25 * playerUpgrade.statMultiplier[4],
                      bulletPenetration: 1,
                      bulletTimer: 24,
                      bulletSpeed: 25 * playerUpgrade.statMultiplier[3],
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0,
                      recoil: 0.2,
                      shooting: "yes",
                    },
                  };
                  playerUpgrade.assets = {};
                  playerUpgrade.bodyType = "nebula";
                  playerUpgrade.bodyTypeLevel = 111;
                }
              } else if (playerUpgrade.bodyType == "chainsaw") {
                if (button == "button8") {
                  //blade
                  playerUpgrade.maxhealth = 75 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    0.5 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 4 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 7.5 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.bodybarrels = {};
                  playerUpgrade.assets = {
                    assetOne: {
                      type: "under",
                      sides: 8,
                      color: "#383838",
                      outline: "black",
                      outlineThickness: 5,
                      size: 1.3, //in comparison to the player's width
                      angle: 0,
                      x: 0,
                      y: 0,
                    },
                  };
                  playerUpgrade.bodyType = "blade";
                  playerUpgrade.bodyTypeLevel = 111;
                }
              } else if (playerUpgrade.bodyType == "satellite") {
                if (button == "button8") {
                  //TRITON
                  playerUpgrade.maxhealth = 120 * playerUpgrade.statMultiplier[1];
                  playerUpgrade.healthRegenSpeed =
                    1 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.healthRegenTime =
                    100 * playerUpgrade.statMultiplier[0];
                  playerUpgrade.damage = 0.3 * playerUpgrade.statMultiplier[2];
                  playerUpgrade.speed = 7 * playerUpgrade.statMultiplier[6];
                  playerUpgrade.turretBaseSize = 0.5; //for AI tanks only
                  playerUpgrade.AIdetectRange = 600;
                  (playerUpgrade.AImousex = 0),
                    (playerUpgrade.AImousey = 0),
                    (playerUpgrade.bodybarrels = {
                      barrelOne: {
                        barrelWidth: playerUpgrade.width * 0.5,
                        barrelHeight: playerUpgrade.height,
                        additionalAngle: 0,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 8,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 12 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 20,
                        bulletDamage: 0.07 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 1,
                        bulletTimer: 50,
                        bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0.1,
                        shooting: "yes",
                      },
                      barrelTwo: {
                        barrelWidth: playerUpgrade.width * 0.3,
                        barrelHeight: playerUpgrade.height * 1.2,
                        additionalAngle: 0,
                        x: 0,
                        barrelMoveIncrement: 0,
                        barrelType: "drone",
                        droneLimit: 8,
                        droneCount: 0, //changes when drones spawn and die
                        reloadRecover: 12 * playerUpgrade.statMultiplier[5],
                        bulletHealth: 20,
                        bulletDamage: 0.07 * playerUpgrade.statMultiplier[4],
                        bulletPenetration: 1,
                        bulletTimer: 50,
                        bulletSpeed: 15 * playerUpgrade.statMultiplier[3],
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 2, //must be zero, for the weapon reload, change the reloadRecover property above
                        recoil: 0.1,
                        shooting: "yes",
                      },
                    });
                  playerUpgrade.assets = {};
                  playerUpgrade.assets = {};
                  playerUpgrade.bodyType = "triton";
                  playerUpgrade.bodyTypeLevel = 111;
                  playerUpgrade.dronesControlling = [];
                }
              }
            }

            if (type == "tankButton") {
              //send the information on how to draw tank on button
              playerUpgrade.fovMultiplier -= fovincrease * playerUpgrade.level;
              var packet = JSON.stringify(["tankButton",
                playerUpgrade,
                button,
                realPlayer]);
              client.send(packet);
            }
          }
        }
      }
      else if (type == "pingServer") {//when the client ping the server to check latency
        var packet = JSON.stringify(["pong"]);
        client.send(packet);
      }
      else if (type == "joinGame") {
        if (gamemode == "arena" || gamemode == "2tdm" || gamemode == "editor") {//only can spawn in arena
          let playerName = info[1];
          //when client clicked play
          if (!players.hasOwnProperty(client.id)) {
            //check if client has already joined
            //check name
            if (playerName == null || playerName == "" || playerName == "ni gger" || playerName == "ni gga") {
              playerName = "unnamed";
            } else {
              playerName = playerName.replace(/[^\x00-\x7F]/g, ""); //remove non ascii characters
              if (playerName == "") {
                //if all the characters were not allowed
                playerName = "unnamed";
              } else if (playerName.length > 20) {
                //maximum name length of 20
                playerName = playerName.substring(0, 20); //get first 20 characters
              }
            }

            //generating a random player spawn location
            const startingWidth = 50; //width of player when spawn
            const calculationForSpawning = gameSize - startingWidth * 2; //minus the sides so won't spawn outside arena
            //get random location
            var locationX =
              Math.floor(Math.random() * calculationForSpawning) + startingWidth;
            var locationY =
              Math.floor(Math.random() * calculationForSpawning) + startingWidth;
            if (gamemode == "2tdm") {
              var whichdef = Math.floor(Math.random() * 8) + 1;//number from 1 to 8
              locationX = defenders[whichdef].x;
              locationY = defenders[whichdef].y;
              var packet = JSON.stringify(["teams", team1, team2]);//send team colors
              client.send(packet)
            }
            else if (gamemode == "editor") {//spawn in safezone
              locationX = Math.floor(Math.random() * safeZone) + safezoneleft;
              locationY = Math.floor(Math.random() * safeZone) + safezoneleft;
            }
            let startingScore = 0; //spawn with no score

            let thisguysIP = findIpUsingId[client.id];
            if (deadPlayers.hasOwnProperty(thisguysIP)) {
              //if player is respawning, give him some score
              if (deadPlayers[thisguysIP] > 0) {
                //if player didnt die at 0 score
                startingScore = Math.round(
                  deadPlayers[thisguysIP] / respawnScoreDivision
                ); //spawn with 50% of previous score
                if (startingScore > respawnScoreLimit) {
                  //cannot spawn with more than 0.5m score
                  startingScore = respawnScoreLimit;
                }
                deadPlayers[thisguysIP] = 0;
              }
            }

            //check if player is signed in to an account
            let accountID = "none"; //DO NOT CHANGE THIS
            if (clientAccountIDs.hasOwnProperty(client.id)) {
              accountID = clientAccountIDs[client.id];
            }

            //add player to the player list
            //spawn as a basic tank
            //heres neo to tell you this is also a basic tank
            players[client.id] = {
              x: locationX,
              y: locationY,
              health: 75,
              maxhealth: 75,
              healthRegenSpeed: 0.1,
              healthRegenTime: 100, //time until health regen
              healthRegenTimeChange: 100, //will change when finding out whether to regenerate health
              damage: 0.1, //body damage
              score: startingScore,
              level: 0,
              name: playerName,
              amountAddWhenMoveX: 0, //determines whether player is moving or not
              amountAddWhenMoveY: 0,
              speed: 10, //max speed
              currentspeedX: 0, //keeps track of accelerating and decelerating
              currentspeedY: 0,
              haveAI: "no",
              autofire: "no",
              autorotate: "no",
              fastautorotate: "no",
              passive: "no",
              chats: [],
              //do not change starting width and height as it will affect proportion with barrel
              width: 25, //radius of player body, so it is half of actual width
              height: 25, //also half of actual height
              color: "#00B0E1",//although color is in client code, but need this for bullet color and leaderboard
              outline: "#0092C3",
              team: "none",
              gm: gamemode,
              barrels: {
                barrelOne: {
                  barrelWidth: 25,
                  barrelHeight: 45,
                  additionalAngle: 0,
                  //x and y zero refers to barrel in middle, if it is negative, the barrel is towards the left of the tank
                  x: 0,
                  barrelMoveIncrement: 0,
                  barrelType: "bullet",
                  reloadRecover: 20, //delay between bullets
                  bulletHealth: 10,
                  bulletDamage: 0.5,
                  bulletPenetration: 2,
                  bulletTimer: 50, //max amount of time that bullet can move
                  bulletSpeed: 12, //this is the speed of the bullet, the faster the bullet, the less damage it will do, so fast bullets need to have more damage!
                  barrelHeightChange: 0, //barrel height reduction when shooting
                  shootingState: "no", //for the barrel animation when shooting
                  reload: 0, //must be zero, this value changes
                  recoil: 1,
                },
              },
              bodybarrels: {}, //barrels in the body upgrades
              assets: {},
              tallestBarrel: 2, //for easier calculation when finding out if a player can be seen on the screen, it must be relative to the player width and height, e.g. in this case, the tallest barrel is 50 when theplayer height is 25, then write 2 because 50/25 is 2
              thickestBarrel: 0.8,
              angle: 0,
              shooting: "no",
              tankType: "basic",
              tankTypeLevel: 0, //the level that upgraded to the current tank
              bodyType: "node",
              bodyTypeLevel: 0,
              hit: 0,
              developer: "no",
              fovMultiplier: 1, //field of vision
              recoilXAmount: 0, //the recoil values that changes when shooting
              recoilYAmount: 0,
              spawnProtectionDuration: 2000, //spawn protection when you spawn, prevents you from dying when spawning. High number means high duration
              spawnProtection: 0, //0 means turned on when spawning
              skillPoints: [0, 0, 0, 0, 0, 0, 0, 0], //number of stat points
              statMultiplier: [1, 1, 1, 1, 1, 1, 1, 1], //the actual multiplier
              unusedPoints: 0, //change back later
              accountID: accountID,
              sentAch: [],//contains list of achivements sent during this gameplay, prevents achivements from being sent multiple times and crashing server
              dronesControlling: [], //list of drones that tank is controlling, needed for calculating postion when not moving mouse
              droneMode: "idle", //refers to the state the drones are in
            };

            if (gamemode == "2tdm") {
              players[client.id].team = defenders[whichdef].team;
            }

            //add welcome achievement to player's account
            addAchievement(players, client.id, 1, 5);

            //send info that will only be sent when changed
            var packet = JSON.stringify(["map", gameSize]);
            client.send(packet);
            var packet = JSON.stringify(["pc", Object.keys(players).length]);
            client.send(packet);
            var packet = JSON.stringify(["gpc", globalPlayerCount]);
            client.send(packet);
            var packet = JSON.stringify(["lb", leaderboard]);
            client.send(packet);

            //reset list of stuff that player has, just in case player is rejoining after losing connection/server restart
            previtems[client.id] = {};
            prevportals[client.id] = {};

            //next, check if client gave any correct developer token
            if (peopleWithToken.includes(client.id)) {
              console.log("a dev joined");
              //remove client id from list
              let index = peopleWithToken.indexOf(client.id);
              if (index > -1) {
                // only splice array when item is found
                peopleWithToken.splice(index, 1); // 2nd parameter means remove one item only
              }
              players[client.id].developer = "yes";
              var packet = JSON.stringify(["newNotification",
                "Successfully joined as dev.",
                "green"]);
              client.send(packet);
            }
          }
        }
      }
      else if (type == "teleporting") {//this guy is teleporting from another server, that's why he is connecting to this server
        let playerID = info[1];//client sends a player id, which was it's player id in the previous dimension before teleporting
        try {
          playerID = playerID.toString();//change to string
        }
        catch (err) {
          playerID = "";//someone sending invalid ID
        }

        if (teleportedPlayers.hasOwnProperty(playerID)) {//this is a legit teleporting
          players[playerID] = { ...teleportedPlayers[playerID] };
          delete teleportedPlayers[playerID]
          players[playerID].spawnProtection = 0;
          //reset number of drones that you are controlling
          players[playerID].dronesControlling = [];
          //add achievement for teleporting
          addAchievement(players, playerID, 7, 5);
          //generating a random player spawn location
          const startingWidth = 50; //width of player when spawn
          const calculationForSpawning = gameSize - startingWidth * 2; //minus the sides so won't spawn outside arena
          //get random location
          const locationX =
            Math.floor(Math.random() * calculationForSpawning) + startingWidth;
          const locationY =
            Math.floor(Math.random() * calculationForSpawning) + startingWidth;
          players[playerID].x = locationX;
          players[playerID].y = locationY;
          if (gamemode == "dune") {
            players[playerID].x = enterDunePortal.x;
            players[playerID].y = enterDunePortal.y;
            if (players[playerID].team != "eternal") {
              players[playerID].team = "none";
            }
          }
          else if (gamemode == "sanc") {
            players[playerID].x = sancspawner.x;
            players[playerID].y = sancspawner.y;
          }
          else if (gamemode == "2tdm") {
            if (players[playerID].team != "eternal") {
              var whichdef = Math.floor(Math.random() * 8) + 1;//number from 1 to 8
              players[playerID].x = defenders[whichdef].x;
              players[playerID].y = defenders[whichdef].y;
              players[playerID].team = defenders[whichdef].team;
            }
            var packet = JSON.stringify(["teams", team1, team2]);//send team colors
            client.send(packet)
          }
          //clientIP[ip] = playerID;
          //allow 2 connections per ip
          if (clientIP[ip][0] == client.id) {
            clientIP[ip][0] = playerID;
          }
          else {
            clientIP[ip][1] = playerID;
          }
          delete lookup[client.id]
          client.id = playerID;
          findIpUsingId[client.id] = ip;//allow respawning with score (which uses ip addr)
          lookup[playerID] = client;//ensure server sends game stuff to newly connected client
          previtems[playerID] = {};
          prevportals[playerID] = {};
          var packet = JSON.stringify(["sendID", client.id]);//send new client id
          client.send(packet)
          //send info that will only be sent when change
          var packet = JSON.stringify(["map", gameSize]);
          client.send(packet);
          var packet = JSON.stringify(["pc", Object.keys(players).length]);
          if (gamemode == "cr" || gamemode == "cavern") {
            packet = JSON.stringify(["pc", "???"]);
          }
          client.send(packet);
          var packet = JSON.stringify(["gpc", globalPlayerCount]);
          if (gamemode == "cr" || gamemode == "cavern") {
            packet = JSON.stringify(["gpc", "???"]);
          }
          client.send(packet);
          var packet = JSON.stringify(["lb", leaderboard]);
          client.send(packet);

          //allow player to spawn drones after teleporting
          for (const barrel in players[playerID].barrels) {
            if (players[playerID].barrels[barrel].barrelType == "drone" || players[playerID].barrels[barrel].barrelType == "minion") {
              players[playerID].barrels[barrel].droneCount = 0;
            }
          }
          for (const barrel in players[playerID].bodybarrels) {
            if (players[playerID].bodybarrels[barrel].barrelType == "drone" || players[playerID].bodybarrels[barrel].barrelType == "minion") {
              players[playerID].bodybarrels[barrel].droneCount = 0;//allow more drones and minions to spawn
            }
            if (players[playerID].bodybarrels[barrel].barrelType == "aura") {
              players[playerID].bodybarrels[barrel].spawnedAura = "no";//allow tank to respawn auras after teleporting
            }
          }

          //only for sanc
          if (gamemode == "sanc") {
            if (players[playerID].team != "eternal") {
              //if teleported to sanctuary, AND player is not an eternal
              //ETERNAL
              players[playerID].color = "#934c93";
              players[playerID].outline = "#660066";
              players[playerID].maxhealth =
                100 * players[playerID].statMultiplier[1];
              players[playerID].healthRegenSpeed =
                10 * players[playerID].statMultiplier[0];
              players[playerID].healthRegenTime =
                100 * players[playerID].statMultiplier[0];
              players[playerID].damage =
                0.3 * players[playerID].statMultiplier[2];
              players[playerID].speed =
                7 * players[playerID].statMultiplier[6];
              players[playerID].barrels = {};
              players[playerID].bodybarrels = {};
              players[playerID].assets = {};
              players[playerID].tallestBarrel = 0;
              players[playerID].thickestBarrel = 0;
              players[playerID].tankType = "eternal";
              players[playerID].tankTypeLevel = 45;
              players[playerID].bodyType = "primordial";
              players[playerID].bodyTypeLevel = 45;
              players[playerID].fovMultiplier =
                1 * players[playerID].statMultiplier[7]  + fovincrease * players[playerID].level;
              players[playerID].team = "eternal";
              let prevUnusedPts = 0;
              for (number in players[playerID].skillPoints) {
                prevUnusedPts += players[playerID].skillPoints[number];
              }
              players[playerID].skillPoints = [0, 0, 0, 0, 0, 0, 0, 0]; //reset stat points
              players[playerID].statMultiplier = [1, 1, 1, 1, 1, 1, 1, 1]; //reset stat multiplier
              players[playerID].unusedPoints += prevUnusedPts; //set free points
              players[playerID].turretBaseSize = 0;
            }
          }
          else if (gamemode == "cr") {
            players[playerID].x = enterCrPortal.x;//spawn near center of map
            players[playerID].y = enterCrPortal.y;
            enterCrPortal.color = players[playerID].color;
            enterCrPortal.outline = players[playerID].outline;
          }
          else if (gamemode == "arena") {
            //if in arena, reset team to none
            if (players[playerID].team != "eternal") {//if teleport from 2tdm, change team to none
              players[playerID].team = "none";
            }
          }
        }
      }
      else if (gamemode == "editor") {//tank editor stuff
        if (type == "sandbox") {//changing properties
          let valuee = info[1];
          let property = info[2];
          let value = 0;
          try {
            value = Number(valuee);//convert to number
            property = Number(property);
          }
          catch (err) {
            property = -1;
          }
          if (players.hasOwnProperty(client.id)) {
            let thisplayer = players[client.id];
            if (property == 0) {//overwrite tank type name
              //WIP
            }
            else if (property == 1) {//player radiant level
              //WIP
            }
            else if (property == 2) {//tank xp
              if (value > 1000000000000) {//score limit
                value = 1000000000000;
                var packet = JSON.stringify(["newNotification",
                  "Score is too big!",
                  "darkorange"]);
                client.send(packet);
              }
              thisplayer.score = value;
            }
            else if (property == 3) {//tank size
              if (value > 500) {//size limit
                value = 500;
                var packet = JSON.stringify(["newNotification",
                  "Size is too big!",
                  "darkorange"]);
                client.send(packet);
              }
              thisplayer.width = value;
              thisplayer.height = value;
            }
            else if (property == 4) {//weapon name
              thisplayer.tankType = valuee.toString();
            }
            else if (property == 5) {//fov
              if (value > 10) {//fov limit
                value = 10;
                var packet = JSON.stringify(["newNotification",
                  "FoV is too big!",
                  "darkorange"]);
                client.send(packet);
              }
              thisplayer.fovMultiplier = value;
            }
            else if (property == 6) {//body name
              thisplayer.bodyType = valuee.toString();
            }
            else if (property == 7) {//body sides
              //WIP
            }
            else if (property == 8) {//health
              thisplayer.maxhealth = value;
            }
            else if (property == 9) {//regen
              thisplayer.healthRegenSpeed = value;
            }
            else if (property == 10) {//regen time
              thisplayer.healthRegenTime = value;
            }
            else if (property == 11) {//damage
              thisplayer.damage = value;
            }
            else if (property == 12) {//speed
              thisplayer.speed = value;
            }
            else if (property == 13) {//change team
              thisplayer.team = valuee.toString();
            }
          }
        }
              else if (type == "barrel") {
                if (players.hasOwnProperty(client.id)) {
                  let thisplayer = players[client.id];
                  let barrelID = info[1];
                  try {
                    //barrelID = Number(barrelID)
                    barrelID = barrelID.toString();
                  }
                  catch (err) {
                    barrelID = Math.random();
                  }
                  //create a barrel in tank editor
                  thisplayer.barrels[barrelID] = {
                    barrelWidth: thisplayer.width,
                    barrelHeight: thisplayer.height / 25 * 45,
                    additionalAngle: 0,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 20,
                    bulletHealth: 10,
                    bulletDamage: 0.5,
                    bulletPenetration: 2,
                    bulletTimer: 50,
                    bulletSpeed: 12,
                    barrelHeightChange: 0,
                    shootingState: "no",
                    reload: 0,
                    recoil: 1,
                  }
                }
              }
              else if (type == "asset") {
                if (players.hasOwnProperty(client.id)) {
                  let thisplayer = players[client.id];
                  let barrelID = info[1];
                  try {
                    barrelID = barrelID.toString();
                  }
                  catch (err) {
                    barrelID = Math.random();
                  }
                  //create a asset in tank editor
                  thisplayer.assets[barrelID] = {
                    type: "under",
                    sides: 5,
                    color: "#5F676C",
                    outline: "#41494E",
                    outlineThickness: 5,
                    size: 1.5,
                    angle: 0,
                    x: 0,
                    y: 0,
                  }
                }
              }
              else if (type == "bodybarrel") {
                if (players.hasOwnProperty(client.id)) {
                  let thisplayer = players[client.id];
                  let barrelID = info[1];
                  try {
                    barrelID = barrelID.toString();
                  }
                  catch (err) {
                    barrelID = Math.random();
                  }
                  //create a turret in tank editor
                  thisplayer.turretBaseSize = 0.7;
                  thisplayer.AIdetectRange = 600;
                  thisplayer.bodybarrels[barrelID] = {
                    barrelWidth: thisplayer.width * 0.9,
                    barrelHeight: (thisplayer.height / 25) * 50,
                    additionalAngle: 0,
                    x: 0,
                    barrelMoveIncrement: 0,
                    barrelType: "bullet",
                    reloadRecover: 5,
                    bulletHealth: 15,
                    bulletDamage: 0.35,
                    bulletPenetration: 1,
                    bulletTimer: 50,
                    bulletSpeed: 15,
                    barrelHeightChange: 0,
                    shootingState: "no",
                    reload: 0,
                    recoil: 0.75,
                    shooting: "yes",
                  }
                }
              }
              else if (type == "delbarrel") {//delete barrel
                if (players.hasOwnProperty(client.id)) {
                  let thisplayer = players[client.id];
                  let barrelID = info[1];
                  try {
                    barrelID = barrelID.toString();
                  }
                  catch (err) {
                    barrelID = Math.random();
                  }
                  //if (isNaN(barrelID)) {//this is the first barrel, whose id is barrelOne and cannot be converted to number
                    //barrelID = info[1].toString();
                  //}
                  if (thisplayer.barrels.hasOwnProperty(barrelID)) {
                    delete thisplayer.barrels[barrelID];
                  }
                }
              }
              else if (type == "delasset") {//delete asset
                if (players.hasOwnProperty(client.id)) {
                  let thisplayer = players[client.id];
                  let barrelID = info[1];
                  try {
                    barrelID = barrelID.toString();
                  }
                  catch (err) {
                    barrelID = Math.random();
                  }
                  //if (isNaN(barrelID)) {//this is the first barrel, whose id is barrelOne and cannot be converted to number
                    //barrelID = info[1].toString();
                  //}
                  if (thisplayer.assets.hasOwnProperty(barrelID)) {
                    delete thisplayer.assets[barrelID];
                  }
                }
              }
              else if (type == "delbb") {//delete bodybarrel
                if (players.hasOwnProperty(client.id)) {
                  let thisplayer = players[client.id];
                  let barrelID = info[1];
                  try {
                    barrelID = barrelID.toString();
                  }
                  catch (err) {
                    barrelID = info[1].toString();
                  }
                  //if (isNaN(barrelID)) {//this is the first barrel, whose id is barrelOne and cannot be converted to number
                    //barrelID = info[1].toString();
                  //}
                  if (thisplayer.bodybarrels.hasOwnProperty(barrelID)) {
                    delete thisplayer.bodybarrels[barrelID];
                  }
                }
              }
              else if (type == "BarEdit" || type == "AssEdit" || type == "BbEdit") {//edit barrel properties
                if (players.hasOwnProperty(client.id)) {
                  let thisplayer = players[client.id];
                  let barval = info[1];
                  let prop = info[2];
                  let barID = info[3];
                  try {
                    barval = Number(barval);
                    prop = prop.toString();
                    if (prop == "Recoil") {
                      prop = "recoil";
                    }
                    else if (prop == "Speed") {
                      prop = "bulletSpeed";
                    }
                    else if (prop == "Timer") {
                      prop = "bulletTimer";
                    }
                    else if (prop == "Penetration") {
                      prop = "bulletPenetration"
                    }
                    else if (prop == "Damage") {
                      prop = "bulletDamage"
                    }
                    else if (prop == "Health") {
                      prop = "bulletHealth"
                    }
                    else if (prop == "Reload") {
                      prop = "reloadRecover"
                    }
                    else if (prop == "x-offset") {
                      prop = "x"
                    }
                    else if (prop == "Additional Angle") {
                      prop = "additionalAngle"
                    }
                    else if (prop == "Barrel Height") {
                      prop = "barrelHeight"
                    }
                    else if (prop == "Barrel Width") {
                      prop = "barrelWidth"
                    }
                    else if (prop == "type") {
                      prop = "barrelType"
                      barval = info[1].toString();
                    }
                    else if (prop == "Asset sides") {
                      prop = "sides"
                    }
                    else if (prop == "Asset color") {
                      prop = "color"
                      barval = info[1].toString();
                    }
                    else if (prop == "Asset outline") {
                      prop = "outline"
                      barval = info[1].toString();
                    }
                    else if (prop == "Outline width") {
                      prop = "outlineThickness"
                    }
                    else if (prop == "Relative size") {
                      prop = "size"
                    }
                    else if (prop == "Angle") {
                      prop = "angle"
                    }
                    else if (prop == "y-offset") {
                      prop = "y"
                    }
                    else if (prop == "position") {
                      prop = "type"
                      barval = info[1].toString();
                    }
                    else if (prop == "auraColor") {
                      barval = info[1].toString();
                    }
                    else if (prop == "auraOutline") {
                      barval = info[1].toString();
                    }
                    else if (prop == "auratype") {
                      barval = info[1].toString();
                    }
                    barID = barID.toString();
                    //if (isNaN(barID)) {//this is the first barrel, whose id is barrelOne and cannot be converted to number
                      //barID = info[3].toString();
                    //}
              if (type == "BarEdit") {
                if ((barval || barval == 0) && barval !== Infinity && barval !== -Infinity) {
                  thisplayer.barrels[barID][prop] = barval;
                }
                else {
                  var packet = JSON.stringify(["newNotification",
                    "Invalid value!",
                    "darkorange"]);
                  client.send(packet);
                }
                if (prop == "barrelType" && barval == "drone") {
                  thisplayer.barrels[barID].droneLimit = 3;
                  thisplayer.barrels[barID].droneCount = 0;
                  thisplayer.mousex = 0;
                  thisplayer.mousey = 0;
                }
                else if (prop == "barrelType" && barval == "trap") {
                  thisplayer.barrels[barID].trapDistBeforeStop = 10;
                }
                else if (prop == "barrelType" && barval == "mine") {
                  thisplayer.barrels[barID].trapDistBeforeStop = 10;
                  thisplayer.barrels[barID].haveAI = "yes";
                  thisplayer.barrels[barID].AIdetectRange = 450;
                  thisplayer.barrels[barID].barrels = {
                    barrelOne: {
                      barrelWidth: 5,
                      barrelHeight: 12.5,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 15,
                      bulletHealth: 20,
                      bulletDamage: 0.25,
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 20,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                      recoil: 0.5,
                    },
                  };
                }
                else if (prop == "barrelType" && barval == "minion") {
                  thisplayer.barrels[barID].droneLimit = 5;
                  thisplayer.barrels[barID].droneCount = 0;
                  thisplayer.barrels[barID].minDist = 200;
                  thisplayer.barrels[barID].bulletTimer = 1000;
                  thisplayer.mousex = 0;
                  thisplayer.mousey = 0;
                  thisplayer.barrels[barID].barrels = {
                    barrelOne: {
                      barrelWidth: 15,
                      barrelHeight: 21,
                      additionalAngle: 0,
                      x: 0,
                      barrelMoveIncrement: 0,
                      barrelType: "bullet",
                      reloadRecover: 10,
                      bulletHealth: 20,
                      bulletDamage: 0.1,
                      bulletPenetration: 2,
                      bulletTimer: 30,
                      bulletSpeed: 20,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: 0,
                      recoil: 0.5,
                    },
                  };
                }
              }
              else if (type == "AssEdit") {
                if ((barval || barval == 0) && barval !== Infinity && barval !== -Infinity) {
                  thisplayer.assets[barID][prop] = barval;
                }
                else {
                  var packet = JSON.stringify(["newNotification",
                    "Invalid value!",
                    "darkorange"]);
                  client.send(packet);
                }
              }
              else if (type == "BbEdit") {
                if (prop != "auratype") {
                  if ((barval || barval == 0) && barval !== Infinity && barval !== -Infinity) {
                    thisplayer.bodybarrels[barID][prop] = barval;
                  }
                  else {
                    var packet = JSON.stringify(["newNotification",
                      "Invalid value!",
                      "darkorange"]);
                    client.send(packet);
                  }
                }
                else {//changing aura type
                  if (barval == "damage") {
                    if (thisplayer.bodybarrels[barID].auraSpecialty) {
                      delete thisplayer.bodybarrels[barID].auraSpecialty
                    }
                    thisplayer.bodybarrels[barID].auraColor = "rgba(255,0,0,.15)";
                    thisplayer.bodybarrels[barID].auraOutline = "rgba(255,0,0,.15)";
                  }
                  else if (barval == "freeze") {
                    thisplayer.bodybarrels[barID].auraSpecialty = "freeze";
                    thisplayer.bodybarrels[barID].auraColor = "rgba(173,216,230,.5)";
                    thisplayer.bodybarrels[barID].auraOutline = "rgba(150, 208, 227)";
                  }
                  else if (barval == "attraction") {
                    thisplayer.bodybarrels[barID].auraSpecialty = "attraction";
                    thisplayer.bodybarrels[barID].auraColor = "rgba(87, 85, 163, .3)";
                    thisplayer.bodybarrels[barID].auraOutline = "rgba(75, 73, 143)";
                  }
                  else if (barval == "heal") {
                    //WIP
                  }
                }
                if (prop == "barrelType" && barval == "drone") {
                  thisplayer.bodybarrels[barID].droneLimit = 3;
                  thisplayer.bodybarrels[barID].droneCount = 0;
                  thisplayer.AImousex = 0;
                  thisplayer.AImousey = 0;
                }
                else if (prop == "barrelType" && barval == "trap") {
                  thisplayer.bodybarrels[barID].trapDistBeforeStop = 10;
                }
                else if (prop == "barrelType" && barval == "aura") {
                  thisplayer.bodybarrels[barID].auraSize = 4;
                  thisplayer.bodybarrels[barID].auraColor = "rgba(255,0,0,.15)";
                  thisplayer.bodybarrels[barID].auraOutline = "rgba(255,0,0,.15)";

                  thisplayer.bodybarrels[barID].reloadRecover = 1;
                  thisplayer.bodybarrels[barID].bulletHealth = 1000;
                  thisplayer.bodybarrels[barID].bulletDamage = 0.2;
                  thisplayer.bodybarrels[barID].bulletPenetration = 0;
                  thisplayer.bodybarrels[barID].bulletTimer = 3;
                  thisplayer.bodybarrels[barID].bulletSpeed = 0;
                  thisplayer.bodybarrels[barID].y = 0;
                  thisplayer.bodybarrels[barID].shootingState = "no";
                  thisplayer.bodybarrels[barID].reload = 0;
                  thisplayer.bodybarrels[barID].barrelMoveIncrement = 0;
                  thisplayer.bodybarrels[barID].barrelMoveIncrementY = 0;
                  thisplayer.bodybarrels[barID].shooting = "yes";
                }

                if (thisplayer.bodybarrels[barID].barrelType == "aura") {
                  thisplayer.bodybarrels[barID].spawnedAura = "no";//allow aura to respwan so changes will happen
                }
              }
            }
            catch (err) {
              console.log(err)
            }
          }
        }
        else if (type == "dupbarrel" || type == "dupbb" || type == "dupasset"){
          if (players.hasOwnProperty(client.id)) {
            let thisplayer = players[client.id];
          //duplicate barrel
          let originalID = info[1];
          let newID = info[2];
          try {
              originalID = Number(originalID)
            }
            catch (err) {
              originalID = info[1].toString();
            }
            if (isNaN(originalID)) {//this is the first barrel, whose id is barrelOne and cannot be converted to number
              originalID = info[1].toString();
            }
          try {
              newID = Number(newID)
            }
            catch (err) {
              newID = info[2].toString();
            }
            if (isNaN(newID)) {//this is the first barrel, whose id is barrelOne and cannot be converted to number
              newID = info[2].toString();
            }
            if (type == "dupbarrel" && thisplayer.barrels.hasOwnProperty(originalID)) {
              thisplayer.barrels[newID] = JSON.parse(JSON.stringify(thisplayer.barrels[originalID]))
            }
          else if (type == "dupbb" && thisplayer.bodybarrels.hasOwnProperty(originalID)) {
              thisplayer.bodybarrels[newID] = JSON.parse(JSON.stringify(thisplayer.bodybarrels[originalID]))
            }
          else if (type == "dupasset" && thisplayer.assets.hasOwnProperty(originalID)) {
              thisplayer.assets[newID] = JSON.parse(JSON.stringify(thisplayer.assets[originalID]))
            }
          }
        }
        else if (type == "tankcode") {
          //player wants to import tank code
          //tank code is always in scenexe.io's format
          //convert tank code to scenexe-style object list
          if (players.hasOwnProperty(client.id)) {
            let thisplayer = players[client.id];
            let tankcode = info[1];
            try {
              var buff = Buffer.from(tankcode, 'base64');//convert from base64 to string
              var inflated = pako.inflate(buff);//use pako to inflate the compressed string
              var string = new TextDecoder().decode(inflated);//change from unit8array to string
              //string variable contains player information, but is in scenexe's format. Need to convert to rocketer format
              var playerdata = JSON.parse(string);//convert string to object
              //playerdata contains the following properties:
              //type, version, gadgets, layers, sides, outerSides, outerSize, healthMultiplier, bodyDamageMultiplier, speedMultiplier, bodyCameraSizeMultiplier, maxBodyDrones, bodyUpgradeName, barrels, weaponCameraSizeMultiplier, maxWeaponDrones, weaponUpgradeName, level, size, tankType, radiant, team, overrideTankName
              if (playerdata.type == "full") {//full export
                thisplayer.fovMultiplier = (playerdata.bodyCameraSizeMultiplier + playerdata.weaponCameraSizeMultiplier) / 2;
                thisplayer.maxhealth *= playerdata.healthMultiplier;
                thisplayer.tankType = playerdata.weaponUpgradeName;
                thisplayer.bodyType = playerdata.bodyUpgradeName;
                thisplayer.level = playerdata.level;
                thisplayer.width += thisplayer.level / 2;//estimation of scenexe's player size for level
                thisplayer.height += thisplayer.level / 2;
                thisplayer.width *= playerdata.size;
                thisplayer.height *= playerdata.size;
                thisplayer.speed *= playerdata.speedMultiplier;
                thisplayer.damage *= playerdata.bodyDamageMultiplier;
                if (playerdata.hasOwnProperty("overrideTankName")) {
                  if (playerdata.overrideTankName != "") {
                    //overrideTankName supposed to override both weapon and body names into one name, but rocketer does not support that
                    thisplayer.tankType = playerdata.overrideTankName;
                    thisplayer.bodyType = "";
                  }
                }
                //thisplayer.team = playerdata.team;/scenexe's team is in numbers
                var packet = JSON.stringify(["newNotification",
                  "Importing full body...",
                  "black"]);
                client.send(packet);
              }
              else if (playerdata.type == "weapon") {
                thisplayer.fovMultiplier = playerdata.cameraSizeMultiplier;
                thisplayer.tankType = playerdata.name;
                var packet = JSON.stringify(["newNotification",
                  "Importing weapon tank...",
                  "black"]);
                client.send(packet);
              }
              else if (playerdata.type == "body") {
                thisplayer.fovMultiplier = playerdata.cameraSizeMultiplier;
                thisplayer.bodyType = playerdata.name;
                thisplayer.damage *= playerdata.bodyDamageMultiplier;
                thisplayer.maxhealth *= playerdata.healthMultiplier;
                thisplayer.speed *= playerdata.speedMultiplier;
                var packet = JSON.stringify(["newNotification",
                  "Importing body tank...",
                  "black"]);
                client.send(packet);
              }
              //convert tank sections to gadgets/barrels/layers (WIP)
              function moveStuffOutOfTankSection(gadget) {
                let stuff = gadget.tank;
                for (const bar of stuff.barrels) {
                  //apply section prperties to each barrel
                  bar.offset *= gadget.width;
                  bar.offset += gadget.offsetX;
                  if (!bar.distance) {
                    bar.distance = 0;
                  }
                  bar.distance *= gadget.width;
                  bar.distance += gadget.offsetY;
                  bar.width *= gadget.width;
                  bar.length *= gadget.width;
                  //note: barrels inside tank section have rotation that is in radians!
                  bar.rot = bar.rot / Math.PI * 180;
                  bar.rot += gadget.baseRot;
                  playerdata.barrels.push(bar);//add barrel to actual barrel list
                }
                for (const gad of stuff.gadgets) {
                  if (gad.type == 3) {
                    gad.offsetX *= gadget.width;
                    gad.offsetX += gadget.offsetX;
                    gad.offsetY *= gadget.width;
                    gad.offsetY += gadget.offsetY;
                    gad.width *= gadget.width;
                    if (gadget.hasOwnProperty("baseRot")) {
                      if (!gad.hasOwnProperty("baseRot")) {
                        gad.baseRot = 0;
                      }
                      gad.baseRot += gadget.baseRot;
                    }
                    moveStuffOutOfTankSection(gad)
                  }
                  else {
                    gad.offsetX *= gadget.width;
                    gad.offsetX += gadget.offsetX;
                    gad.offsetY *= gadget.width;
                    gad.offsetY += gadget.offsetY;
                    gad.width *= gadget.width;
                    gad.length *= gadget.width;
                    if (gad.rot) {
                      gad.baseRot = gad.rot / Math.PI * 180;
                      gad.baseRot += gadget.baseRot;
                    }
                    playerdata.gadgets.push(gad);
                  }
                }
                for (const layer of stuff.layers) {
                  layer.offsetX *= gadget.width;
                  layer.offsetX += gadget.offsetX;
                  layer.offsetY *= gadget.width;
                  layer.offsetY += gadget.offsetY;
                  layer.size *= gadget.width;
                  if (layer.rot) {
                    layer.rot = layer.rot / Math.PI * 180;
                    layer.rot += gadget.baseRot;
                  }
                  playerdata.layers.push(layer)
                }
              }
              if (playerdata.gadgets) {
                let sentMessage = "no";
                for (const gadget of playerdata.gadgets) {
                  if (gadget.type == 3) {
                    if (sentMessage == "no") {
                      var packet = JSON.stringify(["newNotification",
                        "Converting tank sections...",
                        "black"]);
                      client.send(packet);
                      var packet = JSON.stringify(["newNotification",
                        "Note: All tank sections are rendered below the body",
                        "black"]);
                      client.send(packet);
                      sentMessage = "yes";
                    }
                    //stuff in tank section
                    moveStuffOutOfTankSection(gadget)
                  }
                }
              }
              //import gadgets (bodybarrels)
              if (playerdata.type == "body" || playerdata.type == "full") {
                if (playerdata.gadgets.length > 200) {
                  var packet = JSON.stringify(["newNotification",
                    "Too many gadgets! Your gadgets will not be imported.",
                    "red"]);
                  client.send(packet);
                }
                else {
                  thisplayer.bodybarrels = {};//reset gadgets
                  for (const gadget of playerdata.gadgets) {
                    if (gadget.type != 3) {//if not a tank section
                      thisplayer.turretBaseSize = gadget.width * 1.5;
                      if (gadget.minDistance) {
                        thisplayer.AIdetectRange = thisplayer.width * gadget.minDistance;
                      }
                      else {//no specified turret detect range
                        thisplayer.AIdetectRange = 600;
                      }
                      let extraAngle = 0;
                      if (gadget.baseRot) {
                        extraAngle = gadget.baseRot;
                      }
                      let bulletLifetime = 50;
                      if (gadget.lifetime) {
                        bulletLifetime = gadget.lifetime * 30;//rough conversion
                      }
                      let bulletRecoil = 0.75;
                      if (gadget.recoil) {
                        bulletRecoil = gadget.recoil;
                      }
                      //figure out what barrel type
                      let barType = "bullet";
                      let auraType = "";
                      if (gadget.type == 0) {//auto-turret
                        //nothing.
                      }
                      else if (gadget.type == 1) {//mounted drone spawner
                        barType = "drone";
                        thisplayer.AImousex = 0;
                        thisplayer.AImousey = 0;
                      }
                      else if (gadget.type == 2) {//aura
                        barType = "aura";
                        if (gadget.subtype == 0) {//damaging aura
                          //nothing.
                        }
                        else if (gadget.subtype == 1) {//healing aura
                          var packet = JSON.stringify(["newNotification",
                            "Healing auras are not supported.",
                            "red"]);
                          client.send(packet);
                        }
                        else if (gadget.subtype == 3) {//repulsion aura
                          var packet = JSON.stringify(["newNotification",
                            "Repulsion auras are not supported.",
                            "red"]);
                          client.send(packet);
                        }
                        else if (gadget.subtype == 4) {//attraction aura
                          auraType = "attraction";
                        }
                        else if (gadget.subtype == 2) {//cosmetic aura
                          var packet = JSON.stringify(["newNotification",
                            "Cosmetic auras are not supported.",
                            "red"]);
                          client.send(packet);
                        }
                      }
                      //gadget type 3 is tank section, which is loaded spearately in code above
                      let barrelID = Math.random();
                      thisplayer.bodybarrels[barrelID] = {
                        barrelWidth: thisplayer.width * gadget.width * 2,
                        barrelHeight: thisplayer.height * gadget.length * 2,
                        additionalAngle: extraAngle,
                        x: thisplayer.width * gadget.offsetX,//add support for gadget.offsetY in the future
                        barrelMoveIncrement: 0,
                        barrelType: barType,
                        reloadRecover: gadget.reload * 10,//rough approximation of conversion from scenexe reload to rocketer reload
                        bulletHealth: 15,//scenexe does not have bullet health
                        bulletDamage: gadget.damage,//weaker than should be i think
                        bulletPenetration: gadget.penetration,//find out conversion later
                        bulletTimer: bulletLifetime,
                        bulletSpeed: gadget.speed * 10,
                        barrelHeightChange: 0,
                        shootingState: "no",
                        reload: 0,
                        recoil: bulletRecoil,
                        shooting: "yes",
                      }
                      let thisBarrel = thisplayer.bodybarrels[barrelID];
                      if (barType == "drone") {
                        thisBarrel.droneLimit = 3;
                        thisBarrel.droneCount = 0;
                        //scenexe's drone spawner dont have height!
                        thisBarrel.barrelHeight = thisplayer.width * gadget.width * 2;
                      }
                      else if (barType == "aura") {
                        //add support for sides, affectBullets, activationTrigger, ignoreMass
                        thisBarrel.auraSize = gadget.radius;
                        thisBarrel.reloadRecover = 1;
                        thisBarrel.bulletHealth = 1000;
                        //thisBarrel.bulletDamage = 0.2;
                        thisBarrel.bulletPenetration = 0;
                        thisBarrel.bulletSpeed = 0;
                        thisBarrel.y = 0;
                        if (gadget.offsetY) {
                          thisBarrel.y = thisplayer.width * gadget.offsetY;
                        }
                        thisBarrel.barrelMoveIncrementY = 0;
                        if (auraType == "attraction") {
                          thisBarrel.auraSpecialty = "attraction";
                          thisBarrel.auraColor = "rgba(87, 85, 163, .3)";
                          thisBarrel.auraOutline = "rgba(75, 73, 143)";
                          if (gadget.hasOwnProperty("alpha")) {
                            thisBarrel.auraColor = "rgba(87, 85, 163, " + gadget.alpha + ")";
                            thisBarrel.auraOutline = "rgba(75, 73, 143, " + gadget.alpha + ")";
                          }
                        }
                        else {
                          thisBarrel.auraColor = "rgba(255,0,0,.15)";
                          thisBarrel.auraOutline = "rgba(255,0,0,.15)";
                          if (gadget.hasOwnProperty("alpha")) {
                            thisBarrel.auraColor = "rgba(255,0,0, " + gadget.alpha + ")";
                            thisBarrel.auraOutline = "rgba(255,0,0, " + gadget.alpha + ")";
                          }
                        }
                        if (gadget.auraColor) {
                          thisBarrel.auraColor = gadget.auraColor;
                          thisBarrel.auraOutline = gadget.auraColor;
                        }
                      }
                    }
                  }
                  //layers aka assets
                  thisplayer.assets = {};
                  for (const layer of playerdata.layers) {
                    let barrelID = Math.random();
                    thisplayer.assets[barrelID] = {
                      type: "under",
                      sides: layer.sides,
                      color: "#383838",
                      outline: "black",
                      outlineThickness: 5,
                      size: layer.size, //in comparison to the player's width
                      angle: layer.rot,
                      x: layer.offsetX,
                      y: layer.offsetY,
                    }
                  }
                }
              }
              if (playerdata.type == "weapon" || playerdata.type == "full") {
                if (playerdata.barrels.length > 200) {
                  var packet = JSON.stringify(["newNotification",
                    "Too many barrels! Your barrels will not be imported.",
                    "red"]);
                  client.send(packet);
                }
                else {
                  thisplayer.barrels = {};//reset barrels
                  for (const barrel of playerdata.barrels) {
                    let bulletLifetime = 50;
                    if (barrel.lifetime) {
                      bulletLifetime = barrel.lifetime * 30;//rough conversion
                    }
                    let bulletRecoil = 0.75;
                    if (barrel.recoil) {
                      bulletRecoil = barrel.recoil;
                    }
                    //figure out what barrel type
                    let barType = "bullet";
                    if (barrel.type == 0) {//cannon

                    }
                    else if (barrel.type == 1) {//drone
                      barType = "drone"
                    }
                    else if (barrel.type == 2) {//trap
                      barType = "trap"
                    }
                    else if (barrel.type == 3) {//minion i think
                      barType = "minion"
                    }
                    else if (barrel.type == 4) {//player spawner
                      var packet = JSON.stringify(["newNotification",
                        "Player spawners are not supported.",
                        "red"]);
                      client.send(packet);
                    }
                    else if (barrel.type == 5) {//polyp spawner
                      var packet = JSON.stringify(["newNotification",
                        "Polyp spawners are not supported.",
                        "red"]);
                      client.send(packet);
                    }
                    else if (barrel.type == 6) {//nothing barrel
                      var packet = JSON.stringify(["newNotification",
                        "Nothing barrels are not supported.",
                        "red"]);
                      client.send(packet);
                    }
                    else if (barrel.type == 7) {//rocket launcher
                      var packet = JSON.stringify(["newNotification",
                        "Rocket launchers are not supported.",
                        "red"]);
                      client.send(packet);
                    }
                    else if (barrel.type == 8) {//custom trap
                      //temporarily default to mines
                      barType = "mine"
                      var packet = JSON.stringify(["newNotification",
                        "Custom traps are not supported. They will be converted to mine traps.",
                        "red"]);
                      client.send(packet);
                    }
                    else if (barrel.type == 9) {//polygon spawner
                      var packet = JSON.stringify(["newNotification",
                        "Polygon spawners are not supported.",
                        "red"]);
                      client.send(packet);
                    }
                    let barrelID = Math.random();
                    thisplayer.barrels[barrelID] = {
                      barrelWidth: thisplayer.width * barrel.width * 2,
                      barrelHeight: thisplayer.height * barrel.length * 2,
                      additionalAngle: barrel.rot,
                      x: thisplayer.width * barrel.offset,//y value in scenexe is barrel.distance
                      barrelMoveIncrement: 0,
                      barrelType: barType,
                      reloadRecover: barrel.reload * 10,//rough approximation of conversion from scenexe reload to rocketer reload
                      bulletHealth: 15,//scenexe does not have bullet health
                      bulletDamage: barrel.damage,//weaker than should be i think
                      bulletPenetration: barrel.penetration,//find out conversion later
                      bulletTimer: bulletLifetime,
                      bulletSpeed: barrel.speed * 10,
                      barrelHeightChange: 0,
                      shootingState: "no",
                      reload: barrel.delay * 1000 / 30,//this is smething not customizable in rocketer tank editor (delay before tank starts shooting) (time 1000 to convert from seond to millisecond, then divide by 30 because each game loop is 30ms)
                      recoil: bulletRecoil,
                      shooting: "yes",
                    }
                    let thisBarrel = thisplayer.barrels[barrelID];
                    if (barType == "drone") {
                      thisBarrel.droneLimit = 3;
                      thisBarrel.droneCount = 0;
                      thisplayer.mousex = 0;
                      thisplayer.mousey = 0;
                    }
                    else if (barType == "trap") {
                      thisBarrel.trapDistBeforeStop = 10;
                    }
                    else if (barType == "mine") {
                      thisBarrel.trapDistBeforeStop = 10;
                      thisBarrel.haveAI = "yes";
                      thisBarrel.AIdetectRange = 450;
                      thisBarrel.barrels = {
                        barrelOne: {
                          barrelWidth: 5,
                          barrelHeight: 12.5,
                          additionalAngle: 0,
                          x: 0,
                          barrelMoveIncrement: 0,
                          barrelType: "bullet",
                          reloadRecover: 15,
                          bulletHealth: 20,
                          bulletDamage: 0.25,
                          bulletPenetration: 2,
                          bulletTimer: 30,
                          bulletSpeed: 20,
                          barrelHeightChange: 0,
                          shootingState: "no",
                          reload: 0, //must be zero, for the weapon reload, change the reloadRecover property above
                          recoil: 0.5,
                        },
                      };
                    }
                    else if (barType == "minion") {
                      let minionImport = barrel.minion;
                      let minionBarrel = minionImport.barrels;//but rocketer only support minion bullet barrel for now. Add support for other types of barrels, and gadgets and layers for minion too
                      thisBarrel.droneLimit = 5;
                      thisBarrel.droneCount = 0;
                      thisBarrel.minDist = 200;
                      thisBarrel.bulletTimer = 1000;
                      thisplayer.mousex = 0;
                      thisplayer.mousey = 0;
                      thisBarrel.barrels = {};
                      for (const thisminionbarrel of minionBarrel) {
                        let minionBulletSpeed = 15;
                        if (thisminionbarrel.speed) {
                          minionBulletSpeed = thisminionbarrel.speed * 10;
                        }
                        let minionBulletPenetration = 2;
                        if (thisminionbarrel.penetration) {
                          minionBulletPenetration = thisminionbarrel.penetration
                        }
                        let minionBulletRecoil = 0.75;
                        if (thisminionbarrel.recoil) {
                          minionBulletRecoil = thisminionbarrel.recoil
                        }
                        let minionBulletLifetime = 30;
                        if (thisminionbarrel.lifetime) {
                          minionBulletLifetime = thisminionbarrel.lifetime
                        }
                        let minionBodyWidth = thisBarrel.barrelWidth / 2;
                        let barrelID = Math.random();
                        thisBarrel.barrels[barrelID] = {
                          barrelWidth: minionBodyWidth * thisminionbarrel.width * 2,
                          barrelHeight: minionBodyWidth * thisminionbarrel.length * 2,
                          additionalAngle: thisminionbarrel.rot,
                          x: minionBodyWidth * thisminionbarrel.offset,//y value in scenexe is barrel.distance
                          barrelMoveIncrement: 0,
                          barrelType: "bullet",
                          reloadRecover: thisminionbarrel.reload * 10,//rough approximation of conversion from scenexe reload to rocketer reload
                          bulletHealth: 15,//scenexe does not have bullet health
                          bulletDamage: thisminionbarrel.damage,//weaker than should be i think
                          bulletPenetration: minionBulletPenetration,//find out conversion later
                          bulletTimer: minionBulletLifetime,
                          bulletSpeed: minionBulletSpeed,
                          barrelHeightChange: 0,
                          shootingState: "no",
                          reload: thisminionbarrel.delay,//this is smething not customizable in rocketer tank editor (delay before tank starts shooting)
                          recoil: minionBulletRecoil,
                        };
                      }
                    }
                  }
                }
              }
              //send the tank to the client so the client can create the editing UI
              var packet = JSON.stringify(["editedTank", thisplayer]);
              client.send(packet);
            }
            catch (err) {//scenexe compress twice when export to make it shorter
              console.log(err)
              var packet = JSON.stringify(["newNotification",
                "An error occured: " + err.toString(),
                "red"]);
              client.send(packet);
            }
          }
        }
      }
    })

    client.on('close', () => {//client disconnected
      //remove player
      console.log("A user disconnected.");
      if (players.hasOwnProperty(client.id)) {
        //check if client exists in arena
        addDeadObject(players, client.id, "player");
        delete players[client.id];
      }
      //remove client ip from list (doesnt work cuz wrong ip, will fix later)
      var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress; //ip of proxies
      if (clientIP.hasOwnProperty(ip)) {//ip in the list
        if (clientIP[ip][0] == client.id) {//person in the ip list is this person
          clientIP[ip].splice(0, 1);//remove from ip list
          console.log("removed someone's ip")
        }
        else if (clientIP[ip][1] == client.id) {//person in the ip list is this person
          clientIP[ip].splice(1, 1);//remove from ip list
          console.log("removed someone's ip")
        }
        console.log(clientIP)
      } else {
        console.log("MISSING IP IN LIST!!!!");
      }
    })
  })
  wss.on('listening', () => {
    console.log('listening on 3000')
  })
  wss.broadcast = function broadcast(msg) {//sen something to all connected users
    wss.clients.forEach(function each(client) {
      client.send(msg);
    });
  };
  //wss.broadcast("notification","hi");//send to everyone

  const listener = server.listen(process.env.PORT || 3000, function() {
    //http.listen(process.env.PORT || 3000, function () {
    console.log("listening on *:3000");
    // start the game
    var start = "";
    function pingAndPlayerCount() {//this runs the exact same thing for all dimensions
      start = clock(); //get time now to calculate code execution time later
      //calculate Delta time
      //all movement must *delta. Game loop occur every 30ms, and movement will be reduced if server runtime is more than 30ms. Need delta time to move object more when server lags more.
      currentLoopTime = Date.now();
      if (prevLoopTime == 0) { //if this is first loop
        delta = 1;
      } else {
        timeLapsed = currentLoopTime - prevLoopTime;
        delta = timeLapsed / 30;
        if (delta < 1) {
          delta = 1; //sometimes due to calculation precision, delta is 0.9
        }
      }
      prevLoopTime = currentLoopTime;
      if (timeSinceLastPlayerCount > maxtime) {
        if (prevplayercount != Object.keys(players).length) {
          var packetToMainServer = ["gpc", Object.keys(players).length, process.env.teleportingPassword, gamemode];
          axios.post(mainserverURL, packetToMainServer)
            .then(function(response) {
              console.log("sent gpc")
            })
            .catch(function(error) {
              console.log("Connectivity error");
            });
          prevplayercount = Object.keys(players).length;
          timeSinceLastPlayerCount = 0;
          //broadcast new player count to everyone
          if (gamemode != "cr" && gamemode != "cavern") {
            var packet = JSON.stringify(["pc", Object.keys(players).length]);
            wss.broadcast(packet);
          }
        }
      }
      else {
        timeSinceLastPlayerCount++;
      }
    }
    if (gamemode == "arena") {
      setInterval(function() {
        pingAndPlayerCount()
        //send stuff to clients
        sendStuffToArenaClient();
        //actual game stuff
        gameLoop();
        duration = clock(start); //calculate code execution time
      }, 30); //game loop running every 30ms
    }
    else if (gamemode == "2tdm") {
      setInterval(function() {
        pingAndPlayerCount()
        //send stuff to clients
        sendStuffTo2tdmClient();
        //actual game stuff
        gameLoop2tdm();
        duration = clock(start); //calculate code execution time
      }, 30); //game loop running every 30ms
    }
    else if (gamemode == "editor") {
      setInterval(function() {
        pingAndPlayerCount()
        //send stuff to clients
        sendStuffToEditorClient();
        //actual game stuff
        editorGameLoop();
        duration = clock(start); //calculate code execution time
      }, 30); //game loop running every 30ms
    }
    else if (gamemode == "dune") {
      setInterval(function() {
        pingAndPlayerCount()
        //send stuff to clients
        sendStuffToDuneClient();
        //actual game stuff
        gameLoopDune();
        duration = clock(start); //calculate code execution time
      }, 30); //game loop running every 30ms
    }
    else if (gamemode == "cavern") {
      setInterval(function() {
        pingAndPlayerCount()
        //send stuff to clients
        sendStuffToCavernClient();
        //actual game stuff
        gameCavernLoop();
        duration = clock(start); //calculate code execution time
      }, 30); //game loop running every 30ms
    }
    else if (gamemode == "sanc") {
      setInterval(function() {
        pingAndPlayerCount()
        //send stuff to clients
        sendStuffToSancClient();
        //actual game stuff
        gameSancLoop();
        duration = clock(start); //calculate code execution time
      }, 30); //game loop running every 30ms
    }
    else if (gamemode == "cr") {
      setInterval(function() {
        pingAndPlayerCount()
        //send stuff to clients
        sendStuffToCrossroadsClient();
        //actual game stuff
        gameCrossroadsLoop();
        duration = clock(start); //calculate code execution time
      }, 30); //game loop running every 30ms
    }
  });
})();
