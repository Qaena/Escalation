const $ = el => document.querySelector(el);

const win = $("#win");
const ctx = win.getContext("2d");
const WHITE = 0, BLACK = 1;
const KING = 0, ARCHER = 1, PAWN = 2;
const LAVA = 0, WALL = 1, CLIFF = 2;
const ROW = 0, COL = 1;
const board = {
  squares: [],
  squareSize: 32,
  spaceAround: 64,
  leftSpace: 128,
  rowNum: 9,
  colNum: 9,
  units: [],
  effects: [],
  bg: null
};
const unitOffsetY = -6;
const img = {};

class Square {
  constructor(row, col) {
    this.row = row;
    this.col = col;
    this.x = ((col - 1) * board.squareSize) + board.spaceAround + board.leftSpace;
    this.y = ((row - 1) * board.squareSize) + board.spaceAround;
    this.hovered = false;
    this.bg = row%2 != col%2 ? img.floorLight : img.floorDark;
    this.effect = null;
    this.sameEffect = {
      left: false,
      right: false,
      top: false,
      bottom: false
    };
    this.effectBg = null;
  }

  redraw() {
    ctx.clearRect(this.x, this.y, board.squareSize - 1, board.squareSize - 1);

    ctx.drawImage(this.effectBg ? this.effectBg : this.bg, this.x, this.y, board.squareSize, board.squareSize);

    if (this.hovered) {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = "green";
      ctx.fillRect(this.x, this.y, board.squareSize, board.squareSize);
      ctx.globalAlpha = 1.0;
    }
  }

  left() {
    let sq = getSquares({row: this.row, col: this.col - 1});
    return sq.length === 0 ? null : sq[0];
  }

  right() {
    let sq = getSquares({row: this.row, col: this.col + 1});
    return sq.length === 0 ? null : sq[0];
  }

  top() {
    let sq = getSquares({row: this.row - 1, col: this.col});
    return sq.length === 0 ? null : sq[0];
  }

  bottom() {
    let sq = getSquares({row: this.row + 1, col: this.col});
    return sq.length === 0 ? null : sq[0];
  }

  click() {
    console.log(`(${this.row}, ${this.col}) clicked`)
  }
}

class Unit {
  constructor(side, type, row, col) {
    this.row = row;
    this.col = col;
    this.side = side;
    this.type = type;

    let imageStr = "unit" + (side === BLACK ? "Black" : "White");
    switch(type) {
      case KING:
        imageStr += "King";
        break;
      case ARCHER:
        imageStr += "Archer";
        break;
      case PAWN:
        imageStr += "Pawn";
        break;
    }
    this.image = img[imageStr];
    
    this.offsetX = (board.squareSize - this.image.width) / 2;
    this.offsetY = ((board.squareSize - this.image.height) + unitOffsetY);
    this.x = ((col - 1) * board.squareSize) + board.spaceAround + board.leftSpace + this.offsetX;
    this.y = ((row - 1) * board.squareSize) + board.spaceAround + this.offsetY;
  }

  redraw() {
    ctx.save();

    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.ellipse(this.x - this.offsetX + (board.squareSize / 2), this.y - this.offsetY + (board.squareSize * .75), board.squareSize / 2.25, board.squareSize / 5, 0, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();

    ctx.drawImage(this.image, this.x, this.y);
  }
}

class Effect {
  constructor(num, rowOrCol, type) {
    this.level = 1;
    this.num = num;
    this.rowOrCol = rowOrCol;
    this.type = type;
  }

