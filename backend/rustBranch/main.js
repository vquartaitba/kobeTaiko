const fs = require("fs");
const axios = require("axios");
const { exec } = require("child_process");
const path = require("path");
// require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const apiKey = process.env.OPENAI_API_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const projectDir = __dirname;

async function generateMessage(prompt, model) {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: model,
        messages: [
          {
            role: "system",
            content: `You are an AI model specialized in blockchain technology, in creating smart contracts in rust for Solana blockchain, tests, and detecting  versions given a contract. You will answer ONLY with the task you are provided. `,
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
      .replace(/```(rust)?/g, "")
      .replace(/```/g, "")
      .trim();

    return content;
  } catch (error) {
    console.error("Error generating message:", error);
    throw error;
  }
}

function runCommand(command) {
  return new Promise((resolve, reject) => {
    const process = exec(
      command,
      { cwd: projectDir },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          return resolve(stderr || stdout); // En lugar de rechazar, resolver con salida de error
        }
        resolve(stdout);
      }
    );

    process.stdout.on("data", (data) => {
      console.log(data.toString());
    });

    process.stderr.on("data", (data) => {
      console.error(data.toString());
    });
  });
}

const model = "gpt-4o";
async function generateRustSmartContract(userTask) {
  try {
    console.log(`Generating Rust code for task: ${userTask}`);

    // Step 1: Generate rust code
    let rustPrompt = `Generate a Solana smart contract in rust code for the following task: ${userTask}. Answer ONLY with the Rust code for Solana smart contract codes. Don't add ANYTHING else. it's VERY IMPORTANT that the given CODE COMPILES . I now provide you an example of a rust smart contract that compiles
            use anchor_lang::prelude::*;

declare_id!("FhAuj6yA7UU22HTemi6z6z26kMDUqkV1yauPkEmJyLMJ");

#[program]
pub mod my_counter_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, number: u64) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.number = number;
        Ok(())
    }

    pub fn update(ctx: Context<Update>, number: u64) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.number = number;
        Ok(())
    }
}

#[account]
pub struct State {
    pub number: u64,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 8)]
    pub state: Account<'info, State>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut)]
    pub state: Account<'info, State>,
    pub user: Signer<'info>,
}
It is important that you use this ID 9qirXvvR2ohCunZh7RUYfrhzgVDUaV4L5wHexu793RF6
This is ONLY A TEMPLATE USE IT IN YOUR FAVOR`;
    let rustCode = await generateMessage(rustPrompt, model);
    // Save the generated rust code to a file
    const rustFilePath = path.join(projectDir, "programs/code/src/lib.rs");
    fs.writeFileSync(rustFilePath, rustCode);
    console.log(`rust code saved to ${rustFilePath}`);

    // Step 3: Compile contracts
    console.log("Compiling contracts...");
    // await runCommand("anchor clean")
    const buildingResults = await runCommand("anchor build");
    let improvementConclusions = generateMessage(
      `i tried to build the next contract ${rustCode} and it give me the following output when built ${buildingResults} Answer ONLY with the specific improvements to make the code compile that should be made to the Rust code.`,
      model
    );
    const improvementPrompt = `
Based on the following Rust code for the solana blockchain and the following conclusions, generate an improved version of the solana smart contract:
Rust code:
\`\`\`rust
${rustCode}
\`\`\`

Improvement conclusions :
\`\`\`
${improvementConclusions}
\`\`\`

Answer ONLY with the Rust code for Solana smart contract codes. Don't add ANYTHING else. it's VERY IMPORTANT that the given CODE COMPILES . I now provide you an example of a rust smart contract that compiles
            use anchor_lang::prelude::*;

declare_id!("FhAuj6yA7UU22HTemi6z6z26kMDUqkV1yauPkEmJyLMJ");

#[program]
pub mod my_counter_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, number: u64) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.number = number;
        Ok(())
    }

    pub fn update(ctx: Context<Update>, number: u64) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.number = number;
        Ok(())
    }
}

#[account]
pub struct State {
    pub number: u64,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 8)]
    pub state: Account<'info, State>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut)]
    pub state: Account<'info, State>,
    pub user: Signer<'info>,
}
It is important that you use this ID FhAuj6yA7UU22HTemi6z6z26kMDUqkV1yauPkEmJyLMJ
This is ONLY A TEMPLATE USE IT IN YOUR FAVOR
`;

    const improvedCode = await generateMessage(improvementPrompt, model);

    fs.writeFileSync(rustFilePath, improvedCode);
    console.log(`rust code saved to ${rustFilePath}`);
    const buildingImprovedResults = runCommand("anchor build");
    const deployingResults = runCommand("anchor deploy");

    //Ahora quiero buildear de nuevo, cambiar la red y deployar
    console.log(improvedCode);
    return { improvedCode, improvedCode };
  } catch (error) {
    console.error("An error occurred during the process.", error);
    throw error;
  }
}
module.exports = { generateRustSmartContract };
