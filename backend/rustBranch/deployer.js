const fs = require('fs');
const axios = require('axios');
const { exec } = require("child_process");
const path = require('path');
const projectDir = __dirname;

function runCommand(command) {
    return new Promise((resolve, reject) => {
      const process = exec(command,{cwd:projectDir}, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          return resolve(stderr || stdout); // En lugar de rechazar, resolver con salida de error
        }
        resolve(stdout);
      });
  
      process.stdout.on("data", (data) => {
        console.log(data.toString());
      });
  
      process.stderr.on("data", (data) => {
        console.error(data.toString());
      });
    });
}


async function deployToSolana() {
    const deployDevNetCommand =  "anchor deploy --provider.cluster devnet";
    const deployResults = await runCommand(deployDevNetCommand);
    const regex = /Program Id: (\w+)/;
    const deployedAddress = deployResults.match(regex)[1];

    if (deployedAddress) {
        console.log(`Contract deployed at ${deployedAddress}`);
        return deployedAddress;
      } else {
        console.error('Failed to extract deployed contract address.');
        return null;
      }
}

module.exports = { deployToSolana};

