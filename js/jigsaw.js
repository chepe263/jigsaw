/*global Base, window, JigsawPiece, Vector, JazSvg */

;(function($) {
  "use strict";
  var AUTOMATIC  = 'auto',
      LIKE_IMAGE = 'as image',

      actualZIndex = 1;

  var Jigsaw = Base.extend({
    constructor: function(imageUrl, config) {
      this.config = $.extend({
        width: AUTOMATIC,
        height: AUTOMATIC,
        puzzleWidth: LIKE_IMAGE,
        puzzleHeight: LIKE_IMAGE,
        piecesX: 10,
        piecesY: 10,
        mergeTolerance: 20,
        pieceBorderColor: 'rgba(0,0,0,0.4)',
        dropShadow: false,
        fitImageTo: window
      }, config);
      this._pieces = [];

      this._loadImage(imageUrl);
    },

    _loadImage: function(url) {
      var self = this,
          image = document.createElement('img');
      image.src = url;
      image.onload = function() {
        self._onImageLoaded();
      };
      this._image = image;
    },

    _createSVG: function() {
      var config      = this.config,
          svg = new JazSvg({
            height: window.innerHeight,
            width: window.innerWidth
          }),
          defs = svg.defs();
      $(svg.element)
        .css({
          position: 'absolute',
          left: 0,
          top: 0
        })
        .appendTo('body');
      svg.pattern(defs, {
        id: "puzzleimage",
        patternUnits: "userSpaceOnUse", //objectBoundingBox
        width: config.puzzleWidth,
        height: config.puzzleHeight,
        x: 0,
        y: 0
      }, svg.image({
        x: 0,
        y: 0,
        width: config.puzzleWidth,
        height: config.puzzleHeight,
        'href': this._image.src
      }));
      this.svg = svg;
      this.defs = defs;
      if (config.dropShadow) {
        this._createShadow();
      }
    },

    _createPieces: function() {
      var pieceNumber = 0,
          config      = this.config,
          pieceWidth  = config.puzzleWidth  / config.piecesX,
          pieceHeight = config.puzzleHeight / config.piecesY;

      for (var y=0,ly=this.config.piecesY; y<ly; ++y) {
        for (var x=0,lx=this.config.piecesX; x<lx; ++x) {
          this._pieces.push(new JigsawPiece(pieceNumber++, {
            image: this._image,
            width: pieceWidth,
            height: pieceHeight,
            svg: this.svg,
            positionInImage: new Vector(pieceWidth * x, pieceHeight * y),
            pieceBorderColor: config.pieceBorderColor,
            scale: this.scale || 1,

            right: x===lx-1 ? JigsawPiece.PLAIN : JigsawPiece.OUTSIDE,
            left: x===0 ? JigsawPiece.PLAIN : JigsawPiece.INSIDE,
            bottom: y===ly-1 ? JigsawPiece.PLAIN : JigsawPiece.OUTSIDE,
            top: y===0 ? JigsawPiece.PLAIN : JigsawPiece.INSIDE
          }));
        }
      }

      this._setNeighbors();
    },

    _setNeighbors: function() {
      var self    = this,
          piecesX = this.config.piecesX,
          piecesY = this.config.piecesY,
          x       = 0;

      this._pieces.forEach(function(piece, i) {
        piece.setNeighbors({
          top: self._pieces[i - piecesX],
          right: x < piecesX-1 ? self._pieces[i + 1] : null,
          bottom: self._pieces[i + piecesX],
          left: x > 0 ? self._pieces[i - 1] : null
        });
        x = ++x % piecesX;
      });
    },

    _observePieces: function() {
      var self = this;
      this._pieces.forEach(function(piece, i) {
        piece.on('dragStop', function() {
          var draggedPiece = this;
          self._checkCollision(this.mergedPieces).forEach(function(fittingPiece, i) {
            draggedPiece.mergeWith(fittingPiece);
          });
        });
      });
    },

    _checkCollision: function(pieces) {
      var self        = this;
      return pieces.map(function(piece) {
        return $.grep(self._pieces, function(otherPiece) {
          return piece.isMatchingWith(otherPiece, self.config.mergeTolerance);
        });
      });
    },

    _shufflePieces: function() {
      var config      = this.config,
          pieceWidth  = config.puzzleWidth  / config.piecesX,
          pieceHeight = config.puzzleHeight / config.piecesY,
          fitTo       = config.fitImageTo;

      this._pieces.forEach(function(piece, i) {
        piece.setPosition(new Vector(Math.random() * ($(fitTo).width() - pieceWidth), Math.random() * ($(fitTo).height() - pieceHeight)));
      });
    },

    // do everything that has to be done after image was loaded
    _onImageLoaded: function() {
      this._imageLoaded = true;
      if (this.config.puzzleWidth === LIKE_IMAGE) {
        this.config.puzzleWidth = this._image.width;
      }
      if (this.config.puzzleHeight === LIKE_IMAGE) {
        this.config.puzzleHeight = this._image.height;
      }
      this._calculateScaling();
      this._createSVG();
      this._createPieces();
      this._shufflePieces();
      this._observePieces();
    },

    _calculateScaling: function() {
      var fitTo = this.config.fitImageTo;
      if (fitTo) {
        this.scale = Math.min($(fitTo).width() / this.config.puzzleWidth, 1);
        this.scale = Math.min($(fitTo).height() / this.config.puzzleHeight, this.scale);
      }
    },

    _createShadow: function() {
      var svg = this.svg,
          filter = svg.createElement('filter', {
            id: 'dropShadow',
            x: 0, y: 0,
            width: '200%',
            height: '200%'
          });
      filter.appendChild(svg.createElement('feOffset', {
        'result': 'offOut',
        'in': 'SourceAlpha',
        'dx': 10,
        'dy': 10
      }));
      filter.appendChild(svg.createElement('feGaussianBlur', {
        'result': 'blurOut',
        'in': 'offOut',
        'stdDeviation': 10
      }));
      filter.appendChild(svg.createElement('feBlend', {
        'in': 'SourceGraphic',
        'in2': 'blurOut',
        'mode': 'normal'
      }));
      this.defs.appendChild(filter);
    }
  });
  window.Jigsaw = Jigsaw;
}(jQuery));
