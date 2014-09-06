// game
addEvent(D.body, 'selectstart', function() { return false; });

var cash = 50;						// current cash
var monsters = [];					// current monsters
var items = [5,0,5];				// current items
var dex = [];						// monster dex (known monster)
var levels = [1,0,0,0,0,0,0,0];		// level gap unlocked/locked
var used = [];						// monsters used in battle

// colors / fonts
var bold = 'bold';
var white = "#fff";
var smallfont = [10,0];
var bigfont = [10,0,bold];
var smallfontBlack = [10,0,bold];
var bigfontBlack = [12,0,bold];
var smallfontWhite = [10,white];
var bigfontWhite = [10,white,bold];
var tinyfontWhite = [8,white,bold];

// monster types
var fire = 0;
var water = 1;
var earth = 2;
var wind = 3;
var other = 4;
var normal = 5;

// damage matrix
var dmgMatrix = [
	// fire    water    earth  wind    other
	[	0.5,	0.5,	  2,	  1,   1.25 ], // fire
	[	  2,	0.5,	0.5,	  1,   1.25 ], // water
	[	0.5,	  2,	0.5,	0.5,   1.25 ], // earth
	[	  1,	  1,	  2,	  1,   1.25 ], // wind
	[  0.75,   0.75,   0.75,	 0.75,    1 ]  // other
];

// effectiveness of skills dmg matrix | 0
var effective = [ "not very", "very", "super" ];

// monster database
var monsterDB = [
	// name, type, desc
	[ "Fire", fire, "Easy to\nprovoke." ],
	[ "Water", water, "Blub...Blub..." ],
	[ "Earth", earth, "Pwetty\nflowers." ],
	[ "Wind", wind, "Loves fresh\nair." ],
	[ "Gastly", other, "Kind of derpy." ],
	[ "Dug", other, "Why was this\ncreated?" ],
	[ "Volt", other, "Thinks he is\na Tameball." ],
	[ "Pika", other, "Not Pikachu." ],
	[ "Rad", earth, "No questions\nasked." ],
	[ "Drago", wind, "Who needs\nwings?" ],
	[ "Mary", water, "Yep, Mary." ],
	[ "Char", fire, "Scared of\nwater." ]
];

// monster texture array
var monsterTex = 'abcdefghijkl'.split('');

// item database
var itemDB = [
	// name, desc, cost, id in db, callback
	[ "Healing Potion", "Restores 20 HP", 20, 0, function(monster) { 
		monster[6] = min(monster[3], monster[6]+20);
		return false;
	} ],
	[ "Skill Potion", "Restores SP", 20, 1, function(monster) { 
		monster[16] = 20;
		monster[17] = 20;
		monster[18] = 20;
		return false;
	} ],
	[ "Tameball", "Used to tame monsters.", 50, 2, function(monster, enemy) {
		var catchrate = ((enemy[3]*70)/(enemy[6]||1));
		var shakerate = catchrate * 100/255;
		var shakes = shakerate < 10 ? 0 : (shakerate < 30 ? 1 : (shakerate < 70 ? 2 : 3));
		if(monsters.length < 22 && catchrate >= rand(255)) {
			monsters.push(enemy);
			return [ true, shakes ];
		}
		return [ false, shakes ];
	} ],
	[ "Heal all", "Heal all monsters!", 100, 3, function() {
		for(var i = 0; i < monsters.length; i++) {
			monsters[i][6] = monsters[i][3];
			monsters[i][16] = 20;
			monsters[i][17] = 20;
			monsters[i][18] = 20;
		}
	} ]
];

// skill db
var skillDB = [
	// name, atk modifier, type, learn at
	[ "Tackle", 1, normal, 0, 1 ],
	[ "Scratch", 1.2, normal, 3, 2 ],
	[ "Bite", 1.5, other, 8, 3 ],
	[ "Fireball", 1.5, fire, 6, 3 ],
	[ "Bubbles", 1.5, water, 6, 3 ],
	[ "Razor Leaf", 1.5, earth, 6, 3 ],
	[ "Wing Attack", 1.5, wind, 6, 3 ],
	[ "Flamethrower", 1.8, fire, 12, 4 ],
	[ "Watergun", 1.8, water, 12, 4 ],
	[ "Vine Whip", 1.8, earth, 12, 4 ],
	[ "Tornado", 1.8, wind, 12, 4 ],
	[ "Bodycheck", 2, other, 12, 4 ]
];

// Menu Items
var ingameMenu = str2arr('Main Bag Monsters Shop Monsterdex');

// callbacks for menu
var gameMenu = [
	showMain,
	showBag,
	showMonsters, 
	showShop, 
	showDex
];

// stages / level gaps
var gaps = [ 
	// name, min level, max level
	"Himeng Valley", 1,1, 
	"Kaymo Mountain", 1,5, 
	"Sukemo Bluff", 5,10, 
	"Erie Marsh", 10,20, 
	"The Wilterlands", 20,30, 
	"Green Plains", 30,40, 
	"Zensho Island", 40,50,
	"Heavenly Island", 50,60
];

// guardians (to beat before unlock)
var guardians = [
	// monster db id, level
	// lvl 1 area
	null,
	// lvl 1-5
	[ 4,4 ],
	// lvl 5-10
	[ 11, 8 ],
	// lvl 10-20
	[ 10, 15 ],
	// lvl 20-30
	[ 3, 25 ],
	// lvl 30-40
	[ 2, 35 ],
	// lvl 40-50
	[ 1, 45 ],
	// lvl 50-60
	[ 0, 55 ]
];

var textbox, confirmbox;

