let config = {};

config.game = {};
config.game.minimumConnected = 2;
config.game.colors = 3; // Max 9

config.game.score = {};
config.game.score.pointsPerBlock = 1;
config.game.score.bonusPoints = 5;
config.game.score.bonusTreshold = 5; // If you clear this many (or more blocks) you will be awarded bonusPoints

config.game.grid = {};
config.game.grid.width = 10;
config.game.grid.height = 16;
config.game.grid.show = true;
