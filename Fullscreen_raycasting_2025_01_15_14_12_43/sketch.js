let walls = [];
let particle;
let colors = [];
let knikpuntYLeft, knikpuntYRight;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Driehoekig prisma met juiste verhoudingen
  let baseX = 600;
  let baseY = 600;
  let height = 200;
  let width = height * sqrt(2);

  // Definieer de boundaries van het prisma met knikpunten
  walls.push(new Boundary(baseX, baseY, baseX + width, baseY)); // Basis
  walls.push(new Boundary(baseX, baseY, baseX + width / 2, baseY - height)); // Linkerzijde
  walls.push(new Boundary(baseX + width / 2, baseY - height, baseX + width, baseY)); // Rechterzijde

  particle = new Particle();

  // Kleuren voor de gesplitste stralen
  colors = [
    color(255, 0, 0, 150),    // Rood
    color(255, 127, 0, 150),  // Oranje
    color(255, 255, 0, 150),  // Geel
    color(0, 255, 0, 150),    // Groen
    color(0, 0, 255, 150),    // Blauw
    color(75, 0, 130, 150),   // Indigo
    color(148, 0, 211, 150)   // Violet
  ];

  noCursor();
}

function draw() {
  background(0);

  // Dynamisch knikpunt instellen op basis van muispositie voor elke boundary
  knikpuntYLeft = map(mouseY, 0, height, 300, 700);  // Knikpunt voor de linker boundary
  knikpuntYRight = map(mouseY, 0, height, 300, 700); // Knikpunt voor de rechter boundary
 
   // Simulate inner glow by layering smaller, transparent lighter blue triangles
  noFill();
  stroke(75, 150, 255, 15); // Lighter blue with low opacity
  strokeWeight(8);

  // Draw multiple smaller triangles for inner glow
  for (let i = 0; i < 10; i++) {
    let offset = i * 1; // Gradual reduction in size
    beginShape();
    vertex(600 + offset, 600 - offset); // Base left
    vertex(600 + 200 * sqrt(2) / 2, 600 - 200 + offset); // Top
    vertex(600 + 200 * sqrt(2) - offset, 600 - offset); // Base right
    endShape(CLOSE);
  }

  // Draw the original triangle on top
  for (let wall of walls) {
    wall.show();
  }


  // Update en teken de straal
  particle.update(mouseX, mouseY);
  particle.show();
  particle.emitRay(walls, knikpuntYLeft, knikpuntYRight); // Geef beide knikpunten door voor interactie
}

// Boundary-klasse
class Boundary {
  constructor(x1, y1, x2, y2) {
    this.a = createVector(x1, y1);
    this.b = createVector(x2, y2);
  }

  show() {
    stroke(255);
    strokeWeight(2);
    line(this.a.x, this.a.y, this.b.x, this.b.y);
  }

  // Bereken het rotatiepunt voor elke boundary
  getRotationPoint() {
    // Het rotatiepunt is afhankelijk van de muispositie
    let rotationPoint = createVector((this.a.x + this.b.x) / 2, (this.a.y + this.b.y) / 2);
    return rotationPoint;
  }
}

// Particle-klasse
class Particle {
  constructor() {
    this.pos = createVector(100, 500); // Beginpositie
    this.rays = [new Ray(this.pos, 0)]; // Eerste rechte straal
    this.secondaryRays = []; // Brede witte stralen
  }

  update(x, y) {
    this.pos.set(x, y);
  }