// load graphics
ShapeLoader({
	// fire
	a:[70,60,"dce_j`gd",white,[1,white],"`heikeh_c[`a",0,1.5,"LeMaR`Pe",white,[1,white],"LoHhFaM_SbQi",0,1.5,"TtZn`tZm",0,1.5,"<B:=::AA=@LCK<F6O>O:R<XBS0Y9]8fEjWeQAFFaCi:n3h/_=i1I8N?M","#f00",,"5S<KD@SA^@eHkNmZqxPy5y4^","#f00",1.5,"0_(V/s@pN`JLS@UJXAcMkhkFf4P)O3[FM,>,E7MEA:433:=K4K->.Y5_",16768517,2],
	// water
	b:[70,60,"n.w2|<u@kBk6",16775485,[1.5,7369491],"QFRD_4u8].QC",3223938,1.5,"4_.SLf.p3e-b",3223938,1.5,"dce_j`gd",white,[1,white],"`heikeh_c[`a",0,1.5,"LeMaR`Pe",white,[1,white],"LoHhFaM_SbQi",0,1.5,"TtZn`tZm",0,1.5,"5S<KD@SA^@eHkNmZqxPy5y4^",7966420,1.5,"s~*K=O1ADM86KKB/",3223938,1.5,"@@-LctE3",14341887,[1,2894643],"\\arLoXuXo`vj",3223938,1.5],
	// earth
	c:[70,60,"5?:LFN@@",16775485,2,"`@cLpSkB",16775485,1.5,"09:C56@8C<@EI7KEKH@JMLAT>S<L<W5S.L9H.K.C",14707049,1.5,"[:eC_6k9n<jEs8uEuIkJyLmUjUfLfX_SXLcHYKYD",14707049,1.5,"dce_j`gd",white,[1,white],"`heikeh_c[`a",0,1.5,"LeMaR`Pe",white,[1,white],"LoHhFaM_SbQi",0,1.5,"TtZn`tZm",0,1.5,"4W3fDFRJ\\ApbpXvXiK_:PD]/2H+`",3572245,1.5,"5S<KD@SA^@dHjNmZqxPy5y4^",10092433,1.5],
	// wind
	d:[70,60,"T2D:SAf:",null,[2,16775219],"geiambke",white,[1,white],"djikogkaf]dc",0,1.5,"OfQcUbSg",white,[1,white],"OqLjJcQaWdTk",0,1.5,"Xv^pdv^o",0,1.5,"N].V(\\2_(e3e,k3l",white,1.5,"9U@LGBVCaBgJmPq\\uzS{9{8_",14940927,1.5,"SkwP~SwY~]w_~dwf",white,1.5],
	// gastly
	e:[60,60,"fXUUHXU]",0,,"eeE\\Z~l^","#c00",2,"JF>JB`SV`FpLicSS",white,,",7;cT~qe~<W8",0,,"~((((~V~~~~L","#c4c",0],
	// dug
	f:[60,60,"PFP;","#c44",2,"\\F\\:","#c44",2,"oW~iQx(h2SRa",14598079,[1,12427938],"WB_FYPNK",16091095,1,"Tkgdk/S.6-;e",13392656,1.5],
	// volt
	g:[60,60,"wUqRmUqY",0,,"YV`[fXaS",0,,"tZnUqPwJ{Ox[",white,1.5,"LWFE_OgXg`QZ",white,1.5,"(((V|w~W~(S(","#c00",1.5,"((S(~(~S~~T~(~(T",white,1.5],
	// pika
	h:[60,60,"NkMeEaEh",16523582,,"qjocgcig",16523582,,"S^PXJVL[",white,,"dWiXk_e[",white,,"Zk_e[nUe",0,,"OSSYSbKbF[JW",0,,"_aaXhSkXl_ga",0,,"rv\\v>w:g:TFLXBiLxWwe",16383805,1.5,"/X@Y7P?]",16523582,,"47@<G@<I",0,,"v:tF`Bq:",0,,"LYMJ-(@S",16383805,1.5,"fYbH~(qS",16383805,1.5,"(VEb-9*L",16383805,1.5],
	// rad
	i:[60,60,"k[kYmhgZ",14885410,1,"gSmRqUmW",0,,"[X_VdW`[",0,1,"~euSaDQYJofl",9530060,1.5,"DL:4j5aX",9423894,1.5,"919AH:>6",9423894,1.5,"E@\\SCb/N",9423894,1.5,"`8m+xLYU",9423894,1.5,"j}]|Vgbl",9530060,1.5,"xyngbjlx",9530060,1.5],
	// drago
	j:[60,60,"M{Yyhrj_Wz?i",white,,"oGyRqgeX",white,,"aFcGbM_J",white,,"iH`OYM`E",0,,"TSYJP?C>MLBU",16250871,1.5,"y`zQe(QESXPfHL@U4_(h4l;fC{Y~kuk_",556748,1.5,"x:pBaFk+",white,1.5],
	// mary
	k:[60,60,"e?c>",white,1,"kCk?",white,[1,white],"^9X:",white,[1,white],">}7j>~Jo","#c44",2,"fBk@p@kE",0,,"_9Y9V>]>",0,,"MLFDG;S=",7060223,,"cA_@^NfD",16398154,1,"IVBQ9G5U4d@fGeI_",7060223,1.5,"RCL7J1F6D@HD",7060223,1.5,"M~>XBE[HrOki",white,,"4XF@`(sF~egqTzEk",7060223,1.5,"GZ7Y*Z(e(o/r:v@m",7060223,1.5,"X~VxShcpdz]~",7060223,1.5,"~ix_hMqf",7060223,1.5,"{OqOkFo?w;yE",16404041,1.5,"q4|=~@~IzTsPlFl>",7060223,1.5,"BBX=Z*I0",16404041,1.5,">:L?f7W*L(F,",7060223,1.5],
	// char
	l:[60,60,"X{Q_:lDo",16746058,,"mJqK",white,1.5,"e:g=d@c:",4049986,,"d6i4k7h:",white,,"k9h@c>a:d4h4",0,,"lE\\p=uJbTI]>",16746058,,"Pieeslkw{~^{[x_v",16746058,1.5,"fLwSsTxWsXuZ\\_OASAP=U@S:",16746058,1.5,"aUmSejch",16580513,,"jm[t3~YA[5b.p(w4y7w@~HqN",16746058,1.5,"._5iAwNsQkJe7k/I",16746058,1.5,")L3N=G0=",16770560,,"1R6M<E/5(D-P",15428911,,"YzNo?zOx",16746058,1.5],
	// tameball white
	m:[25,25,"4u+RPatXovPv",white,,"((Q(~(~S~~R~(~(S",13371914,1.5],
	// tameball red
	n:[25,25,"4u+RPatXovPv","#f00",,"((Q(~(~S~~R~(~(S",13371914,1.5]
});

