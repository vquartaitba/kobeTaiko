const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SoccerGame", function () {
  let SoccerGame;
  let soccerGame;
  let owner, teamAPlayer1, teamAPlayer2, teamBPlayer1, teamBPlayer2;
  let teamAMembers, teamBMembers;

  before(async function () {
    [owner, teamAPlayer1, teamAPlayer2, teamBPlayer1, teamBPlayer2] = await ethers.getSigners();

    teamAMembers = [teamAPlayer1.address, teamAPlayer2.address];
    teamBMembers = [teamBPlayer1.address, teamBPlayer2.address];

    SoccerGame = await ethers.getContractFactory("SoccerGame");
    soccerGame = await SoccerGame.deploy("Team A", "Team B", teamAMembers, teamBMembers);
    await soccerGame.waitForDeployment();
  });

  it("should start the game", async function () {
    await soccerGame.startGame();
    expect(await soccerGame.gameStarted()).to.be.true;
  });

  it("Team A player should score a goal", async function () {
    await soccerGame.connect(teamAPlayer1).scoreGoalA();
    expect((await soccerGame.teamA()).score).to.equal(1);
  });

  it("Team B player should score a goal", async function () {
    await soccerGame.connect(teamBPlayer1).scoreGoalB();
    expect((await soccerGame.teamB()).score).to.equal(1);
  });

  it("should end the game and declare a draw", async function () {
    await soccerGame.endGame();
    expect(await soccerGame.gameEnded()).to.be.true;
  });
});