  emitRay(walls, knikpuntYLeft, knikpuntYRight) {
    let primaryHit = false;
    this.secondaryRays = []; // Reset de secundaire stralen

    // Verwerk de primaire straal
    for (let ray of this.rays) {
      let closest = null;
      let record = Infinity;

      // Zoek de dichtstbijzijnde intersectie
      for (let wall of walls) {
        const pt = ray.cast(wall);
        if (pt) {
          const d = p5.Vector.dist(this.pos, pt);
          if (d < record) {
            record = d;
            closest = { point: pt, wall: wall };
          }
        }
      }

      // Teken de straal tot het intersectiepunt en genereer secundaire stralen
      if (closest) {
        primaryHit = true;
        const { point, wall } = closest;

        // Teken de witte straal tot het eerste intersectiepunt
        stroke(255);
        strokeWeight(2);
        line(this.pos.x, this.pos.y, point.x, point.y);

        // Pas de straalrichting aan, afhankelijk van het rotatiepunt van de boundary
        let rotationPoint = wall.getRotationPoint();
        let angleChange = p5.Vector.sub(rotationPoint, point).heading();  // Bereken de hoek naar het rotatiepunt
        let angleOffset = map(mouseY, 0, height, -PI / 8, PI / 8); // Dynamische aanpassing

        // Breking bij het eerste rotatiepunt
        for (let a = -5; a <= 5; a += 0.5) {
          let dir = p5.Vector.sub(point, this.pos).normalize().rotate(angleChange + angleOffset + radians(a));
          this.secondaryRays.push(new Ray(point, dir.heading()));
        }
      }
    }

    // Verwerk de secundaire (brede witte) stralen
    if (primaryHit) {
      for (let ray of this.secondaryRays) {
        let closest = null;
        let record = Infinity;

        // Zoek de dichtstbijzijnde intersectie voor de secundaire stralen
        for (let wall of walls) {
          const pt = ray.cast(wall);
          if (pt) {
            const d = p5.Vector.dist(ray.pos, pt);
            if (d < record) {
              record = d;
              closest = { point: pt, wall: wall };
            }
          }
        }

        // Teken de secundaire stralen en splits deze in kleuren
        if (closest) {
          const { point, wall } = closest;

          // Teken de witte straal binnen het prisma
          stroke(255);
          strokeWeight(2);
          line(ray.pos.x, ray.pos.y, point.x, point.y);

          // De rotatie van de gekleurde stralen na de reflectie
          for (let i = 0; i < colors.length; i++) {
            let angleOffset = map(i, 0, colors.length - 1, -PI / 24, PI / 24); // Kleine hoekverdeling
            let dir = p5.Vector.fromAngle(ray.angle + angleOffset);
            dir.setMag(1000);

            // Dynamische rotatie van de gekleurde stralen afhankelijk van het knikpunt (rotatiepunt)
            let rotationPoint = wall.getRotationPoint();
            let dynamicRotation = p5.Vector.sub(rotationPoint, point).heading(); // Bereken de hoek naar het rotatiepunt

            // Pas de gekleurde stralen verder aan
            stroke(colors[i]);
            strokeWeight(4);
            line(point.x, point.y, point.x + dir.x + dynamicRotation, point.y + dir.y + dynamicRotation);

            // Dynamische tweede reflectiepunt voor de gekleurde stralen
            let secondaryRotation = 0;
            secondaryRotation = map(mouseY, 0, height, -PI / 16, PI / 16); // Kleur reflectie dynamisch op basis van muis

            // Pas de gekleurde stralen verder aan
            dir.rotate(secondaryRotation);
            line(point.x, point.y, point.x + dir.x, point.y + dir.y);
          }
        }
      }
    }
  }

  show() {
    fill(255);
    noStroke();
    ellipse(this.pos.x, this.pos.y, 4);

    for (let ray of this.rays) {
      ray.show();
    }
    for (let ray of this.secondaryRays) {
      ray.show();
    }
  }
}

// Ray-klasse
class Ray {
  constructor(pos, angle) {
    this.pos = pos.copy();
    this.angle = angle;
    this.dir = p5.Vector.fromAngle(angle);
  }

  show() {
    stroke(255);
    push();
    translate(this.pos.x, this.pos.y);
    line(0, 0, this.dir.x * 10, this.dir.y * 10);
    pop();
  }

  cast(wall) {
    const x1 = wall.a.x;
    const y1 = wall.a.y;
    const x2 = wall.b.x;
    const y2 = wall.b.y;
    const x3 = this.pos.x;
    const y3 = this.pos.y;
    const x4 = this.pos.x + this.dir.x;
    const y4 = this.pos.y + this.dir.y;

    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (den == 0) return;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;

    if (t > 0 && t < 1 && u > 0) {
      const pt = createVector();
      pt.x = x1 + t * (x2 - x1);
      pt.y = y1 + t * (y2 - y1);
      return pt;
    } else {
      return;
    }
  }
}