// simple fast level algoritm with some randomness
function calcExp(level) { 
	return level*level*level + rand(level); 
};

// exp gain
function gainExp(wild, level, monstersUsed) {
	return floor(((wild ? 1 : 1.5) * 60 * level) / (8 * monstersUsed)) || 1;
};

// get stats
function calcStats( level, iv ) {
	return floor(((96 + iv) * level / 100 + 5));
};

// get hp
function calcHP( level, iv ) {
	return floor((90 + iv) * (level / 100) + 10 + level);
};

// calc damage
function calcDamage(skill, attacker, defender) {
	var base = skill[1] * attacker[4] * (skill[2] === attacker[2] ? 1.5 : 1); // atk x skill mod x same type bonus
	var critical = !rand(16);
	var effectiveness = dmgMatrix[attacker[2]][defender[2]];
	var mod = effectiveness * (critical ? 2 : 1) * rand(85,100)/100; // crit x random modifier
	return {
		critical: critical,
		damage: floor( (((2*attacker[1]+10)/250) * (attacker[4]/defender[5]) * base + 2) * mod ) || 1,
		effectiveness: effectiveness
	};
};

// obtain monster
function monsterData( id, level, hv, av, dv, s1, s2, s3 ) {

	// id is monster object
	if(level === undefined) {
		var stats = id.stats;
		id = stats[0];
		level = stats[1]+1;
		hv = stats[13];
		av = stats[14];
		dv = stats[15];
		s1 = stats[8];
		s2 = stats[9];
		s3 = stats[10];
	}

	// monster db data
	var data = monsterDB[id];

	// mark as known in dex
	remove(dex,id);
	dex.push(id);

	// random modifier
	hv = hv || rand(32);			// random hp modifier
	av = av || rand(32);			// random at modifier
	dv = dv || rand(32);			// random def modifier

	return [ 
		id,							//  0: id in monster db
		level,						//  1: current level
		data[1],					//  2: monster type
		calcHP(level,hv),			//  3: max health
		calcStats(level,av),		//  4: attack
		calcStats(level,dv),		//  5: defense
		calcHP(level,hv),			//  6: current health
		0,							//  7: skill slot 1
		s1 || -1,					//  8: skill slot 2
		s2 || -1,					//  9: skill slot 3
		s3 || -1,					// 10: skill slot 4
		0,							// 11: current exp
		calcExp(level),				// 12: exp to next level
		hv,							// 13: individual hp mod
		av,							// 14: individual attack mod
		dv,							// 15: individual defense mod
		20,							// 16: sp skill 2
		20,							// 17: sp skill 3
		20							// 18: sp skill 4
	];
};

// simple rounded rect
var Box = function(x,y,w,h,c) { 
	return new Sprite( ColorBox( w, h, c || '#285068' ), x, y );
};

// engine and stage
var Engine = new GameEngine( D.body );
var stage = Engine.stage;

// game background
var gameBG = getCanvas(1,320);

// sky
gameBG.ctx.fillStyle = Gradient(60, 0xbbdbef, 0xe3edf0);
gameBG.ctx.fillRect(0,0,1,50);
// grass
gameBG.ctx.fillStyle = '#ddf5dd';
gameBG.ctx.fillRect(0,77,1,243);
// air
gameBG.ctx.fillStyle = '#e8f0f0';
gameBG.ctx.fillRect(0,50,1,27);

// draw lines between
for(var i = 1; i < 32; i++) {
	gameBG.ctx.fillRect(0,i*10 - (i<7 ? i : 0),1,2);
	if(i===7) gameBG.ctx.fillStyle = '#d8f0d8';
};

stage.add(new Sprite(gameBG));
stage.get(0).width = 480;

// title screen
var titleScreen = new DisplayObjectContainer();
stage.add(titleScreen);

// ingame screen
var main = new DisplayObjectContainer();
stage.add(main);

// game menu
var menu = Box(10,10,100,220);
menu.visible = false;

// create menu
for(var i = 0; i < 5; i++) {
	main.add(new DisplayObjectContainer());
	var doc = main.get(i);
	doc.add(new Text(ingameMenu[i], bigfontBlack));
	doc.px = 120;
	doc.py = 10;
	doc.visible = false;
	menu.add( new Text(ingameMenu[i], [10], 10, 15 + i*25) );
	menu.get(i).click = function() { 
		var i = parseInt(this) || 0;
		showMenu(i);
	}.bind(i+0);
}
main.add( menu );

// save game button
menu.add( new Text("Save Game", [10], 10, 165) );
menu.get(5).click = save;

// load game button
menu.add( new Text("Load Game", [10], 10, 190) );
menu.get(6).click = load;

// show menu
function showMenu(i) {
	for(var j = 0; j < 5; j++) {
		main.get(j).visible = (i === j);
	}
	textbox.visible = false;
	confirmbox.visible = false;
	gameMenu[i]();
};