  apply() {
    let potentialAffected = getSquares({[this.rowOrCol ? "col" : "row"]: this.num});

    switch(this.level) {
      case 1:
        potentialAffected = potentialAffected.filter(filterSq => {
            return (filterSq[this.rowOrCol ? "row" : "col"] >= 4 && filterSq[this.rowOrCol ? "row" : "col"] <= 6);
          }
        );
        break;
      case 2:
        potentialAffected = potentialAffected.filter(filterSq => {
            return (filterSq[this.rowOrCol ? "row" : "col"] <= 2) ||
              (filterSq[this.rowOrCol ? "row" : "col"] >= 4 && filterSq[this.rowOrCol ? "row" : "col"] <= 6) ||
              (filterSq[this.rowOrCol ? "row" : "col"] >= 8);
          }
        );
        break;
    }
    
    potentialAffected.forEach(sq => {
      sq.effect = this.type;

      
      let compSq = sq.left();
      if (compSq) {
        if (compSq.effect === this.type) {
          sq.sameEffect.left = true;
          compSq.sameEffect.right = true;
        }
      }
      compSq = sq.right();
      if (compSq) {
        if (compSq.effect === this.type) {
          sq.sameEffect.right = true;
          compSq.sameEffect.left = true;
        }
      }
      compSq = sq.top();
      if (compSq) {
        if (compSq.effect === this.type) {
          sq.sameEffect.top = true;
          compSq.sameEffect.bottom = true;
        }
      }
      compSq = sq.bottom();
      if (compSq) {
        if (compSq.effect === this.type) {
          sq.sameEffect.bottom = true;
          compSq.sameEffect.top = true;
        }
      }
    });
  }

