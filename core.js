window.addEventListener("load",init,false);

let allowInput;
function init() {

	var game = new Phaser.Game("100", "100", Phaser.AUTO, "", { preload: preload, create: create });
	let score = 0;
	let scoreText;
	allowInput = true;

	let blockColors = [
		"0xff0000",
		"0xff9900",
		"0xffea00",
		"0xbfff00",
		"0x00c000",
		"0x6dffff",
		"0x3b77d8",
		"0x86009f",
		"0xee31e9"
	];
	let colorIndices = [];
	let colorGroups = [];
	let mainGroup;
	
	
	// Calculate what the maximum block size can be based on the screen size and grid size;
	let blockSize = Math.min( 
		window.innerWidth / config.game.grid.width,
		window.innerHeight / config.game.grid.height
	)
	console.log(blockSize);
	
	function preload () {

		game.load.spritesheet("block", "assets/sprites/block-grayscale-sheet.png",128,128,27);
		game.load.image("gridTile", "assets/sprites/gridtile.png");

	}

	function create () {
		
		// Decide color lookup table
		for (let i = 0; i < config.game.colors; i++){
			colorIndices.push(
				Math.floor(i * (blockColors.length / config.game.colors))
			);
		}
		console.log(colorIndices);
		
		// Create block groups
		mainGroup = new Phaser.Group(game);
		console.log(mainGroup);
		mainGroup.meta = {};
		mainGroup.meta.lookupArray = generateLookupArray();
		
		// Add blocks
		for (let x = 0; x < config.game.grid.width; x++){
			for (let y = 0; y < config.game.grid.height; y++){
				createBlock(x,y);
			}
		}
		
		// Add score tally
		scoreText = game.add.text(
			0, 0, "Score: 0", { 
				fontSize: "32px",
				fill: "#fff",
				boundsAlignH: "right"
			}
		);
		scoreText.setTextBounds(16, 16, window.innerWidth - 32, window.innerHeight - 32);
		
		// Add game over text
		gameOverText = game.add.text(
			0, 0, "GAME\nOVER", { 
				fontSize: "64px",
				fill: "#fff",
				boundsAlignH: "center",
				boundsAlignV: "center"
			}
		);
		gameOverText.visible = false;
		gameOverText.setTextBounds(16, 16, window.innerWidth - 32, window.innerHeight - 32);
	}
	
	function createBlock (x,y) {
		let block = game.add.sprite(x * blockSize, y * blockSize, "block");
		
		// Add animation
		block.animations.add('vanish');
		
		// Custom attributes
		block.meta = {};
		block.meta.x = x; // Tile position
		block.meta.y = y; // Tile position
		block.meta.groupIndex = Math.floor(Math.random()*colorIndices.length);
		block.meta.colorIndex = colorIndices[block.meta.groupIndex];
		
		// Custom function
		block.meta.checkAround = function(caller){
			
			let x = this.x;
			let y = this.y;
			
			if (caller.meta.checks.indexOf(this) === -1){ // Check caller if this block is already in the found objects
				caller.meta.checks.push(this); // If not, add it to the list
			} else {
				return; // If it is already found, stop searching.
			}
			
			let directions = [
				[x, y-1], // North
				[x, y+1], // South
				[x-1, y], // West
				[x+1, y]  // East
			];
			
			for (let dir of directions){
				if ( 
					!isOOB(dir[0],dir[1]) && 
					mainGroup.meta.lookupArray[ dir[0] ][ dir[1] ] != null &&
					mainGroup.meta.lookupArray[ dir[0] ][ dir[1] ].meta.groupIndex == this.groupIndex
				) {
					mainGroup.meta.lookupArray[ dir[0] ][ dir[1] ].meta.checkAround(caller);
				}
			}
		}

		block.meta.removeConnected = function(){
			score += this.checks.length*config.game.score.pointsPerBlock;
			if (this.checks.length >= config.game.score.bonusTreshold){
				score += config.game.score.bonusPoints;
			}
			scoreText.text = 'Score: ' + score;
			
			for (let i = 0; i < this.checks.length; i++){
				let block = mainGroup.meta.lookupArray[ this.checks[i].x ][ this.checks[i].y ];
				/* console.log(block); */
				mainGroup.meta.lookupArray[ this.checks[i].x ][ this.checks[i].y ] = null;
				block.animations.play("vanish",60,false);
				/* block.events.onAnimationComplete.add(function(){
					block.destroy();
				}); */
				setTimeout(function(){
					block.destroy();
				},600);
			}
			
			setTimeout(function(){ // Waiting for animation to end
				for (let col = 0; col < config.game.grid.width; col++){
					checkColumn(col);
				}
				
				checkForEmptyColumns();
				checkForGameOver();
				allowInput = true;
			},650);
		}
		
		// Attributes
		block.width = blockSize;
		block.height = blockSize;
		block.tint = blockColors[block.meta.colorIndex];
		
		// Input
		block.inputEnabled = true;
		block.events.onInputDown.add(function(object){ // On click
			console.log(object);
			if (allowInput){
				allowInput = false;
				object.meta.checks = [];
				object.meta.checkAround(object);
				if (object.meta.checks.length >= config.game.minimumConnected){ // Make sure there are same colored blocks connected
					object.meta.removeConnected();
				} else {
					allowInput = true;
				}
			}
		}, this);
		
		// Add it to group
		mainGroup.add(block)
		mainGroup.meta.lookupArray[x][y] = block;
			
	}
	
	// Check to see if coordinates are out of bounds
	function isOOB(x,y){
		return !(x >= 0 && y >= 0 && x < config.game.grid.width && y < config.game.grid.height);
	}
	
	function checkColumn(col){
		
		let dropDistance = 0;
		let newArray = []; // Create a new array to replace 
		for (let row = mainGroup.meta.lookupArray[col].length - 1; row >= 0; row--){
			let block = mainGroup.meta.lookupArray[col][row];
			if (block != null){
				block.position.y = block.position.y + dropDistance*blockSize;
				block.meta.y = block.meta.y + dropDistance;
				newArray.push(block);
			} else {
				dropDistance++;
			}
		}
		for (let d = 0; d < dropDistance; d++){
			newArray.push(null);
		}
		newArray.reverse();
		
		mainGroup.meta.lookupArray[col] = newArray;
	}
	
	function checkForEmptyColumns(){
		let emptyColumns = [];
		for (let i = mainGroup.meta.lookupArray.length - 1; i >= 0 ; i--){ // Go through columns in reverse order
			if ( mainGroup.meta.lookupArray[i][config.game.grid.height-1] == null ){ // If last object in array is null, column is empty
			
				mainGroup.meta.lookupArray.splice(i,1); // Remove column
				
				for (let r = i; r < mainGroup.meta.lookupArray.length; r++){ // Move blocks to the left
					mainGroup.meta.lookupArray[r].map((b) => {
						if (b != null){
							b.x = b.x - blockSize; // Move visually
							b.meta.x--; // Update meta
						}
					});
				}
				mainGroup.meta.lookupArray.push( nullColumn() ); // Add empty column at the end
			}
		}	
	}
	
	function checkForGameOver(){
		for (let x = 0; x < config.game.grid.width; x++){
			for (let y = 0; y < config.game.grid.height; y++){
				var block = mainGroup.meta.lookupArray[x][y];
				if (block != null){
					block.meta.checks = [];
					block.meta.checkAround(block);
					if (block.meta.checks.length >= config.game.minimumConnected){
						return;
					}
				}
			}
		}
		// If function has not returned yet, the game is over
		console.log("Game over");
		gameOverText.visible = true;
	}
};

function generateLookupArray(){
	let arr = [];
	for (let x = 0; x < config.game.grid.width; x++){
		arr.push([]);
		for (let y = 0; y < config.game.grid.height; y++){
			arr[x].push(null);
		}
	}
	return arr;
}

function nullColumn(){
	let c = [];
	c[config.game.grid.height - 1] = null;
	c.fill(null,0,config.game.grid.height);
	return c;
}