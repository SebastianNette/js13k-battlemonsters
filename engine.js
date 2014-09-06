// removed most of the flexibility to keep this project below 13kb
// rendering engine mostly based on pixi.js
var 

	/* the sound effects for the game */
	AudioSetup = {
		1: [1,,.08,,.27,.6,,-.46,,,,,,,,,,,1,,,.06,,.5],
		2: [3,,.07,,.23,.75,,-.46,,,,,,,,,,,1,,,,,.5],
		3: [3,,.09,,.3,.36,,-.31,,,,,,,,,,,1,,,,,.5],
		4: [3,,.01,,.3,.63,,-.33,,,,,,,,,,,1,,,.1,,.5],
		shake: [3,,.09,,.25,.77,,-.58,,,,,,,,,,,1,,,.04,,.5],
		fail: [3,,.3,.77,.37,.5,,-.3,,,,,,,,,,,1,,,,,.5],
		success: [1,,.09,.43,.4,.86,,,,,,.33,.67,,,,,,1,,,,,.5]
	},
			
	A = Array,
	M = Math,
	W = window,
	D = document,
	
	// lets shorten all undefined
	undefined = (void 0),

	slice = A.prototype.slice,
	min = M.min,
	max = M.max,
	random = M.random,
	floor = M.floor,
	ceil = M.ceil,
	sin = M.sin,
	cos = M.cos,
	PI = M.PI,
	PI2 = PI*2,
	Inf = Infinity;

// fn bind
Function.prototype.bind = function (bind) {
    var self = this;
    return function () { return self.apply(bind || null, slice.call(arguments)); };
};