  click() {
    console.log(`(${this.row}, ${this.col}) clicked`)
  }
}

function loadImages(names, callback) {
  let n, name,
      count  = names.length,
      onload = function() { if (--count === 0) callback(); };

  for(n = 0 ; n < names.length ; n++) {
    name = names[n];
    img[name] = document.createElement('img');
    img[name].addEventListener('load', onload);
    img[name].src = "img/" + name + ".png";
  }
}

function init() {
  for (let r = 1; r <= board.rowNum; r++) {
    for (let c = 1; c <= board.colNum; c++) {
      board.squares.push(new Square(r, c));
    }
  }

  addUnit(WHITE, KING, 1, 5);
  addUnit(WHITE, ARCHER, 2, 3);
  addUnit(WHITE, ARCHER, 2, 5);
  addUnit(WHITE, ARCHER, 2, 7);
  addUnit(WHITE, PAWN, 3, 3);
  addUnit(WHITE, PAWN, 3, 4);
  addUnit(WHITE, PAWN, 3, 5);
  addUnit(WHITE, PAWN, 3, 6);
  addUnit(WHITE, PAWN, 3, 7);

  addUnit(BLACK, KING, 9, 5);
  addUnit(BLACK, ARCHER, 8, 3);
  addUnit(BLACK, ARCHER, 8, 5);
  addUnit(BLACK, ARCHER, 8, 7);
  addUnit(BLACK, PAWN, 7, 3);
  addUnit(BLACK, PAWN, 7, 4);
  addUnit(BLACK, PAWN, 7, 5);
  addUnit(BLACK, PAWN, 7, 6);
  addUnit(BLACK, PAWN, 7, 7);

  redrawAll();

  win.onmousemove = function(e) {
    // important: correct mouse position:
    let rect = this.getBoundingClientRect(),
        x = e.clientX - rect.left,
        y = e.clientY - rect.top,
        i = 0, square, oldVal,
        needToRedraw = false;
    
    while(square = board.squares[i++]) {
      ctx.beginPath();
      ctx.rect(square.x, square.y, board.squareSize, board.squareSize);    
      
      oldVal = square.hovered;
      square.hovered = ctx.isPointInPath(x, y);

      if (square.hovered != oldVal) needToRedraw = true;
    }

    if (needToRedraw) redrawAll(true);
  };

  win.addEventListener('click', () => {
    let hoveredSquare = getSquares({hovered: true})[0];
    
    if (hoveredSquare) hoveredSquare.click();
 });
}

function redrawAll(bgRefresh = false) {
  console.log("redrew");
  ctx.clearRect(0, 0, win.width, win.height)

  let i = 0, square, unit;
  let tlSquare = getSquares({row: 1, col: 1})[0];

  if (board.bg && !bgRefresh) {
    ctx.putImageData(board.bg, tlSquare.x, tlSquare.y);
  } else {
    while (square = board.squares[i++]) {
      square.redraw();
    }

    board.bg = ctx.getImageData(tlSquare.x, tlSquare.y, board.rowNum * board.squareSize, board.colNum * board.squareSize);
  }
  
  //border
  ctx.lineWidth = 2;
  ctx.strokeStyle = "black";
  ctx.strokeRect(
    board.spaceAround + board.leftSpace - 1,
    board.spaceAround - 1,
    board.rowNum * board.squareSize + 2,
    board.colNum * board.squareSize + 2);
  ctx.strokeRect(
    board.spaceAround + board.leftSpace - 5,
    board.spaceAround - 5,
    board.rowNum * board.squareSize + 10,
    board.colNum * board.squareSize + 10);

  i = 0;
  while (unit = board.units[i++]) {
    unit.redraw();
  }
}

function addUnit(side, type, row, col) {
  board.units.push(new Unit(side, type, row, col));
  sortUnits();
}

function addEffect(num, rowOrCol, type) {
  board.effects.push(new Effect(num, rowOrCol, type));
  sortEffects();
  refreshEffects();
}

function sortUnits() {
  board.units.sort((a, b) => {
    if (a.row < b.row) {
      return -1;
    } else if (a.row > b.row) {
      return 1;
    } else {
      if (a.col < b.col) {
        return -1;
      } else {
        return 1;
      }
    }
  });
}

function sortEffects() {
  board.effects.sort((a, b) => {
    if (a.type < b.type) {
      return -1;
    } else if (a.type > b.type) {
      return 1;
    } else {
      if (a.num < b.num) {
        return -1;
      } else {
        return 1;
      }
    }
  });
}

function refreshEffects() {
  getSquares().forEach(sq => {
    sq.effect = null;
    sq.effectBg = null;
  });
  getEffects().forEach(ef => ef.apply());
  updateImages();
  redrawAll(true);
}

function updateImages() {
  getSquaresInverse({effect: null}).forEach(sq => {
    let imageStr = "floor";
    switch(sq.effect) {
      case LAVA:
        imageStr += "Lava";
        if (sq.sameEffect.top) imageStr += "Bottom";
        break;
      case WALL:
        imageStr += "Wall";
        if (!sq.sameEffect.left) {
          if (!sq.sameEffect.right) {
            imageStr += "Solo";
          } else {
            imageStr += "Left";
          }
        } else {
          if (!sq.sameEffect.right) {
            imageStr += "Right";
          }
        }
        break;
      case CLIFF:
        imageStr += "Cliff";
        break;
    }
    sq.effectBg = img[imageStr];
  });
}

function getSquares(specs) {
  return getObjectsFromPropertySpecs(board.squares, specs);
}

function getSquaresInverse(specs) {
  return getObjectsFromInversePropertySpecs(board.squares, specs);
}

function getUnits(specs) {
  return getObjectsFromPropertySpecs(board.units, specs);
}

function getEffects(specs) {
  return getObjectsFromPropertySpecs(board.effects, specs);
}

function getObjectsFromPropertySpecs(collection, specs) {
  if (!specs) {
    return collection;
  }

  return collection.filter(item => {
    let match = true;
    let prop;

    Object.keys(specs).forEach(prop => {
      if (specs[prop] != item[prop]) match = false;
    });

    return match;
  });
}

function getObjectsFromInversePropertySpecs(collection, specs) {
  if (!specs) {
    return collection;
  }

  return collection.filter(item => {
    let match = true;
    let prop;

    Object.keys(specs).forEach(prop => {
      if (specs[prop] === item[prop]) match = false;
    });

    return match;
  });
}