// create main
function showMain() {
	var doc = main.get(0);

	// initialize 
	if(doc.count < 2) {
		for(var i = 0; i < gaps.length; i += 3) {
			var id = floor(i/3);
			doc.add(Box(i%6 ? 180 : 0,30+floor(i/6)*70,170,60));
			var doc2 = doc.get(id+1);
			doc2.add(new Text('', bigfontWhite, 85, 15, 0.5));
			doc2.add(new Text('', tinyfontWhite, 85, 33, 0.5));
			doc2.click = function() {
				if(textbox.visible || confirmbox.visible) return;
				if(levels[this[0]]) randomBattle(this[1], this[2]);
				else if(levels[this[0]-1]) challengeGuardians(this[0]);
			}.bind([ id, gaps[i+1], gaps[i+2] ]);
		}
	}

	// update
	for(var i = 1; i < 9; i++) {
		var unlocked = !!levels[i-1];
		var check = unlocked || !!levels[i-2];
		var doc2 = doc.get(i);
		doc2.alpha = check ? 1 : 0.6;
		doc2.button = check;
		
		var id = (i-1)*3;
		if(unlocked) {
			doc2.get(0).setText(gaps[id]);
			doc2.get(1).setText('(Lv. ' + gaps[id+1] + (i>1 ? ' - ' + gaps[id+2] : '') + ')');
		} else {
			doc2.get(0).setText('- UNLOCK - ');
			doc2.get(1).setText('Challenge Guardian');
		}
	}
};

// create bag
function showBag() {
	var doc = main.get(1);
	
	// initialize 
	if(doc.count < 2) {
		doc.add(Box(0,30,350,270));
		for(var i = 0; i < 3; i++) {
			doc.add(new Text('', smallfontWhite, 15, 45 + i * 25));
		}
	}

	// update
	for(var i = 0; i < 3; i++) {
		doc.get(2+i).setText(itemDB[i][0]+" x "+items[i]);
	}
};

// create shop
function showShop() {
	var doc = main.get(3);
	
	// initialize 
	if(doc.count < 2) {
		doc.add(new Text('', bigfontBlack, 350, 0, 1));
		doc.add(Box(0,30,350,180));
		for(var i = 0; i < 4; i++) {
			var item = itemDB[i];
			doc.add(new Text(item[0] + " ($" + item[2] + ")", bigfontWhite, 15, 45 + i * 40));
			doc.add(new Text(item[1], smallfontWhite, 15, 60 + i * 40));
			doc.add(new Text("Buy", bigfontWhite, 300, 45 + i * 40));
			doc.get(5+i*3).click = function() {
				var item = this;
				if(cash >= item[2]) {
					showConfirm("Buy " + item[0] + "?", function() {
						cash -= item[2];
						// only store first 3 items, heal all should be executed right away
						if(item[3]<3) {
							items[item[3]]++;
						} else {
							item[4]();
						}
						showShop();
					});
				} else {
					showText(["Not enough cash :("]);
				}
			}.bind(item);
		}
	}

	// update
	doc.get(1).setText('$' + cash);
};

// create Monsterdex
function showDex() {
	var doc = main.get(4);

	// initialize 
	if(doc.count < 2) {
		doc.add(Box(0,30,350,270));
		doc.add(Box(230,45,100,150,white));
		doc.add(new MovieClip(monsterTex,320,55,1,0));
		doc.add(new Text('', smallfont, 240, 125));
		doc.get(3).visible = false;
		doc.get(2).visible = false;
		for(var i = 0; i < 12; i++) {
			doc.add(new Text('', smallfontWhite, 15, 45 + i*20));
			doc.get(i+5).click = function() {
				var id = parseInt(this)||0;
				var check = dex.indexOf(id)>-1;
				if(check) {
					doc.get(3).goTo(id);
					doc.get(4).setText(monsterDB[id][0] + '\n\n'+ monsterDB[id][2]);
				}
				doc.get(4).visible = check;
				doc.get(3).visible = check;
				doc.get(2).visible = check;
			}.bind(i+0);
		}
	}

	// update
	for(var i = 0; i < 12; i++) {
		var entry = monsterDB[i];
		doc.get(i+5).setText(fillNumber(i+1,2) + '. ' + (dex.indexOf(i) > -1 ? entry[0] : "???"));
	}
};

// changing monster position
var swapping = null;

// update monsters page
function refreshMonsters(doc) {
	var isSwapping = swapping !== null;
	for(var i = 0; i < 22; i++) {
		var doc2 = doc.get(1+floor(i/11));
		var entry = monsters[i] || null;
		var id = (i%11) * 5;
		if(entry) {
			var c = [ 9.5, i === swapping ? 0xFFEE00 : (i < 6 ? 0x69FF1F : white) ],
				c2 = isSwapping ? c : [9.5, white, bold];
			doc2.get(id).setText(fillNumber(i+1,2) + '. ' + monsterDB[entry[0]][0], c);
			doc2.get(id+1).setText('HP ' + entry[6] + '/' + entry[3], c);
			doc2.get(id+2).setText('Lv ' + entry[1], c);
			doc2.get(id+3).setText('details', c2);
			doc2.get(id+4).setText(isSwapping ? "drop" : "swap", c2);
		}
		for(var j = 0; j <= 4; j++) {
			doc2.get(id+j).visible = !!entry;
		}
	}
};

// swap both entries
function swapMonster() {
	var doc = main.get(2);
	var id = parseInt(this) || 0;
	if(swapping !== null) {
		var tmp = monsters[swapping];
		monsters[swapping] = monsters[id];
		monsters[id] = tmp;
		swapping = null;
		refreshMonsters(doc);
	} else {
		swapping = id;
		refreshMonsters(doc);
	}
};

// currently viewing
var currSelected = 0;

// set details
function setDetails() {
	var doc = main.get(2);
	var details = doc.get(6);
	currSelected = parseInt(this)||0;
	if(swapping === null) {
		for(var i = 1; i < 6; i++) {
			doc.get(i).visible = i===5;
		}
		details.visible = true;

		var monster = monsters[currSelected];
		details.get(0).goTo(monster[0]);
		details.get(1).setText(monsterDB[monster[0]][0] + ' - Lv ' + monster[1]);
		details.get(2).setText('HP ' + monster[6] + ' / ' + monster[3]);
		details.get(3).setText('EXP ' + monster[11] + ' / ' + monster[12]);
		details.get(4).setText('ATK ' + monster[4]);
		details.get(5).setText('DEF ' + monster[5]);
		for(var i = 0; i < 4; i++) {
			var skill = skillDB[monster[7+i]] || null;
			details.get(6+i).visible = !!skill;
			if(skill) {
				details.get(6+i).setText('Skill ' + (i+1) + ': ' + skill[0] + (i>0 ? ' (' + monster[16+i] + ' /20)' : ''));
			}
		}
		details.get(10).visible = (monsters.length>1);
	}
};

