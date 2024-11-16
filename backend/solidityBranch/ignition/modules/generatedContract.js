const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("SoccerGameModule", (m) => {
    const teamAName = m.getParameter("teamAName", "Team A");
    const teamBName = m.getParameter("teamBName", "Team B");
    const teamAMembers = m.getParameter("teamAMembers", []);
    const teamBMembers = m.getParameter("teamBMembers", []);
    
    const soccerGame = m.contract("SoccerGame", [teamAName, teamBName, teamAMembers, teamBMembers]);

    return { soccerGame };
});