var
	// now polyfill
	now = Date.now || function() { return new Date().getTime() },
	
	// empty fn
	noop = function() {},

	// short way to create arrays
	str2arr = function(str) { return str.split(' ') },
	
	// vendor prefixes
	getVendors = function() { return str2arr('ms moz webkit o') },
	
	vendors = getVendors(), 

	v,
	
	removeIndex,

	// remove element from array
	remove = function (arr, item) {
		removeIndex = arr.indexOf(item);
		if(removeIndex>=0) {
			arr.splice(removeIndex,1);
			return true;
		}
		return false;
	},
	
	// short for addEventListener
	addEvent = function(to, ev, cb, uc) {
		to.addEventListener(ev,cb,!!uc);
	},
	
	// mixin
	extend = function( dest, source ) {
		for (var k in source) {
			if (dest[k] === undefined) dest[k] = source[k];
		}
		return dest;
	},
	
	// simple class
	Class = function( proto ) {
		proto.constructor = proto.init;
		proto.constructor.prototype = proto;
		return proto.constructor;
	},
	
	// simple class inherit
	ExtendClass = function( parent, proto ) {
		return Class(extend(proto, parent.prototype));
	},
	
	// shortcut for document.createElement
	createElement = function( tag ) { return D.createElement( tag ) },
	
	// shortcut for setting width and height
	setSize = function(o,w,h) {
		o.width = w;
		o.height = h;
	},
	
	// canvas factory
	getCanvas = function( width, height, smoothingDisabled ) {
		var can = createElement( 'canvas' );
			setSize(can, width || 1, height || 1);
			can.texId = 0;
			can.ctx = can.getContext( '2d' );
			if(smoothingDisabled) {
				var vendors = getVendors(), v;
				while(v = vendors.pop()) {
					can.ctx[v+'ImageSmoothingEnabled'] = false;
				}
				can.ctx.imageSmoothingEnabled = false;
			}
		return can;
	},
	
	// shortcut for appendChild
	append = function( element, child ) { element.appendChild( child ) },
	
	// buffer
	gradientCanvas = getCanvas(),
	
	// check for string
	isString = function( s ) { return typeof s === 'string' },
	
	// check for array
	isArray = function( a ) { return a instanceof A },
	
	// color parser
	Color = function( dec ) { 
		if((dec % 1) !== 0) { return dec; }
		return '#' + ('00000' + (dec | 0).toString(16)).substr(-6); 
	},
	
	// hex to rgb converter
	hex2rgb = function(hex) { return [(hex >> 16 & 0xFF) / 255, ( hex >> 8 & 0xFF) / 255, (hex & 0xFF)/ 255] },
	
	// tween holder
	tweens = [],

	// simple tween engine
	Tween = function(from, to, duration, update, this_var) {
		var tween = [ from, to - from, 0, duration, update.bind(this_var) ];
		tween[4]( from );
		tweens.push( tween );
		return tween;
	},

	// tween update
	TweenUpdate = function( delta ) {
		for(var i = 0; i < tweens.length; i++) {
			var tween = tweens[i];
			tween[2] += delta;
			if(tween[2] >= tween[3]) {
				tween[4](tween[0]+tween[1],true);
				tweens.splice(i--,1);
			} else {
				tween[4](tween[0]+tween[1]*tween[2]/tween[3],false);
			}
		}
	},

	// event names
	eventArr = str2arr('click mousemove'),
	
	// simple event manager
	EventManager = new (Class({
		init: function() {
			this.exec = [];
		},
		each: function(cb) {
			for(var i = 0; i < 2; i++) {
				cb(eventArr[i]);
			}
		},
		create: function( view ) {
			this.view = view;
			this.each(this.event.bind(this));
			if (W.navigator.msPointerEnabled) {
				view.style['-ms-content-zooming'] = 'none';
				view.style['-ms-touch-action'] = 'none';
			}
			var t = this.trigger.bind(this);
			addEvent(D, 'touchstart', function(e) {t('click',e)});
		},
		event: function( name ) {
			this[ name ] = [];
			addEvent(D, name, function(e) { this.trigger(name, e); }.bind(this));
		},
		add: function( name, cb, obj ) {
			if(!obj.events) obj.events = {};
			if(!obj.events[name]) this[ name ].push(obj);
			obj.events[name] = cb;
		},
		trigger: function( name, e ) {
			e = e || W.event;
			e.preventDefault();
			var touch = (e.touches || e.changedTouches) && (e.touches[0] || e.changedTouches[0]);
			this.x = ((touch ? (touch.pageX || touch.clientX) : (e.pageX || e.clientX)) - this.view.offsetX) * this.view.factorX;
			this.y = ((touch ? (touch.pageY || touch.clientY) : (e.pageY || e.clientY)) - this.view.offsetY) * this.view.factorY;
			this.intersect( name, this.x, this.y );
		},
		move: function() {
			this.intersect( 'mousemove', this.x, this.y );
		},
		intersect: function( name, x, y ) {
			if( name === 'mousemove' ) {
				this.view.className = '';
			}

			var bound = this[ name ], i, j;
			this.exec.length = 0;
			for(i = 0, j = bound.length; i < j; i++ ) {
				var o = bound[i];
				if( x >= o.wx && x < (o.wx + o.width||Inf) && y >= o.wy && y < (o.wy + o.height||Inf) && o.onStage() ) {
					if( name === 'mousemove' && o.button ) {
						this.view.className = 'pointer';
					}
					this.exec.push(o.events[name]);
				}
			}
			for(i = 0; i < this.exec.length; i++) {
				this.exec[i](x, y);
			}
		}
	})),
	
	// check whether or not jsfxr can play
	audioSupport = !!W.Uint8Array,
	
	// simple sound engine
	sound = new (Class({
		init: function(data) {
			this.sounds = {};
			if(!audioSupport) return;
			for(var name in data) {
				this.sounds[name] = new Audio();
				this.sounds[name].volume = 0.15;
				this.sounds[name].src = jsfxr(data[name]);
			}
		},
		play: function( key, music ) {
			if(!audioSupport) return;
			this.sounds[ key ].play();
		}
	}))(AudioSetup),
	
	TextureCache = {},
	TextureCacheCount = 0,

	// texture factory
	Texture = function( source, onload, x, y, n ) {

		// canvas
		if(!isString(source)) { 
			if(source.texId) {
				return TextureCache[source.texId];
			}
			if(isArray(source)) {
				return source;
			}
			source.texId = 't' + (++TextureCacheCount);
			TextureCache[source.texId] = [ source.width, source.height, source ];
			return TextureCache[source.texId];
		}

		return TextureCache[source];
	},

	// vector graphics~
	Shape = function( w, h, points, fill, stroke, can ) {
		if(!isArray(stroke)) stroke = [ stroke ];
		var ctx = can.ctx,
			strokesize = stroke[0]||0,
			sw = w - 2*strokesize,
			sh = h - 2*strokesize,
			length = points.length, 
			i;

		for(i = 0; i < length; i++) {
			points[i] /= 100;
		}
		if(length < 4) {
			return;
		}
		ctx.beginPath()
		ctx.moveTo(
			floor(points[length-2] * sw + strokesize), 
			floor(points[length-1] * sh + strokesize)
		);
		for(i = 0; i < length; i += 4) {
			ctx.quadraticCurveTo(
				floor(points[i] * sw + strokesize), 
				floor(points[i+1] * sh + strokesize), 
				floor(points[i+2] * sw + strokesize), 
				floor(points[i+3] * sh + strokesize)
			);
		}

		ctx.lineWidth = strokesize;
		if(fill !== null) {
			ctx.fillStyle = Color(fill);
			ctx.fill();
		}

		if(strokesize) {
			ctx.lineWidth = strokesize;
			ctx.strokeStyle = Color(stroke[1]||0);
			ctx.stroke();
		}
		return can;
	},
	
	// vector loader
	ShapeLoader = function( data ) {
		for(var name in data) {
			var shape = data[name],
				can = getCanvas(shape[0], shape[1]),
				i, j;
			for(i = shape.length - 3; i >= 2; i -= 3) {
				var points = [];
				for(j = 0; j < shape[i].length; j++) {
					points.push((shape[i].charCodeAt(j)-40)/0.86);
				}
				Shape( shape[0], shape[1], points, shape[i+1], shape[i+2] || 0, can );
			}
			TextureCache[name] = Texture(can);
		}
	},
	
	// M6
	Matrix = function() { 
		return { 
			a: 1, 
			b: 0, 
			c: 0, 
			d: 1, 
			e: 0, 
			f: 0 
		}; 
	},
	
	// random int between
	rand = function(a,b) { 
		return b !== undefined ? floor(random() * (b-a)) + a : floor(random() * a); 
	},
	
	// text buffer
	textbuffer = getCanvas(),
	
	// shorter defineProperty
	define = function (a,b,c,d) {
		Object.defineProperty(a.prototype, b, {
			get: c,
			set: d
		});
	},

	// simple 1 color texture
	Block = function( color, w, h ) {
		var can = getCanvas( w, h );
			can.ctx.fillStyle = color;
			can.ctx.fillRect(0,0,w,h);
		return Texture(can);
	},

	// gradients
	Gradient = function( h, c1, c2 ) {
		if(c2===undefined) return Color(c1);
		var grd = gradientCanvas.ctx.createLinearGradient(0,0,0,h);
		grd.addColorStop(0, Color(c1));
		grd.addColorStop(1, Color(c2));
		return grd;
	},

	// (rounded) rect with color bg
	ColorBoxCache = {},
	ColorBox = function( w, h, c ) {
		var id = w*h;
		if(ColorBoxCache[id]) return ColorBoxCache[id];
		var can = getCanvas( w, h ),
			ctx = can.ctx;
			w -= 8;
			h -= 8;
		
		// begin custom shape
		ctx.beginPath();
		ctx.moveTo(9,4);
		ctx.arcTo(4+w,4,4+w,4+h,5);
		ctx.arcTo(4+w,4+h,4,4+h,5);
		ctx.arcTo(4,4+h,4,4,5);
		ctx.arcTo(4,4,4+w,4,5);

		ctx.lineWidth = 4;
		ctx.fillStyle = c;
		ctx.fill();
		
		ctx.strokeStyle = '#c8a848';
		ctx.stroke();

		return ColorBoxCache[id] = can;
	};

