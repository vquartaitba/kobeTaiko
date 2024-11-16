const fs = require("fs");
const axios = require("axios");
const { exec } = require("child_process");
const path = require("path");
const io = require("socket.io")(3002, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});
const chalk = require("chalk");

const apiKey = OPENAI_API_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const projectDir = __dirname; // Directorio del proyecto Hardhat
const hardhatConfigPath = path.join(projectDir, "hardhat.config.js"); // Usar ruta absoluta
const conclusionDirPath = path.join(projectDir, "conclusion"); // Usar ruta absoluta

// Redirect console.log and console.error
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function (...args) {
  io.emit("console_log", args.join(" "));
  originalConsoleLog.apply(console, args);
};

console.error = function (...args) {
  io.emit("console_error", args.join(" "));
  originalConsoleError.apply(console, args);
};

async function generateMessage(prompt, model) {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: model,
        messages: [
          {
            role: "system",
            content:
              "You are an AI model specialized in blockchain technology, in creating smart contracts, tests, and detecting solidity versions given a contract. You will answer ONLY with the task you are provided.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 1500,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    let content = response.data.choices[0].message.content.trim();

    // Limpieza del código generado
    content = content
      .replace(/```(solidity|javascript)?/g, "")
      .replace(/```/g, "")
      .trim();

    return content;
  } catch (error) {
    console.error("Error generating message:", error);
    throw error;
  }
}

function logSeparator(message) {
  console.log("\n" + chalk.cyan("=".repeat(50)));
  console.log(chalk.cyan.bold(message));
  console.log(chalk.cyan("=".repeat(50)) + "\n");
}

function runCommand(command, stepName) {
  return new Promise((resolve, reject) => {
    let output = "";
    const process = exec(
      command,
      { cwd: projectDir },
      (error, stdout, stderr) => {
        if (error) {
          console.error(chalk.red(`Error in ${stepName}: ${error.message}`));
          return resolve(stderr || stdout);
        }
        resolve(output);
      }
    );

    process.stdout.on("data", (data) => {
      output += data.toString();
    });

    process.stderr.on("data", (data) => {
      output += chalk.yellow(data.toString());
    });

    process.on("close", () => {
      logSeparator(`Output for ${stepName}`);
      console.log(chalk.green(output));
    });
  });
}

// Función exportable principal
async function generateSmartContract(inputTask) {
  try {
    console.log(`Generating Solidity code for task: ${inputTask}`);

    // Step 1: Generate Solidity code
    let solidityPrompt = `Generate a Solidity smart contract code for the following task: ${inputTask}. Answer ONLY with the Solidity smart contract code. Don't add ANYTHING else`;
    let solidityCode = await generateMessage(solidityPrompt, "gpt-4o");

    // Save the generated Solidity code to a file
    const solidityFilePath = path.join(
      projectDir,
      "contracts",
      "generatedContract.sol"
    ); // Usar ruta absoluta
    fs.writeFileSync(solidityFilePath, solidityCode);
    // console.log(`Solidity code saved to ${solidityFilePath}`);
    console.log("First iteration of solidity code generated");
    // Step 2: Generate JavaScript tests
    const testPrompt = `
Generate a JavaScript test script using ethers 6.13.2 for the following Solidity code:
\n\n${solidityCode}\n\n
Make sure to:
1. Use "ethers.parseEther" instead of "ethers.utils.parseEther".
2. Don't use deployed(), use waitForDeployment() after using deploy() in another place since we are using a newer version of ethers.
3. Use "closeTo" when comparing balances after a transaction to account for gas costs.
4. Answer ONLY with the COMPLETE code for the JavaScript file that will go in the Hardhat project and test using Mocha. Don't include any explanations or extra text.
`;
    let testCode = await generateMessage(testPrompt, "gpt-4o");

    // Save the generated test code to a file
    const testFilePath = path.join(projectDir, "test", "generatedContract.js"); // Usar ruta absoluta
    fs.writeFileSync(testFilePath, testCode);
    // console.log(`Test script saved to ${testFilePath}`);

    // Step 3: Detect Solidity version and modify Hardhat config
    const versionPrompt = `Detect the Solidity version used in the following Solidity code. Answer ONLY with the Solidity version number. Be sure that the number you provide is the version detected in the code. Only answer with the code, NEVER answer with this ^ symbol. Code: \n\n${solidityCode}`;
    const solidityVersion = await generateMessage(versionPrompt, "gpt-4o-mini");
    // console.log(`Detected Solidity version: ${solidityVersion}`);

    // Read and update the Hardhat config file
    let hardhatConfig = fs.readFileSync(hardhatConfigPath, "utf-8");
    hardhatConfig = hardhatConfig.replace(
      /solidity: "\d+\.\d+\.\d+"/,
      `solidity: "${solidityVersion}"`
    );
    fs.writeFileSync(hardhatConfigPath, hardhatConfig);
    // console.log(`Hardhat config updated with Solidity version ${solidityVersion}`);

    // Step 4: Compile contracts
    console.log("Compiling contracts...");
    await runCommand("npx hardhat compile", "Compilation");

    // Step 5: Run tests
    logSeparator("Running initial tests");
    const testResults = await runCommand("npx hardhat test", "Initial Tests");

    console.log("Tests completed, analyzing results.");

    // Verificar si los tests han pasado todos
    if (testResults.includes("passing") && !testResults.includes("failing")) {
      // Todos los tests han pasado, generar la conclusión final
      const finalConclusionPrompt = `
Based on the following input task, Solidity code, test code, and final test results, generate a final conclusion about the quality and correctness of the smart contract:
Input task: ${inputTask}

Final Solidity code:
\`\`\`solidity
${solidityCode}
\`\`\`

Test code:
\`\`\`javascript
${testCode}
\`\`\`

Final test results:
\`\`\`
${testResults}
\`\`\`

Answer ONLY with the final conclusion.
`;
      const finalConclusion = await generateMessage(
        finalConclusionPrompt,
        "gpt-4o-mini"
      );

      // Check if the conclusion directory exists, if not, create it
      if (!fs.existsSync(conclusionDirPath)) {
        fs.mkdirSync(conclusionDirPath, { recursive: true });
      }

      // Save the final conclusion to a file
      const conclusionFilePath = path.join(
        conclusionDirPath,
        "finalConclusion.txt"
      );
      fs.writeFileSync(conclusionFilePath, finalConclusion);
      // console.log(`Final conclusion saved to ${conclusionFilePath}`);

      // Return the final Solidity code and conclusion
      return { solidityCode, finalConclusion };
    }

    // Step 6: Generate conclusion for improvements based on test results (si algún test falla)
    const conclusionPrompt = `
Based on the following Solidity code, its corresponding tests, and the test results, generate a conclusion that outlines specific improvements that should be made to the Solidity code:
Solidity code:
\`\`\`solidity
${solidityCode}
\`\`\`

Test code:
\`\`\`javascript
${testCode}
\`\`\`

Test results:
\`\`\`
${testResults}
\`\`\`

Answer ONLY with the specific improvements that should be made to the Solidity code.
`;
    const improvementConclusions = await generateMessage(
      conclusionPrompt,
      "gpt-4o"
    );

    // Step 7: Improve Solidity code based on improvement conclusions
    const improvementPrompt = `
Based on the following Solidity code and the following conclusions, generate an improved version of the Solidity contract:
Solidity code:
\`\`\`solidity
${solidityCode}
\`\`\`

Improvement conclusions:
\`\`\`
${improvementConclusions}
\`\`\`

Answer ONLY with the improved Solidity code. Don't add any extra text beside the code.
If the instructions don't specify any improvement needed for the Solidity contract just send the same contract, don't add any more text if they include, improve the code.
`;
    solidityCode = await generateMessage(improvementPrompt, "gpt-4o");

    // Save the improved Solidity code to a file
    fs.writeFileSync(solidityFilePath, solidityCode);
    // console.log(`Improved Solidity code saved to ${solidityFilePath}`);
    console.log("Improved Solidity smart contract generated");
    // Step 8: Generate improved JavaScript tests based on new Solidity code
    const newTestPrompt = `
Given the following improved Solidity code and the previous test code along with the improvement conclusions, generate a new JavaScript test script using ethers 6.13.2. Ensure the new tests cover the updated contract functionality:
Improved Solidity code:
\`\`\`solidity
${solidityCode}
\`\`\`

Previous Test code:
\`\`\`javascript
${testCode}
\`\`\`

Improvement conclusions:
\`\`\`
${improvementConclusions}
\`\`\`

Make sure to:
1. Use "ethers.parseEther" instead of "ethers.utils.parseEther".
2. Don't use deployed(), use waitForDeployment() after using deploy() in another place since we are using a newer version of ethers.
3. Use "closeTo" when comparing balances after a transaction to account for gas costs.
4. Answer ONLY with the COMPLETE code for the JavaScript file that will go in the Hardhat project and test using Mocha. Don't include any explanations or extra text.
`;
    testCode = await generateMessage(newTestPrompt, "gpt-4o");

    // Save the new test code to a file
    fs.writeFileSync(testFilePath, testCode);
    // console.log(`New test script saved to ${testFilePath}`);

    // Step 9: Re-compile contracts
    console.log("Re-compiling contracts...");
    await runCommand("npx hardhat compile", "Re-compilation");

    // Step 10: Re-run tests
    logSeparator("Re-running tests after improvements");
    const finalTestResults = await runCommand(
      "npx hardhat test",
      "Final Tests"
    );

    console.log("Final tests completed, analyzing final results.");

    // Step 11: Generate final conclusion
    const finalConclusionPrompt = `
Based on the following input task, Solidity code, test code, and final test results, generate a final conclusion about the quality and correctness of the smart contract:
Input task: ${inputTask}

Final Solidity code:
\`\`\`solidity
${solidityCode}
\`\`\`

Test code:
\`\`\`javascript
${testCode}
\`\`\`

Final test results:
\`\`\`
${finalTestResults}
\`\`\`

Answer ONLY with the final conclusion.
`;
    const finalConclusion = await generateMessage(
      finalConclusionPrompt,
      "gpt-4o-mini"
    );

    // Check if the conclusion directory exists, if not, create it
    if (!fs.existsSync(conclusionDirPath)) {
      fs.mkdirSync(conclusionDirPath, { recursive: true });
    }

    // Save the final conclusion to a file
    const conclusionFilePath = path.join(
      conclusionDirPath,
      "finalConclusion.txt"
    );
    fs.writeFileSync(conclusionFilePath, finalConclusion);
    // console.log(`Final conclusion saved to ${conclusionFilePath}`);

    // Return the final Solidity code and conclusion
    return { solidityCode, finalConclusion };
  } catch (error) {
    console.error("An error occurred during the process.", error);
    throw error;
  }
}

// Exportar la función
module.exports = { generateSmartContract };