// monsters page
function showMonsters() {
	var doc = main.get(2);

	// initialize 
	if(doc.count < 2) {
		doc.add(Box(0,30,350,270));
		doc.add(Box(0,30,350,270));
		doc.add(new Text('Next Page', bigfontBlack, 350, 0, 1));
		doc.add(new Text('Prev Page', bigfontBlack, 350, 0, 1));
		doc.add(new Text('Back', bigfontBlack, 350, 0, 1));
		doc.add(Box(0,30,350,270));

		// next button
		doc.get(3).click = function() {
			for(var i = 0; i < 5; i++) {
				doc.get(i).visible = !(i%2);
			}
		};

		// prev button
		doc.get(4).click = function() {
			showMonsters();
		};

		// back button on detzails page
		doc.get(5).click = function() {
			showMonsters();
		};

		// details page
		var detailsPage = doc.get(6);
		
		detailsPage.add(new MovieClip(monsterTex,15,15));
		for(var i = 0; i < 9; i++) {
			detailsPage.add(new Text('', smallfontWhite, 90, 15 + i * 22 + (i>4?40:i>0?20:0)));
		}
		detailsPage.add(Box(235,15,100,38,white));
		detailsPage.get(10).add( new Text("Remove", [ 10, 0, bold ], 13, 13) );
		detailsPage.get(10).click = function() {
			showConfirm("Are you sure you want to set this monster free?", function() {
				monsters.splice(currSelected,1);
				showMonsters();
			});
		};

		// fill pages
		for(var i = 0; i < 22; i++) {
			var doc2 = doc.get(1+floor(i/11));
			var y = 15 + (i%11)*22;
			doc2.add(new Text('', 0, 15, y));
			doc2.add(new Text('', 0, 170, y, 1));
			doc2.add(new Text('', 0, 230, y, 1));
			var details = new Text('', 0, 290, y, 1);
			doc2.add(details);
			details.click = setDetails.bind(i+0);
			var swap = new Text('', 0, 335, y, 1);
			doc2.add(swap);
			swap.click = swapMonster.bind(i+0);
		}
	}

	// update
	swapping = null;
	refreshMonsters(doc);
	
	for(var i = 1; i < 7; i++) {
		doc.get(i).visible = i<4 && i%2;
	}
};

// fill number with leading 0
function fillNumber(i,a) {
	var n = i + '';
	return n.length < a ? fillNumber('0'+n,a) : n;
};


// battle scene
var battle = new DisplayObjectContainer();
battle.visible = false;
stage.add(battle);

// text box
textbox = Box(10,230,460,80);
textbox.add( new Text("", null, 15, 15) );
textbox.add( new Text("next >", [ 9, white, bold ], 452, 72, 1, 1) );
textbox.visible = false;
stage.add( textbox );

// confirm box
confirmbox = Box(360,240,100,55,white);
confirmbox.add( new Text("Accept", [ 10, 0, bold ], 25, 10) );
confirmbox.add( new Text("Cancel", [ 10, 0, bold ], 25, 30) );
confirmbox.visible = false;
stage.add( confirmbox );

// show text
function showText( texts, ondone ) {
	confirmbox.visible = false;
	textbox.visible = true;
	textbox.get(0).setText( texts.shift() );
	textbox.get(1).visible = !!ondone;
	textbox.click = function() {
		if(!texts.length) {
			if(ondone) {
				textbox.visible = false;
				ondone();
			}
		} else {
			textbox.get(0).setText( texts.shift() );
		}
	};
	textbox.button = !!ondone;
};

// confirm dialog
function showConfirm( text, accept, cancel ) {
	textbox.visible = true;
	textbox.click = noop;
	textbox.button = false;
	textbox.get(0).setText( text );
	textbox.get(1).visible = false;
	confirmbox.visible = true;
	confirmbox.get(0).click = function() {
		textbox.visible = false;
		confirmbox.visible = false;
		accept();
	};
	confirmbox.get(1).click = function() {
		textbox.visible = false;
		confirmbox.visible = false;
		if(cancel) cancel();
	};
};

// show partner
function showPartners() {
	showText(["Click on one of the monsters."]);
	var partners = [];

	// spawn the 4 heroes
	for(var i = 0; i < 4; i++) {
		(function(i) {
			var data = monsterDB[i];
			var partner = new Sprite( monsterTex[i], 90 + 100*i, 120, 0.5, 0.5 );
			partner.data = data;
			partner.sx = 0.1;
			partner.sy = 0.1;

			// hero clicked
			partner.click = function() {
				showConfirm("Pick " + data[0] + "\n" + data[2].replace("\n", " "), function() {

					// add hero to monsters
					monsters.push( monsterData(i,1) );

					// remove all hero sprites
					for(i = 3; i >= 0; i--) {
						partners[i].remove();
					} 

					// show menu / main screen
					menu.visible = true;
					showMenu(0);
				});
			};
			main.add(partner);
			partners.push(partner);
		})(i);
	}

	// tween scale
	Tween(0.1,1, 500, function(s) {
		for(i = 0; i < 4; i++) {
			partners[i].sx = s;
			partners[i].sy = s;
		}
	});
};

// grab monster by slot id
function getMonster(i) {
	return {
		slot: i+0,
		stats: monsters[i],
		data: monsterDB[ monsters[i][0] ]
	};
};

// battle scene
var currEnemy = null;
var currMonster = null;
var curGap = [];
var rounds = 0;

// init stats/podest/monster
var data1 = initMonsters(125, 1),
	data2 = initMonsters(85, -1),
	stats1 = data1[0], 
	podest1 = data1[1], 
	yourMonster = data1[2], 
	stats2 = data2[0], 
	podest2 = data2[1], 
	yourEnemy = data2[2];