// request animation frame polyfill
while(v = vendors.pop() && !requestAnimationFrame) { requestAnimationFrame = W[v + 'RequestAnimationFrame']; }
requestAnimationFrame = requestAnimationFrame || function(callback) { W.setTimeout(callback, 1000/60); };

// core
var GameEngine = Class({
	init: function( parent ) {
		this.view = getCanvas( 480, 320 );
		this.pixel = getCanvas(480, 320, true );

		this.parent = parent;

		EventManager.create( this.pixel );

		this.viewDOC = new DisplayObjectContainer();
		this.viewDOC.isStage = true;

		this.stage = new DisplayObjectContainer();
		this.viewDOC.add(this.stage);

		this.resize();
		addEvent( W, 'resize', function() { this.resize(); }.bind(this), true );

		// attach canvas to dom
		append( parent, this.view );
		this.view.style.display = 'none';
		append( parent, this.pixel );

		// rendering loop
		var render = this.render.bind(this);
		var time = now(), delta = 0;
		var scope = this;
		(function loop() { 
			requestAnimationFrame(loop); 
			delta = now() - time;
			time += delta;
			delta = max(0, min(100, delta));
			TweenUpdate( delta );
			render( delta );
		})();
	},
	render: function( delta ) {
		EventManager.move();
		this.clear();
		this.stage.render( this.view.ctx, delta );
		this.pixel.ctx.drawImage(this.view, 0, 0, 480, 320, 0, 0, this.pixel.width, this.pixel.height);
	},
	clear: function() {
		var can = this.view,
			ctx = can.ctx;

		setSize(can, 480, 320);
		setSize(this.pixel,this.pixel.screenW, this.pixel.screenH);

		ctx.setTransform(1,0,0,1,0,0);
		// no need for this, because we have our own bg
		//ctx.fillStyle = '#fff';
		//ctx.fillRect(0, 0, 480, 320);
	},
	resize: function() {
		var wh = W.innerHeight,
			ww = W.innerWidth,

			// try to make game smaller for possible desktop user
			wh2 = ww > 1000 ? min( 480, wh ) : wh,
			ww2 = ww > 1000 ?  min( 720, ww ) : ww,

			sh = ww2 * 2/3,
			sw = ww2;

		if(sh > wh2) {
			sw = wh2 * 1.5;
			sh = wh2;
		}

		this.pixel.screenW = sw | 0;
		this.pixel.screenH = sh | 0;

		this.pixel.factorX = 480 / this.pixel.screenW;
		this.pixel.factorY = 320 / this.pixel.screenH;

		this.pixel.offsetX = floor((ww-sw)/2);
		this.pixel.offsetY = floor((wh-sh)/2);
	}
});

