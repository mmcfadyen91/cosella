/*	app's Global Variables
 *	app.totCells     - Int Total # of cells on board
 *  app.currentLevel - Int Current level (1 - 4)
 *  app.totSolved    - Int Total # of solved Icons for current level
 *  app.totIcons     - Int Total # of Icons on board for current level
 *  app.first        - Object containing Data of first cell selected
 *  app.second       - Object containing Data of second cell selected
 *  app.score		 - Int Score in game
 *  app.gamePaused   - Boolean is the game paused.
 *	app.count        - Int time remaining in game
 *  app.timeLimit	 - Int total time in milliseconds allowed per level
 *  app.start        - Int starting id location on grid for current level
 *  app.rows         - Int # of rows for current level
 *  app.columns      - Int # of columns for current level
 *  app.reOrders     - Int # of reOrders remaining
 *  app.moreTime     - Int # of 10s time increases remaining
 */

//--------------------
// App - Main variable holding functions & variables for the game
var app = {

	//--------------------
	// init - Initializes the environment for the game
	init: function(){
	
		// 100 seconds per level
		app.timeLimit = 100000;
		
		// Initialize Timer counter
		app.count = app.timeLimit;
		$('#countdown').html(formatTime(app.count));
		// Initialize timer
		timer.set({ time : 10, autostart : false });

		// Initialize score
		app.score = 0; 	
		$('.totscore').html(app.score);

		app.gamePaused = false;	
		app.totCells = 144;

		// Start at level 1
		app.currentLevel = 1;
		var gamegrid = $('#gamegrid');

		// Start with 3 More Times
		app.moreTime = 3;
		$('#addMoreTime').text(app.moreTime);

		// Start with 2 reOrders
		app.reOrders = 2;
		$('#addReOrder').text(app.reOrders);

		// Build HTML used to append cells to grid
		var cellStart = '<div class=cell data-id="null" style="background-color: rgba(237,236,236,1)" id=';
		var cellNullStart = '<div class=cell data-id="null" style="background-color: transparent" id=';
		var cellEnd = "></div>";
		var cellHTML = '';

		// Append all the cells to the DOM
		for (var i = 1; i < app.totCells+1; i++) {
			if (app.getX(i) === 1 || app.getX(i) === 12 || app.getY(i) === 1 || app.getY(i) ===12)
				cellHTML = cellNullStart+i+cellEnd;
			else
				cellHTML =  cellStart+i+cellEnd;
			gamegrid.append(cellHTML);
			cellHTML = cellStart;
		}

		// Array to keep track of which Octocats have been used
		app.octocatTracker = Array();


		// Generate Icons & draw to board
		app.buildIcons(app.currentLevel);
	},

	// Event Listeners
	//--------------------
	eventListeners: function(){
		
		var select = false; // Have we selected one already?

		// Clicking on a cell
		//--------------------
		$('.cell').on('click', function(event){
				
			event.preventDefault();
			var selectedCell = $(this);
			var selectedCellData = selectedCell.data();

			// If we clicked on a selectable cell
			// Data-id null if solved or empty
			if(selectedCellData.id !== null){
				// Make sure timer is running
				if (!timer.isActive){
					timer.play(true);
				}
				// If first click
				if (select === false){
					select = true;
					selectedCell.addClass("selected");
					app.first = selectedCellData;
				} 
				// 2nd click
				else { 
					// Make sure not selecting same cell
					if (app.getId(selectedCellData.x,selectedCellData.y) === app.getId( app.first.x, app.first.y) ){
						// If selected same class, removed selected, reset to 1st click
						selectedCell.removeClass('selected');
						select = false;
					}
					else{
						// Reset clicks and check if its a Match
						select = false;
						app.second = selectedCellData;
						app.checkMatch();
					}
				}
			}
		});

		// Modal functionality
		//--------------------
		function closeModal() {
			// If game was paused, resume clock! no cheating
			if (app.gamePaused === true){
				timer.play();
			}
			$(".overlay").fadeOut();
		}

		// Quickly close modal
		$(".overlay").on("click", function(){
			// Only class with close is Instructions
			if ($(this).hasClass("close")) {
				closeModal();
			}
		});

		// Next level
		$('#nextLvl').on('click', function(){
			$('#nextLevel').fadeOut();
			app.buildIcons(app.currentLevel);
		});

		// Game Over
		$('.playAgain').on('click', function(){
			app.restartGame();
		});

		// HighScores

		$('#highScores').on('click', function() {
			app.highScores();
		});

		// Submitting your score button
		$('#submitScore').on('click', function() {
			var twitter =$('#inputTwitter').val();
			var name = $('#inputName').val();

			// Make sure you remember to add a name
			if (name === ''){
				app.displayMessage('error');
			}
			else {
				// If you have no twitter handle or forgot
				if( twitter === '')
					twitter = '@mattmcfad'; // then we're using mine!
				app.submitScore(name, twitter);
			}

		});

		// Footer buttons
		//--------------------
		$('#moreTime').on("click", function(){
			if (app.moreTime !== 0)
				app.addMoreTime();
		});

		// reOrders the board and depletes a usage
		$('#reOrder').on("click", function(){
			// If we haven't ran out of re Orders allowed
			if (app.reOrders !== 0){
				app.reOrder(app.rows,app.columns,app.start);
				app.reOrders--;
				// Add depleted if we ran out now
				if (app.reOrders === 0){
					$('#reOrder').addClass('depletedButton');
				}
				$('#addReOrder').text(app.reOrders);
			}
		});

		$("#instruct").on("click", function(){
			app.instructions();
		});

	},// eventListeners

	//--------------------
    // After game reset need to reApply Event Handlers for cells (which are reset)
    // but also need to remove the button's event handlers
    // else buttons will be doubly pressed
	removeEventHandlers: function() {
		$('button').off();
	},

	//--------------------
	// buildIcons - function that evenly generates all icons and draws to grid
	// @param level - int representing which level in game 
	buildIcons: function(level){

		app.totSolved = 0;  // Reset # of solved icons

		var distribution,   // Array representing # of times each icon has been Drawn
		    totDistributed, // Int keeps track of total number of icons drawn
		    totalOutput,    // Int Total # of icons to be outputed
		    rows, columns,  // Int rows & columns on grid
		    icon,           // Object retrieved from icons.js containing id and color/background
		    odd,            // Boolean determining if found any odd icons
		    start,          // Starting location of where to start drawing icons
		    selector,       // String representing # for jQuery calls
		    sum;            // Int that determines which id on board to target

		//--------------------
		// Init - Initialize build depending which level game is on
		// @param level - which level game is on
		function init(level){

			distribution = new Array(icons.length);
			for (var k = 0; k < icons.length; k++) {
				distribution[k] = 0;
			}

			// Maximum rows*cols = 10x10
			if (level > 4)
				level = 4;

			switch(level) {
				case 1: 
					start = 40;
					rows = 6;
					columns = 6;
					break;
				case 2:
					start = 27;
					rows = 8;
					columns = 8;
					break;
				case 3:
					start = 26;
					rows = 8;
					columns = 10;
					break;
				case 4:
					start = 14;
					rows = 10;
					columns = 10;
					break;
			}

			totalOutput =  rows * columns;
			app.totIcons = totalOutput; // Total # of icons to be solved
			totDistributed = 0; // Reset total icons distributed to grid
			selector = '#';
			// Assign globaly for re-Order
			app.start = start;
			app.rows = rows;
			app.columns = columns; 
		}

		init(level);

		// Iterate through all cells on current level
		for (var i = 0; i < columns; i++) {
			for(var j = 0; j < rows; j++){
				// calculate which id on grid
				sum = start + i + j*12; 
				var sel = $(selector+sum); 
				
				// Ensure everything has a match when close to limit
				if (totalOutput - totDistributed <= icons.length){

					odd = false; // Test if found odd # of a distributed icon
					
					// Iterate through distribution and test to see what is odd
					for (var k = 0; k < distribution.length; k++){

						// If odd number distributed, get that icon to even out
						if (distribution[k] % 2 === 1 ){
							icon = icons[k];
							
							odd = true;
							break;
						}
					}
					// Else all icons are evenly distributed
					if (odd === false){
						// Get random icon
						icon = app.getIcon();						
					}
				}

				else 
					icon = app.getIcon();

				// Increase tot distributed for that particular Icon
				distribution[icon.id]++; 
				// Increase total icons distributed
				totDistributed++;
				
				// Change from Color to Background-Image
				//--------------------
				//var color = icon.color;
				//sel.css('background-color',color);
				//sel.data('id',color);

				var img = "url(images/icons/" + icon.img+".png)";
				sel.css('background-image',img);

				// Assign data attributes to DOM
				sel.data('id',icon.img);
				sel.data('solved',false);
				sel.data('x',app.getX(sum));
				sel.data('y',app.getY(sum));

			}	
		}

		// We have even distribution but last 4-12 cells are repeats side by side
		// Re order so its more random
		app.reOrder(rows, columns, start);

	}, // BuildIcons

	//--------------------
	// Randomly select an Icon
	// @return Object - Icon from Icons.js
	getIcon: function() {
		var rand = Math.floor((Math.random() * (icons.length)));
		return icons[rand];
	},

	//--------------------
    // Get's the appropriate octocat to displayed on Next Level Modal
	// @return Obj - structure of an Octocat with img, quote and button quote
	getOctocat: function() {

		//only got octocats.length dude!
		if (app.currentLevel >= octocats.length)
			return octocats[octocats.length-1];

		// Ordering starts at 1, then need to get last level so subtract again
		return octocats[app.currentLevel-2];

		
		/* 	// Randomly select an Octocat for next level

		var rand = Math.floor((Math.random() * (octocats.length)));
		
		// Ensure that we are getting an octocat that hasn't already been used
		if (!app.octocatTracker.contains(rand)){
			app.octocatTracker.push(rand);
			return octocats[rand].img;
		}
		// If it has been used then try again!
		else
			return app.getOctocat();

		*/
	},

	//--------------------
	// If id % 12 = 0 then on 12th column, return 12, else return id % 12
	// @param id - represents an position on the grid from 1-144
	// @return int - An x coordinate representing which column the icon is on 
	getX: function(id) {
		return (id % 12 === 0) ? 12 : id % 12; 
	},

	//--------------------
	// Return which row cell falls on based on 12 cells in a row
	// @param id - represents an position on the grid from 1-144
	// @return int - An y coordinate representing which row the icon is on
	getY: function(id) {
		return Math.ceil(id/12);
	},

	//--------------------
	// Get a cell's id based on x & y coordinates
	// @param x - int represent x coordinate on grid
	// @param y - int represent y coordinate on grid
	// @return int - representing id on grid (1-144)
	getId: function(x,y){
		// Y ordering starts at 1, account for this
		return(x + 12 * (y-1));
	},

	//--------------------
	// Increase score after match
	increaseScore: function(){
		// Each match increases score by 10
		app.score += 10;
		$('.totscore').html(app.score);
	},

	//--------------------
	// Check if two cell's selected match each other
	checkMatch: function(){

		// Remove selected Animation
		$('.cell').removeClass('selected');
		
		// If they are both the same icon
		if (case0.test(app.first,app.second) === true){
			// If they are both on same X or Y axis
			if (case1.test(app.first,app.second) === false)
				// If they can be matched through U or L shaped paths
				if(case2.test(app.first,app.second) === false)
					// Attempt to match through Zig-Zag pattern
					case3.test(app.first,app.second);
		}
		//else 
		//	console.log("Try to select the same Icon"); // Not same Icon
	},

	//--------------------
	// Successfully matched two cells, update their data fields & remove BG
	// @param first - Obj containing the first selected cell's data object
	// @param second - Obj containing the second selected cell's data object
	matchSuccess: function(first,second) {
		cell1 =  $('#'+app.getId(first.x,first.y));
		cell2 =  $('#'+app.getId(second.x,second.y));

		// If we matched robot than add another more time!
		if (cell1.data('id') === 'Qbert'){
			app.moreTime++;
			if (app.moreTime !== 0){
				$('#moreTime').removeClass('depletedButton');
			}
			$('#addMoreTime').text(app.moreTime);
		}

		cell1.data('solved',true);
		cell1.data('id',null);
		cell2.data('solved',true);
		cell2.data('id',null);
		cell1.css('background-color','rgba(237,236,236,1)');
		cell2.css('background-color','rgba(237,236,236,1)');
		cell1.css('background-image', 'none');
		cell2.css('background-image', 'none');

		// Just matched two squares.
		app.totSolved = app.totSolved + 2;

		app.increaseScore();

		app.testLevelCompletion();

	},


	//--------------------
	// Test if we've matched all the icons for the level
	// Increment level if so
	testLevelCompletion: function() {

		if (app.totSolved === app.totIcons) {
			timer.stop();
			$('#countdown').removeClass('lowTime');

			// Remaining time added to score
			var bonusPoints = parseInt(formatTime(app.count));	
			app.score += bonusPoints;

			app.currentLevel++;

			var timeReduced = 0;
			// After level 4 reduce time incrementally by 10 seconds
			if (app.currentLevel > 4) {
				timeReduced = (app.currentLevel - 4) * 10 * 1000;
			}

			// Reset Re-orders
			app.reOrders = 2;
			if (app.reOrders !== 0)
				$('#reOrder').removeClass('depletedButton');
			$('#addReOrder').text(app.reOrders);

			// Reset time
			app.count = app.timeLimit - timeReduced;
			// After level 13 you only have 10 seconds....
			if (app.count <= 0)
				app.count = 10000;
			$('#countdown').html(formatTime(app.count));
			
			app.nextLevel();
		}
	},


	//--------------------
	// Display Next Level modal with a new Octocat
	nextLevel: function() {
		$('#nextLevel').fadeIn();
		$('.totscore').html(app.score);

		var octocat = app.getOctocat();

		var image = 'images/octocats/' + octocat.img;
		var quote = octocat.msg;
		var button = octocat.button;
		
		$('#octocat').attr('src',image);
		$('#quote').text(quote);
		$('#nextLvl').text(button);
	},


	//--------------------
	// ReOrder all the icons currently displayed on grid
	// Ensure all solved positions are not redrawn to
	// @param rows - int # of rows for current level
	// @param columns - int # of columns for current level
	// @param start - int id position on grid from where we draw from
	reOrder: function(rows,columns,start) {

		// Which id's are unsolved?
		var idsUsed = Array();
		
		// Which icons have we used? 
		var iconsUsed = Array();
		
		// Out of the icons we have used, which have we reOrdered?
		var iconsDistributed = Array();
		
		// Sum refers to calculated id
		var sum, selector = '#';

		//--------------------
		// Get an index representing an icon that hasn't been distributed
		function randomNumber() {
			var rand = Math.floor((Math.random() * (iconsUsed.length)));

			// make sure the number hasn't been already distributed
			if (!iconsDistributed.contains(rand)){
				iconsDistributed.push(rand);
				return rand;
			}
			else // Else try again
				return randomNumber(length);
		}

		// Iterate through all cells and find all unsolved cells
		for (var i = 0; i < columns; i++) {
			for(var j = 0; j < rows; j++){
				sum = start + i + j*12; //id on grid
				var sel = $(selector+sum);

				// If the square has not been solved
				if (sel.data().id !== null){
					// Add id & Icon to arrays 
					
					idsUsed.push(sum);
					iconsUsed.push(sel.data().id);
				}
			}
		}

		// Iterate through all unsolved Cells
		for (var k = 0; k < idsUsed.length; k++){
			
		 	var select = $(selector+idsUsed[k]);

		 	// get and Icon that hasn't been distributed yet
		 	var icon = randomNumber();
		 	//console.log(idsUsed[k] + " col: " + iconsUsed[color]);
		 	select.data('id',iconsUsed[icon]);
		 	//select.css('background-icon', iconsUsed[icon]);
		 	var img = "url(images/icons/" + iconsUsed[icon]+".png)";
		 	select.css('background-image', img);

		}

	},

	//--------------------
	// Add 10 seconds to game and deduct 1 usage
	addMoreTime: function() {
		// Deduct usage
		app.moreTime--;
		// If 0 then make button depleted
		if (app.moreTime === 0){
			$('#moreTime').addClass('depletedButton');
		}
		// Update text
		$('#addMoreTime').text(app.moreTime);
		// Increase time by 10 seconds
		app.count = app.count + 10000;
	},

	//--------------------
	// Display instructions Modal and pause the game
	instructions: function() {
		app.gamePaused = true;
		timer.pause();
		$('#instructions').fadeIn();
	},

	//--------------------
	// Display Game Over modal
	gameOver: function() {
		$('#timesUp').fadeIn();
		$('#gameOverOcto').attr('src','images/octocats/gameover.png');

	},

	//--------------------
	// Restart the game
	restartGame: function() {
		// Reset Divs
		$('#gamegrid').html('');
		
		// stop Timer
		timer.pause();
		// Reset Game
		app.init();
		// Reset DB
		firebase.init();
		// Remove button event handlers to prevent double click
		app.removeEventHandlers();
		// Re-enable all event handlers
		app.eventListeners();

		// Reset input, close modals, remove animation
		$('#countdown').removeClass('lowTime');
		$('button').removeClass('depletedButton');
		$('#highScore').fadeOut();
		$('#timesUp').fadeOut();
		$('input').val('');
	},

	//--------------------
	// High Scores page
	highScores: function() {
		$('#highScore').fadeIn();
		firebase.parseScore(app.score, app.currentLevel);
		firebase.getHighscores();
		$('#timesUp').hide();
		$('#submitScore').show();
	},
	//--------------------
	// Push to Firebase Database
	// @param name - String user submitted name
	// @param twitterHandle - String user submitted, default @mattmcfad
	submitScore: function(name, twitterHandle) {

		firebase.push(name, twitterHandle, app.currentLevel, app.score);
		$('#submitScore').fadeOut();
		app.displayMessage('submit');
	},

	//--------------------
	// Display either Error or Submit modal
	displayMessage: function(msg) {
		$('#'+msg).show();
		// Show only for 1.5 seconds
		setTimeout(function() {
			$('#'+msg).fadeOut();
		}, 1500);
	}
			

}; // app

$(document).ready(function(){
	
	app.init();
	firebase.init();
	app.eventListeners();

});

//--------------------
// Prototype function that tests if an object is contained in an Array
Array.prototype.contains = function ( needle ) {
		for (var i in this) {
			if (this[i] == needle) return true;
		}
		return false;
};