// init function
function initMonsters(py, sx) {

	// stats window
	var stats = new DisplayObjectContainer(0,200);
	stats.add(new Text('', smallfontBlack, 0, 0));
	stats.add(new Text('', smallfontBlack, 120, 0,1));
	stats.add(new Sprite(Block("#c00", 120, 6),0,15));
	stats.add(new Sprite(Block("#0c0", 120, 6),0,15));
	battle.add(stats);

	// podest
	var podest = createPodest(0,py,150,150);
	podest.height = 50;
	battle.add(podest);

	// monster
	var entity = new MovieClip(monsterTex,0,0,0.5,0.5);
	entity.sx = sx;
	battle.add(entity);

	return [stats, podest, entity];
};

// tame ball sprite
var tameball = new Sprite('m', 100, 280, 0.5, 0.5);
battle.add(tameball);

// combat menu
var combatMenu = Box(10,230,460,80);
for(var i = 0; i < 4; i++) {
	combatMenu.add(new DisplayObjectContainer());
}

// combat menu callbacks
var combatMenuCallback = [
	setSkills,
	setItems,
	setMonsters
];

// change combat menu
function changeMenu(i) {
	for(var j = 0; j < combatMenu.count; j++) {
		combatMenu.get(j).visible = i === j;
	}
	if(combatMenuCallback[i]) combatMenuCallback[i]();
	textbox.visible = false;
	confirmbox.visible = false;
};

// escape from battle
var runAttempts = 0;
function runCheck() {
	var check = rand(100) <= (62+12*++runAttempts);
	if(check) {
		runAttempts = 0;
	}
	return check;
};

// combat menu
var m = combatMenu.get(3);
m.add( new Text("", null, 15, 15) );
m.add( new Text("Fight!", null, 150, 15) );
m.get(1).click = function() { changeMenu(0); };
m.add( new Text("Item", null, 300, 15) );
m.get(2).click = function() { changeMenu(1); };
m.add( new Text("Monsters", null, 150, 45) );
m.get(3).click = function() { changeMenu(2); };
m.add( new Text("Escape", null, 300, 45) );

// attack/item/monster menu
createCombatMenu(str2arr("Attack Item Monster"), [4,4,6]);
function createCombatMenu(names, n) {
	for(var i = 0; i < 3; i++) {
		var m = combatMenu.get(i);
		m.add( new Text("Pick "+names[i]+"!", null, 15, 15) );
		m.add( new Text("Back", null, 15, 45) );
		m.get(1).click = function() { changeMenu(3); };
		for(var j = 0; j < n[i]; j++) {
			m.add( new Text("", null, 150*(1+j%2), 15+(j>1?30:0)) );
		}
	}
};

// escape button
combatMenu.get(3).get(4).click = function() {
	changeMenu(null);
	if(runCheck()) {
		showText(["Escape was successful!"], stopBattle);
	} else {
		showText(["Escape failed!"], function() {
			enemyAttack();
		});
	}
};

battle.add(combatMenu);

// throw tameball
function throwball(check) {
	Tween(0, 170, 300, function(y,d) {
		tameball.py = 280 - y;
		tameball.px = 50+290/180*y;
		if(d) {
			tameball.canvas = Texture('n')[2];
			yourEnemy.visible = false;
			shakeBall(check);
		}
	});
};

// shake ball
function shakeBall(check, timer) {

	// slow down shakes
	if(timer === undefined) {
		return setTimeout(function() { shakeBall(check,1); }, 300);
	}

	// reset to middle of podest
	tameball.px = 340;

	// ball not shaking anymore
	if(!check[1]--) {
		tameball.canvas = Texture('m')[2];

		// successful catch
		if(check[0]) {
			sound.play('success');
			showText([ "Successful catch!" ], function() { 
				afterBall();
				randomBattle();
			});

		// failed catch
		} else {
			afterBall();
			sound.play('fail');
			showText([ "Failed to catch!" ], function() {
				enemyAttack();
			});
		}
	// shake
	} else {
		sound.play('shake');
		Tween(0, 6, 120, function(x,d) {
			tameball.px = 340 + x;
			if(d) {
				Tween(0, 12, 120, function(x,e) {
					tameball.px = 346 - x;
					if(e) {
						shakeBall(check)
					}
				});
			}
		});
	}
};

// unset ball
function afterBall() {
	tameball.px = 100;
	tameball.py = 280;
	yourEnemy.visible = true;
};

// update monster stats
function updateStats(n, stats, monster, data) {

	// own monster
	if(n===1) {
		stats = stats1;
		monster = yourMonster;
		data = currMonster;
		combatMenu.get(3).get(0).setText("What will\n" + data.data[0] + " do?");
	// enemy monster
	} else {
		stats = stats2;
		monster = yourEnemy;
		data = currEnemy;
	}
	monster.goTo(data.stats[0]);
	stats.get(0).setText(data.data[0]);
	stats.get(1).setText('Lv' + data.stats[1]);
	stats.get(3).width = (120*data.stats[6]/data.stats[3]) | 0;
};

// attack text
function showAttackText(entity, skill, dmg) {
	showText([
		entity.data[0] + " used " + skill[0] + "." + 
		(dmg.critical ? " Critical Hit!" : "") + 
		"\nIt was " + effective[floor(dmg.effectiveness)] + " effective!" 
	]);
	sound.play(skill[4]);
};

// enemy attacks
function enemyAttack() {

	// pick random skill
	var skill = null;
	for(var i = 0; i < 4; i++) {
		skill = skill || (rand(2) === 1 ? (skillDB[ currEnemy.stats[7+i] ] || null) : null);
	}
	if(!skill) skill = skillDB[0]; // use tackle if no skill picked

	// calculate damage
	var dmg = calcDamage(skill, currEnemy.stats, currMonster.stats);
	var predmg = currMonster.stats[6];
	currMonster.stats[6] -= dmg.damage;
	changeMenu(null);

	// inform player
	showAttackText(currEnemy, skill, dmg);

	// tween health / combat animation
	Tween(0, 120, 200, function(x,d) {
		stats1.get(3).width = max(0,(120*(predmg-(dmg.damage*x/120))/currMonster.stats[3]) | 0);
		yourEnemy.px = 330-x/6;
		yourMonster.visible = !(floor((x/60))%2);
		if(d) {
			yourEnemy.px = 330;
			setTimeout(afterEnemyAttack, 500);
		}
	});
};