// doc
var DisplayObjectContainer = Class({
	init: function( px, py, ax, ay ) {
		this.children = [];
		this.count = 0;

		this._button = false;
		this._visible = true;

		this._alpha = 1;

		this.wx = 0;
		this.wy = 0;

		this.px = px || 0;
		this.py = py || 0;
		
		this.ax = ax || 0;
		this.ay = ay || 0;
		
		this.sx = 1;
		this.sy = 1;
		
		this.worldAlpha = 1;
		this.worldMatrix = Matrix();
	},
	get: function( index ) {
		return this.children[index];
	},
	add: function( child ) {
		if( child.parent ) {
			child.parent.remove( child );
		}
		child.parent = this;
		this.children.push(child);
		this.count++;
	},
	remove: function( child ) {
		if(child) {
			if(remove(this.children, child)) {
				child.parent = null;
				this.count--;
			}
		} else if(this.parent) {
			this.parent.remove(this);
		}
	},
	onStage: function() {
		return this.visible && this.alpha > 0 && this.parent && (this.parent.isStage || this.parent.onStage());
	},
	updateTransform: function() {

		this.wx = (this.parent.wx || 0) + this.px - (this.width || 0) * this.ax;
		this.wy = (this.parent.wy || 0) + this.py - (this.height || 0) * this.ay;

		var parentTransform = this.parent.worldMatrix;
		var worldTransform = this.worldMatrix;

		var sx = this.sx,
			sy = this.sy,
			a02 = this.px,
			a12 = this.py,
			b00 = parentTransform.a, 
			b01 = parentTransform.b,
			b10 = parentTransform.c, 
			b11 = parentTransform.d;

		worldTransform.a = b00 * sx;
		worldTransform.b = b01 * sy;
		worldTransform.e = b00 * a02 + b01 * a12 + parentTransform.e;

		worldTransform.c = b10 * sx;
		worldTransform.d = b11 * sy;
		worldTransform.f = b10 * a02 + b11 * a12 + parentTransform.f;

		this.worldAlpha = this.alpha * this.parent.worldAlpha;
	},
	render: function( ctx, delta ) {
		if(!this.visible || this.alpha <= 0) return;
		this.updateTransform();
		if(this.canvas) {
			this.draw( ctx );
		}
		var child = this.children, i, j;
		for(i = 0, j = this.count; i < j; i++) {
			child[i].render( ctx, delta );
		}
	}
});

// sprite
var Sprite = ExtendClass(DisplayObjectContainer, {
	init: function( texture, px, py, ax, ay ) {

		DisplayObjectContainer.call( this, px, py, ax, ay );

		texture = Texture(texture);

		this._width = texture[0];
		this._height = texture[1];

		this.canvas = texture[2];
	},

	draw: function( ctx ) {
		var transform = this.worldMatrix;
		ctx.globalAlpha = this.worldAlpha;
		ctx.setTransform(transform.a, transform.c, transform.b, transform.d, transform.e | 0, transform.f | 0);
		ctx.drawImage(this.canvas, -this.ax*this._width, -this.ay*this._height);
	}
});

