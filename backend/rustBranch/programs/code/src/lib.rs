use anchor_lang::prelude::*;
use anchor_lang::solana_program::log::{
    sol_log_data, sol_log_pubkey,
};

declare_id!("FhAuj6yA7UU22HTemi6z6z26kMDUqkV1yauPkEmJyLMJ");

#[program]
pub mod soccer_game_program {
    use super::*;

    pub fn initialize_game(
        ctx: Context<InitializeGame>, 
        team1_name: String, 
        team2_name: String, 
        players_team1: Vec<String>, 
        players_team2: Vec<String>,
    ) -> Result<()> {
        let game = &mut ctx.accounts.game;
        game.team1 = Team::new(team1_name, players_team1);
        game.team2 = Team::new(team2_name, players_team2);
        game.state = GameState::Started;
        emit!(GameEvent {
            message: "Game started".to_string(),
        });
        Ok(())
    }

    pub fn score_goal(
        ctx: Context<ScoreGoal>, 
        scoring_team: u8, 
        player_name: String,
    ) -> Result<()> {
        let game = &mut ctx.accounts.game;
        match scoring_team {
            1 => game.team1.score_goal(&player_name),
            2 => game.team2.score_goal(&player_name),
            _ => return Err(ErrorCode::InvalidTeam.into()),
        };
        emit!(ScoreEvent {
            scoring_team,
            player_name,
        });
        Ok(())
    }

    pub fn get_game_status(ctx: Context<GetGameStatus>) -> Result<()> {
        let game = &ctx.accounts.game;
        sol_log_pubkey(&game.key());
        sol_log_data(format!("Game state: {:?}", game.state).as_bytes());
        sol_log_data(format!("Team 1 score: {}", game.team1.score).as_bytes());
        sol_log_data(format!("Team 2 score: {}", game.team2.score).as_bytes());
        Ok(())
    }
}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct Team {
    pub name: String,
    pub players: Vec<Player>,
    pub score: u8,
}

impl Team {
    pub fn new(name: String, players: Vec<String>) -> Self {
        Team {
            name,
            players: players.into_iter().map(|name| Player { name, goals: 0 }).collect(),
            score: 0,
        }
    }

    pub fn score_goal(&mut self, player_name: &String) {
        self.score += 1;
        if let Some(player) = self.players.iter_mut().find(|p| &p.name == player_name) {
            player.goals += 1;
        }
    }
}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct Player {
    pub name: String,
    pub goals: u8,
}

#[account]
pub struct Game {
    pub team1: Team,
    pub team2: Team,
    pub state: GameState,
}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub enum GameState {
    Started,
    Ended,
}

#[derive(Accounts)]
pub struct InitializeGame<'info> {
    #[account(init, payer = user, space = 8 + 512)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ScoreGoal<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
}

#[derive(Accounts)]
pub struct GetGameStatus<'info> {
    pub game: Account<'info, Game>,
}

#[event]
pub struct GameEvent {
    pub message: String,
}

#[event]
pub struct ScoreEvent {
    pub scoring_team: u8,
    pub player_name: String,
}

#[error]
pub enum ErrorCode {
    #[msg("Invalid team specified.")]
    InvalidTeam,
}