// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SoccerGame {
    struct Team {
        string name;
        uint256 score;
        mapping(address => bool) members;
    }

    Team public teamA;
    Team public teamB;
    bool public gameStarted;
    bool public gameEnded;

    event GameStarted();
    event GoalScored(string teamName);
    event GameEnded(string winner);

    modifier onlyGameNotStarted() {
        require(!gameStarted, "Game already started");
        _;
    }

    modifier onlyGameNotEnded() {
        require(!gameEnded, "Game has ended");
        _;
    }

    modifier onlyTeamMember(Team storage team) {
        require(team.members[msg.sender], "Caller is not a team member");
        _;
    }

    constructor(string memory _teamAName, string memory _teamBName, address[] memory _teamAMembers, address[] memory _teamBMembers) {
        teamA.name = _teamAName;
        teamB.name = _teamBName;

        for (uint256 i = 0; i < _teamAMembers.length; i++) {
            teamA.members[_teamAMembers[i]] = true;
        }

        for (uint256 i = 0; i < _teamBMembers.length; i++) {
            teamB.members[_teamBMembers[i]] = true;
        }
    }

    function startGame() public onlyGameNotStarted {
        gameStarted = true;
        emit GameStarted();
    }

    function scoreGoalA() public onlyGameNotEnded onlyTeamMember(teamA) {
        teamA.score += 1;
        emit GoalScored(teamA.name);
    }

    function scoreGoalB() public onlyGameNotEnded onlyTeamMember(teamB) {
        teamB.score += 1;
        emit GoalScored(teamB.name);
    }

    function endGame() public onlyGameNotEnded {
        gameEnded = true;
        string memory winner = "Draw";

        if (teamA.score > teamB.score) {
            winner = teamA.name;
        } else if (teamB.score > teamA.score) {
            winner = teamB.name;
        }

        emit GameEnded(winner);
    }
}