// movieclip
var MovieClip = ExtendClass(Sprite, {
	init: function( textures, px, py, ax, ay ) {
		Sprite.call( this, textures[0], px, py, ax, ay );
		for(var i = 0; i < textures.length; i++) {
			textures[i] = Texture(textures[i]);
		}
		this.textures = textures;
	},
	goTo: function(frame) {
		this.canvas = this.textures[ frame ][2];
	}
});

// meassure font height
var dummy = createElement('div'),
	dummyText = D.createTextNode("M"),
	FontHeightCache = {},
	determineFontHeight = function(fontStyle) {
		if(FontHeightCache[fontStyle]) {
			return FontHeightCache[fontStyle];
		}
		dummy.style.font = fontStyle;
		append(D.body,dummy);
		FontHeightCache[fontStyle] = dummy.offsetHeight;
		D.body.removeChild(dummy);
		return FontHeightCache[fontStyle];
	};
append(dummy,dummyText);

// text
var Text = ExtendClass(Sprite, {
	init: function( text, style, px, py, ax, ay ) {
		Sprite.call( this, getCanvas(), px, py, ax, ay );
		this.setText( text, style );
	},
	setText: function( text, style ) {
		text += '';
		if(this.text === text && (!style || style === this.style)) {
			return;
		}
		this.text = text;

		if(!this.style) this.style = [11.5, '#fff', ''];
		if(style) {
			this.style[0] = style[0];
			if(style.length > 1) this.style[1] = style[1];
			if(style.length > 2) this.style[2] = style[2];
		}


		var ctx = this.canvas.ctx,
			font = this.style[2] + ' ' + (this.style[0] || 12) + 'pt Arial, Helvetica, sans-serif',
			lines = this.text.split(/(?:\r\n|\r|\n)/),
			lineWidths = [],
			maxLineWidth = 0,
			lineHeight,
			i;

		ctx.font = font;

		this.sx = 1;
		this.sy = 1;
		
		for (i = 0; i < lines.length; i++) {
			var lineWidth = ctx.measureText(lines[i]).width;
			lineWidths[i] = lineWidth;
			maxLineWidth = max(maxLineWidth, lineWidth);
		}

		lineHeight = determineFontHeight(font);

		this._width = maxLineWidth + ctx.lineWidth + 4;
		this._height = lineHeight * lines.length;

		setSize(this.canvas, this._width, this._height);

		for (i = 0; i < lines.length; i++) {
			setSize(textbuffer, this._width, lineHeight);
			textbuffer.ctx.font = font;
			textbuffer.ctx.fillStyle = Color(this.style[1]);
			textbuffer.ctx.textBaseline = 'top';
			textbuffer.ctx.fillText(lines[i], 2, 0); 
			ctx.drawImage(textbuffer, 0, i * lineHeight);
		}
	}
});

// setters and getters
for(var i = 0, j = 0, SpriteClasses = [ DisplayObjectContainer, Sprite, MovieClip, Text ], other = str2arr('px py ax ay sx sy alpha visible'); i < 4; i++) {
	define(
		SpriteClasses[i], 'width',
		function() { return this.sx * this._width; },
		function(value) { this.sx = value / ( this._width ); }
	);

	define(
		SpriteClasses[i], 'height',
		function() { return this.sy * this._height; },
		function(value) { this.sy = value / ( this._height ); }
	);

	EventManager.each(function(name) {
		define(SpriteClasses[i], name, noop, function(cb) {
			if(name === 'click') {
				this.mousemove = noop;
				this.button = true;
			}
			EventManager.add(name, cb, this);
		});
	});

	for(j = 0; j < 8; j++) {
		define(
			SpriteClasses[i], other[j],
			function(name) { return function() { return this[name] } }('_'+other[j]),
			function(name) { return function(value) { this[name] = value }}('_'+other[j])
		);
	}
}

// grass plattform
var createPodest = function(x,y,w,h) {
	var can = getCanvas(w, h);
	var ctx = can.ctx;

	// brown circle
	ctx.beginPath();
	ctx.fillStyle = '#e8e8a8';
	ctx.arc(w/2,h/2,w/2,0,PI2,false);
	ctx.fill();
	
	// dark green circle
	ctx.beginPath();
	ctx.fillStyle = '#b0e880';
	ctx.arc(w/2,h/2,w/2-8,0,PI2,false);
	ctx.fill();
  
	// light green circle
	ctx.beginPath();
	ctx.fillStyle = '#c0f890';
	ctx.arc(w/2,h/2,w/2-16,0,PI2,false);
	ctx.fill();

	return new Sprite(can, x, y);
};