// after enemy attack -> check death condition
function afterEnemyAttack() {
	rounds += 3;						// the more rounds fought, the more cash you earn

	// monster died
	if(currMonster.stats[6] <= 0) {
		currMonster.stats[6] = 0;

		// find monster in top 6 that still has health
		for(var i = 0; i < 6; i++) {
			var monster = monsters[i] || null;
			if(monster && monster[6] > 0) {
				currMonster = getMonster(i);
				break;
			}
		}

		// tween monster out of view
		Tween(130, 275, 100, function(y,d) { 
			yourMonster.py = y; 
			if(d) {

				// no monster left, game over, force refresh
				if(currMonster.stats[6] <= 0) {
					alert("Game over!");
					location.href='index.html';
					return;
				}

				// set new monster
				yourMonster.py = 130; 
				updateStats(1);
				setSkills();					
				changeMenu(3);
			}
		});

	// update monster
	} else {
		updateStats(1);
		changeMenu(3);
	}
};

// own monster attacks
function attack(skill) {
	runAttempts = 0;				// unset escape attempts

	// calculate damage
	var dmg = calcDamage(skill, currMonster.stats, currEnemy.stats);
	var predmg = currEnemy.stats[6];
	currEnemy.stats[6] -= dmg.damage;
	changeMenu(null);

	// inform player
	showAttackText(currMonster, skill, dmg);
	
	// tween attack/health
	Tween(0, 120, 200, function(x,d) {
		stats2.get(3).width = max(0,(120*(predmg-(dmg.damage*x/120))/currEnemy.stats[3]) | 0);
		yourMonster.px = 150+x/6;
		yourEnemy.visible = !(floor((x/60))%2);
		if(d) {
			yourMonster.px = 150;
			setTimeout(afterAttack, 500);
		}
	});
};

// after attack happened
function afterAttack() {

	// enemy is dead
	if(currEnemy.stats[6] <= 0) {
		// drop enemy
		Tween(90, 275, 100, function(y,d) { 
			yourEnemy.py = y; 
			if(d) afterBattle();
		});
	// enemy still alive, let enemy attack
	} else {
		enemyAttack();
	}
};

// enemy died, calculate rewards
function afterBattle() {

	// calc cash, min 2, max 10
	var gainCash = rand(min(rounds,10))+2;
	cash += gainCash;

	// calculate exp, based on amount of monsters used
	var exp = gainExp(true, currEnemy.stats[1], used.length);

	// generate all texts
	var texts = [ currEnemy.data[0] + " fainted!\nYou received $" + gainCash + "!" ];
	var text = [];

	// loop through all used monsters
	for(var j = used.length-1; j >= 0; j--) {
		var usedMonster = getMonster(used[j]);

		// monster is still alive -> claim reward
		if(usedMonster.stats[6]>0) {
			text.length = 0;
			text.push(usedMonster.data[0] + " gained " + exp + " Exp!");

			// monster is below level 100
			if(usedMonster.stats[1] < 100) {
				usedMonster.stats[11] += exp;

				// monster leveled up
				if(usedMonster.stats[11] >= usedMonster.stats[12]) {

					// calculate new stats
					usedMonster.stats = monsterData( usedMonster );
					monsters[usedMonster.slot] = usedMonster.stats;
					text.push(usedMonster.data[0] + " is now Level " + usedMonster.stats[1] + "!");

					// check for new skill
					for(var i = 0; i < skillDB.length; i++) {
						var skill = skillDB[i];

						// can learn normal skills and own type skills
						if(skill[2] === normal || skill[2] === usedMonster.stats[2]) {

							// check if level matches
							if(skill[3] === usedMonster.stats[1]) {
								text.push(usedMonster.data[0] + " learned " + skill[0] + "!");

								// find empty skill slot
								if(usedMonster.stats[8]<0) usedMonster.stats[8] = i+0;
								else if(usedMonster.stats[9]<0) usedMonster.stats[9] = i+0;
								else usedMonster.stats[10] = i+0;
							}
						}
					}
				}
				texts.push(text.join("\n"));
			}
		}
	}

	// inform player about rewards and either start new battle or unlock area
	showText(texts, function() { 
		if(!currEnemy.guardian) randomBattle();
		else {
			showText([ "New Area Unlocked!" ], stopBattle);
		}
	});
};

// combat menu -> fight
var skillfn = false;
function setSkills() {
	var stats = currMonster.stats;
	for(var i = 0, j = 7; i < 4; i++) {
		var text = combatMenu.get(0).get(i+2);

		// initialize
		if(!skillfn) {
			text.click = function() {
				if(this[0] === 15) {
					attack(skillDB[0]);
				} else if(currMonster.stats[this[0]]>0) {
					currMonster.stats[this[0]]--;
					attack(skillDB[currMonster.stats[this[1]]]);
				}
			}.bind([15+i,j+i]);
		}

		// update
		var skill = skillDB[ stats[j+i] ] || null;
		text.visible = !!skill;
		if(skill) text.setText(skill[0] + (i>0 ? ' ('+stats[15+i]+'/20)' : ''));
	}
	skillfn = true;
};

// combat menu -> items
var itemfn = false;
function setItems() {
	for(var i = 0; i < 3; i++) {
		var text = combatMenu.get(1).get(2+i);

		// initialize
		if(!itemfn) {
			text.click = function() {
				var id = parseInt(this) || 0;
				if(items[id]) {
					changeMenu(null); 
					items[id]--;
					var check = itemDB[id][4](currMonster.stats, currEnemy.stats);
					if(!check) {
						enemyAttack();
					} else {
						throwball(check);
					}
				}
			}.bind(i+0);
		}

		// update
		text.visible = items[i]>0 && !(currEnemy.guardian && i === 2);
		text.setText( itemDB[i][0] + ' (' + items[i] + ')'  );
	}
	itemfn = true;
};

