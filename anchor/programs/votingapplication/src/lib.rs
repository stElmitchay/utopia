#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("68RZ4ff8QL3FMWBcxYnk5YZ7hx6Vxxg4oA6Ews2rLR7a");

// Minimum balance required to vote (in lamports: 1 SOL = 1_000_000_000 lamports)
const MIN_BALANCE_TO_VOTE: u64 = 1_000_000_000; // 1 SOL

#[program]
pub mod votingapplication {
    use super::*;

    pub fn initialize_poll(ctx: Context<InitializePoll>,
                               poll_id: u64,
                               description:String,
                               poll_start: u64,
                               poll_end: u64) -> Result<()> {

      let poll = &mut ctx.accounts.poll;
      poll.poll_id = poll_id;
      poll.description = description;
      poll.poll_start = poll_start;
      poll.poll_end = poll_end;
      poll.candidate_amount = 0;
      poll.poll_admin = ctx.accounts.signer.key();
        Ok(())
    }

    pub fn initialize_candidate (ctx: Context<InitializeCandidate>,
                                 candidate_name: String,
                                 _poll_id: u64) -> Result<()>{

    let poll = &mut ctx.accounts.poll;

    // Only the poll admin can add candidates
    require!(
        ctx.accounts.signer.key() == poll.poll_admin,
        VotingError::Unauthorized
    );

    let candidate = &mut ctx.accounts.candidate;
    poll.candidate_amount += 1;
    candidate.candidate_name = candidate_name;
    candidate.candidate_votes = 0;

   Ok(())
  }

  pub fn vote(ctx: Context<Vote>, _candidate_name: String, _poll_id:u64) -> Result<()> {
    let poll = &ctx.accounts.poll;
    let candidate = &mut ctx.accounts.candidate;
    let voter_record = &mut ctx.accounts.voter_record;
    let clock = Clock::get()?;

    // Check if poll has started
    require!(
        clock.unix_timestamp >= poll.poll_start as i64,
        VotingError::PollNotStarted
    );

    // Check if poll has ended
    require!(
        clock.unix_timestamp <= poll.poll_end as i64,
        VotingError::PollEnded
    );

    // Check if voter has minimum balance
    let voter_balance = ctx.accounts.signer.lamports();
    require!(
        voter_balance >= MIN_BALANCE_TO_VOTE,
        VotingError::InsufficientBalance
    );

    // Record the vote in the voter_record account
    voter_record.poll_id = poll.poll_id;
    voter_record.voter = ctx.accounts.signer.key();
    voter_record.candidate_voted_for = candidate.candidate_name.clone();
    voter_record.timestamp = clock.unix_timestamp;

    // Increment the candidate's vote count
    candidate.candidate_votes += 1;

    msg!("Voted for {} in poll {}", candidate.candidate_name, poll.poll_id);
    msg!("Total votes for {}: {}", candidate.candidate_name, candidate.candidate_votes);

    Ok(())
  }

  pub fn close_poll_early(ctx: Context<ClosePollEarly>, _poll_id: u64) -> Result<()> {
    let poll = &mut ctx.accounts.poll;
    let clock = Clock::get()?;

    // Only the poll admin can close the poll early
    require!(
        ctx.accounts.signer.key() == poll.poll_admin,
        VotingError::Unauthorized
    );

    // Can only close if poll hasn't already ended
    require!(
        clock.unix_timestamp <= poll.poll_end as i64,
        VotingError::PollAlreadyEnded
    );

    // Set poll end time to current time (effectively closing it)
    poll.poll_end = clock.unix_timestamp as u64;

    msg!("Poll {} closed early by admin", poll.poll_id);

    Ok(())
  }
}

#[derive(Accounts)]
#[instruction(candidate_name: String, poll_id:u64)]
pub struct Vote <'info>{
  #[account(mut)]
  pub signer: Signer<'info>,

  #[account(
    seeds = [poll_id.to_le_bytes().as_ref()],
    bump
  )]
  pub poll: Account<'info, Poll>,

  #[account(
    mut,
    seeds = [poll_id.to_le_bytes().as_ref(), candidate_name.as_bytes()],
    bump
  )]
  pub candidate: Account<'info, Candidate>,

  #[account(
    init,
    payer = signer,
    space = 8 + VoterRecord::INIT_SPACE,
    seeds = [poll_id.to_le_bytes().as_ref(), signer.key().as_ref()],
    bump
  )]
  pub voter_record: Account<'info, VoterRecord>,

  pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct ClosePollEarly<'info> {
  #[account(mut)]
  pub signer: Signer<'info>,

  #[account(
    mut,
    seeds = [poll_id.to_le_bytes().as_ref()],
    bump
  )]
  pub poll: Account<'info, Poll>,
}

#[derive(Accounts)]
#[instruction(candidate_name:String, poll_id:u64)] //the order matters
pub struct  InitializeCandidate<'info>{

  #[account(mut)]
  pub signer: Signer<'info>,

  #[account(
    mut,
    seeds = [poll_id.to_le_bytes().as_ref()],
    bump
  )]

  pub poll: Account<'info, Poll>,
  #[account(
    init,
    payer = signer,
    space = 8 + Candidate::INIT_SPACE,
    seeds = [poll_id.to_le_bytes().as_ref(), candidate_name.as_bytes()],
    bump
            )]
  pub candidate: Account<'info, Candidate>,
  pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(poll_id:u64)]
pub struct InitializePoll<'info>{
  #[account(mut)]
  pub signer: Signer<'info>,
  #[account(
    init,
    payer = signer,
    space = 8 + Poll::INIT_SPACE,
    seeds = [poll_id.to_le_bytes().as_ref()],
    bump
            )]
  pub poll: Account<'info, Poll>,
  pub system_program: Program<'info, System>
}


#[account]
#[derive(InitSpace)]
pub struct Poll{
  pub poll_id: u64,
  #[max_len(280)]
  pub description: String,
  pub poll_start:u64,
  pub poll_end:u64,
  pub candidate_amount: u64,
  pub poll_admin: Pubkey,
}

#[account]
#[derive(InitSpace)]
pub struct Candidate{
    #[max_len(64)]
    pub candidate_name: String,
    pub candidate_votes: u64,
}

#[account]
#[derive(InitSpace)]
pub struct VoterRecord {
    pub poll_id: u64,
    pub voter: Pubkey,
    #[max_len(64)]
    pub candidate_voted_for: String,
    pub timestamp: i64,
}

#[error_code]
pub enum VotingError {
    #[msg("Poll has not started yet")]
    PollNotStarted,
    #[msg("Poll has ended")]
    PollEnded,
    #[msg("You have already voted in this poll")]
    AlreadyVoted,
    #[msg("You are not authorized to perform this action")]
    Unauthorized,
    #[msg("Insufficient balance to vote. You need at least 1 SOL")]
    InsufficientBalance,
    #[msg("Poll has already ended")]
    PollAlreadyEnded,
}