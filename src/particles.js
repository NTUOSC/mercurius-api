// Little Canvas things
var canvas, ctx;

// Set Canvas to be window size
window.addEventListener('resize', function() {
  console.log('resize');
  recalcMetrics();
});

// Configuration, Play with these
var config = {
  particleNumber: 400,
  maxParticleSize: 10,
  maxSpeed: 30,
  colorVariation: 100
};

// Colors
var colorPalette = {
    bg: {r: 12, g: 9, b: 29},
    matter: [
      {r:128,g:72,b:255},
      {r:160,g:36,b:255},
      {r:120,g:120,b:216},
      {r:96,g:96,b:255}
    ]
};

// Some Variables hanging out
var particles = [],
    centerX,
    centerY,
    drawBg;

// Draws the background for the canvas, because space
drawBg = function (ctx, color) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ctx.fillStyle = "rgb(" + color.r + "," + color.g + "," + color.b + ")";
    // ctx.fillRect(0,0,canvas.width,canvas.height);
};

// Particle Constructor
var Particle = function (x, y) {
    // X Coordinate
    this.x = x || Math.round(Math.random() * canvas.width);
    // Y Coordinate
    this.y = y || Math.round(Math.random() * canvas.height);
    // Radius of the space dust
    this.r = Math.ceil(Math.random() * config.maxParticleSize);
    // Color of the rock, given some randomness
    this.c = colorVariation(colorPalette.matter[Math.floor(Math.random() * colorPalette.matter.length)],true );
    // Speed of which the rock travels
    this.s = Math.pow(Math.ceil(Math.random() * config.maxSpeed), .7);
    // Direction the Rock flies
    this.d = Math.round(Math.random() * 360);
};

// Provides some nice color variation
// Accepts an rgba object
// returns a modified rgba object or a rgba string if true is passed in for argument 2
var colorVariation = function (color, returnString) {
    var r,g,b,a, variation;
    r = Math.round(((Math.random() * config.colorVariation) - (config.colorVariation/2)) + color.r);
    g = Math.round(((Math.random() * config.colorVariation) - (config.colorVariation/2)) + color.g);
    b = Math.round(((Math.random() * config.colorVariation) - (config.colorVariation/2)) + color.b);
    a = Math.random();
    if (returnString) {
        return "rgba(" + r + "," + g + "," + b + "," + a + ")";
    } else {
        return {r,g,b,a};
    }
};

// Used to find the rocks next point in space, accounting for speed and direction
var updateParticleModel = function (p) {
    var a = 180 - (p.d + 90); // find the 3rd angle
    p.d > 0 && p.d < 180 ? p.x += p.s * Math.sin(p.d) / Math.sin(p.s) : p.x -= p.s * Math.sin(p.d) / Math.sin(p.s);
    p.d > 90 && p.d < 270 ? p.y += p.s * Math.sin(a) / Math.sin(p.s) : p.y -= p.s * Math.sin(a) / Math.sin(p.s);
    return p;
};

// Just the function that physically draws the particles
// Physically? sure why not, physically.
var drawParticle = function (x, y, r, c) {
    ctx.beginPath();
    ctx.fillStyle = c;
    ctx.arc(x, y, r, 0, 2*Math.PI, false);
    ctx.fill();
    ctx.closePath();
};

// Remove particles that aren't on the canvas
var cleanUpArray = function () {
    var len = particles.length;
    particles = particles.filter((p) => {
      return (p.x > -100 && p.y > -100);
    });
    var lenNew = particles.length;
    console.log('GC: len=' + len + ' removed=' + (len - lenNew));
};


var initParticles = function (numParticles, x, y) {
  while (particles.length > 3000)
    particles.splice(0, 100);

  for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle(x, y));
    }
    particles.forEach((p) => {
        drawParticle(p.x, p.y, p.r, p.c);
    });
};

// That thing
window.requestAnimFrame = (function() {
  return window.requestAnimationFrame ||
     window.webkitRequestAnimationFrame ||
     window.mozRequestAnimationFrame ||
     function(callback) {
        window.setTimeout(callback, 1000 / 60);
     };
})();


// Our Frame function
var frame = function () {
  // Draw background first
  drawBg(ctx, colorPalette.bg);
  // Update Particle models to new position
  particles.map((p) => {
    return updateParticleModel(p);
  });
  // Draw em'
  particles.forEach((p) => {
      drawParticle(p.x, p.y, p.r, p.c);
  });
  // Play the same song? Ok!
  window.requestAnimFrame(frame);
};

// hackky
function setCanvas(c) {
  canvas = document.querySelector(c);
  console.log(canvas);
  ctx = canvas.getContext('2d');
  recalcMetrics();
}

function recalcMetrics() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  centerX = canvas.width / 2;
  centerY = canvas.height / 2;
}

// First particle explosion
function init(particleNum) {
  var n = particleNum || config.particleNumber;
  initParticles(n);

  // First Frame
  frame();
}

function burstRandom() {
  var x = Math.random() * window.innerWidth,
      y = Math.random() * window.innerHeight;
  cleanUpArray();
  initParticles(config.particleNumber, x, y);
}

module.exports = {
  setCanvas: setCanvas,
  config: config,
  colorPalette: colorPalette,
  init: init,
  burstRandom: burstRandom
};