// combat menu -> monsters
var monstersfn = false;
function setMonsters() {
	for(var i = 0, j = 0; i < 6; i++) {
		var text = combatMenu.get(2).get(2+i);
			text.visible = false;

		// initialize
		if(!monstersfn) {
			text.click = function() {
				var id = parseInt(this) || 0;
				changeMenu(null);
				currMonster = getMonster(id);
				updateStats(1);
				remove(used,currMonster.slot);
				used.push(currMonster.slot);
				showText([ "Go " + currMonster.data[0] + "!" ]);
				setTimeout(enemyAttack, 500);
			}.bind(i+0);
		}

		// update
		var monster = monsters[i] || null;
		if(monster && monster[6] > 0 && i !== currMonster.slot) {
			text.setText( monsterDB[monster[0]][0] + ' Lv' + monster[1] );
			text.px = 150 + j%3 * 95;
			text.py = 15 + floor(j/3) * 30;
			text.visible = true;
			j++;
		}
	}
	monstersfn = true;
};

// start battle
function startBattle(enemy, guardian) {

	// hide main container, show battle scene
	main.visible = false;
	battle.visible = true;
	changeMenu(null);

	// grab monster
	for(var i = 0; i < 6; i++) {
		currMonster = getMonster(i);
		if(currMonster.stats[6]>0) break;
	}

	// unset some data
	runAttempts = 0;
	rounds = 0;
	used.length = 0;
	used.push(currMonster.slot);

	// set enemy
	currEnemy = enemy;
	currEnemy.guardian = guardian;
	
	// update both monsters stats
	updateStats(1);
	updateStats(2);

	// show text at game start
	showText([(guardian ? "Guardian " : "Wild ") + currEnemy.data[0] + " appeared!"], function() {
		// open combat menu
		changeMenu(3);
	});

	// set monsters y-position
	yourMonster.py = 130;
	yourEnemy.py = 90;

	// tween monsters / podests / stats in
	Tween(0, 150, 500, function(x,d) {
		yourMonster.px = x;
		yourEnemy.px = 480-x;
		podest1.px = x-75;
		podest2.px = 405-x;
		stats1.px = x-130;
		stats2.px = 490-x;
		if(d) {
			combatMenu.visible = true;
		}
	});
};

// stop battle
function stopBattle() {
	// if enemy was guardian and enemy died, unlock.
	if(currEnemy.stats[6] <= 0 && currEnemy.guardian) {
		levels[currEnemy.guardian] = 1;
	}
	main.visible = true;
	battle.visible = false;
	showMenu(0);
};

// set skills for enemy 
function learnSkills(stats) {
	for(var i = 1; i < skillDB.length; i++) {
		var skill = skillDB[i];

		// same type
		if(skill[2] === normal || skill[2] === stats[2]) {

			// level matches
			if(skill[3] <= stats[1]) {

				// fill empty slot
				if(stats[8]<0) stats[8] = i+0;
				else if(stats[9]<0) stats[9] = i+0;
				else stats[10] = i+0;
			
			}
		}
	}
};

// start random battle
var count = 0;
function randomBattle(minLevel, maxLevel) {
	curGap[0] = minLevel || curGap[0];
	curGap[1] = maxLevel || curGap[1];
	x = !(++count%20) ? 0 : 4;					// all 20 rounds chance to encounter starter
	var id = x + rand(monsterDB.length - x);
	var enemy = {
		stats: monsterData(id, rand(curGap[0], curGap[1])),
		data: monsterDB[id]
	};
	learnSkills(enemy.stats);
	startBattle(enemy, 0);
};

// grab guardian data and start battle
function challengeGuardians(id) {
	var enemy = {
		stats: monsterData(guardians[id][0], guardians[id][1]),
		data: monsterDB[guardians[id][0]]
	};
	learnSkills(enemy.stats);
	startBattle(enemy, id);
};

// new game screen
function newgame() {
	titleScreen.visible = false;
	showText([ "It's dangerous to go alone.\nPlease pick a partner for your journey!" ], showPartners);
};

// save game data, requires localstorage
function save() {
	showConfirm("Save this Game?", function() {
		try {
			localStorage.setItem("save", JSON.stringify([items,cash,monsters,dex,levels]));
			showText(["Game Saved"], noop);
		} catch(e) {
			showText(["Saving failed."], noop);
		}
	});
};

// load game data, requires localstorage
function load() {
	showConfirm("Load previous save file?", function() {
		if(tryload()) {
			titleScreen.visible = false;
			menu.visible = true;
			showMenu(0);
		}
	});
};

// try to load data
function tryload() {
	try {
		var data = JSON.parse(localStorage.getItem("save"));
		if(data.length === 5) {
			items = data[0];
			cash = data[1];
			monsters = data[2];
			dex = data[3];
			levels = data[4];
		}
		return true;
	} catch (e) {
		showText(["Loading failed."],noop);
		return false;
	}
};

// title screen stuff
titleScreen.add(new Text("Chibi Battlemonsters", [ 22, 0, bold ], 240, 30, 0.5 ));
titleScreen.add(new Text("Gotta tame 'em all!", [ 13, 0, bold ], 240, 60, 0.5 ));
titleScreen.add(Box(170,130,140,45));
titleScreen.add(Box(170,180,140,45));
titleScreen.get(2).add(new Text("New Game", [ 13, white, bold ], 70, 13, 0.5 ));
titleScreen.get(3).add(new Text("Load Game", [ 13, white, bold ], 70, 13, 0.5 ));
titleScreen.add(new Text("(c) Sebastian Nette & Genevir Ensomo", smallfontBlack, 240, 290, 0.5 ));

titleScreen.get(2).click = newgame;
titleScreen.get(3).click = load;