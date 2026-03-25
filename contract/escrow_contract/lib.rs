use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("8KERZnKwKuPYr4JXS6oPXqJHUjLmngniFRB22Q6XZHij");

#[program]
pub mod escrow_contract {
    use super::*;

pub fn init_escrow(ctx: Context<Init>, amount: u64) -> Result<()> {
    let escrow_pda = &mut ctx.accounts.escrow_pda;
    let recruiter_state = &mut ctx.accounts.recruiter_state;

    // ✅ First-time initialization of recruiter_state
    if recruiter_state.recuiter == Pubkey::default() {
        recruiter_state.recuiter = ctx.accounts.recruiter.key();
        recruiter_state.bump = ctx.bumps.recruiter_state;
        recruiter_state.job_count = 0;
    }

    require!(
        recruiter_state.recuiter == ctx.accounts.recruiter.key(),
        EscrowError::NotAuthenticate
    );

    escrow_pda.job_id = recruiter_state.job_count;

    escrow_pda.recruiter = ctx.accounts.recruiter.key();
    escrow_pda.amount = amount;
    escrow_pda.status = EscrowStatus::Open;
    escrow_pda.bump = ctx.bumps.escrow_pda;
    escrow_pda.can_open = false;
    escrow_pda.candidate = None;

    recruiter_state.job_count += 1;
    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.recruiter.to_account_info(),
            to: escrow_pda.to_account_info(),
        },
    );
    system_program::transfer(cpi_ctx, amount)?;

    Ok(())
}

    pub fn accept_job(ctx: Context<AcceptJob>) -> Result<()> {
        let escrow_pda = &mut ctx.accounts.escrow_pda;

        require!(
            escrow_pda.status == EscrowStatus::Open,
            EscrowError::ClosedError
        );

        escrow_pda.candidate = Some(ctx.accounts.candidate.key());
        escrow_pda.status = EscrowStatus::InProgress;

        Ok(())
    }

    pub fn can_release(ctx: Context<CanRelease>) -> Result<()> {
        let escrow_pda = &mut ctx.accounts.escrow_pda;

        require!(
            ctx.accounts.recruiter.key() == escrow_pda.recruiter,
            EscrowError::NotAuthenticate
        );

        require!(
            escrow_pda.candidate.is_some(),
            EscrowError::NoCandidateYet
        );

        escrow_pda.can_open = true;

        Ok(())
    }

    pub fn release(ctx: Context<Release>) -> Result<()> {
        let escrow_pda = &mut ctx.accounts.escrow_pda;

        require!(
            escrow_pda.status == EscrowStatus::InProgress,
            EscrowError::NoCandidateYet
        );

        require!(escrow_pda.can_open, EscrowError::NotApproved);

        let candidate_key = escrow_pda.candidate.unwrap();

        require!(
            candidate_key == ctx.accounts.candidate.key(),
            EscrowError::InvalidCandidate
        );

        let amount = escrow_pda.amount;

        **escrow_pda.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.candidate.to_account_info().try_borrow_mut_lamports()? += amount;

        escrow_pda.status = EscrowStatus::Completed;

        Ok(())
    }

    pub fn cancelled(ctx: Context<Cancelled>) -> Result<()> {
        let escrow_pda = &mut ctx.accounts.escrow_pda;

        require!(
            ctx.accounts.recruiter.key() == escrow_pda.recruiter,
            EscrowError::NotAuthenticate
        );

        let amount = escrow_pda.amount;

        **escrow_pda.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.recruiter.to_account_info().try_borrow_mut_lamports()? += amount;

        escrow_pda.status = EscrowStatus::Cancelled;

        Ok(())
    }
}


#[derive(Clone, Copy, Debug, AnchorSerialize, AnchorDeserialize, PartialEq, Eq)]
pub enum EscrowStatus {
    Open,
    InProgress,
    Completed,
    Cancelled,
}

#[account]
pub struct EscrowPda {
    pub recruiter: Pubkey,
    pub candidate: Option<Pubkey>,
    pub amount: u64,
    pub status: EscrowStatus,
    pub job_id: u64,
    pub can_open: bool,
    pub bump: u8,
}

#[account]
pub struct RecruiterState {
    pub recuiter: Pubkey,
    pub job_count: u64,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct Init<'info> {
    #[account(
        init_if_needed,
        payer = recruiter,
        space = 8 + 32 + 8 + 1,
        seeds = [b"recruiter", recruiter.key().as_ref()],
        bump
    )]
    pub recruiter_state: Account<'info, RecruiterState>,

    #[account(
        init,
        payer = recruiter,
        space = 8 + 32 + (1 + 32) + 8 + 1 + 8 + 1 + 1,
        seeds = [
            b"escrow",
            recruiter.key().as_ref(),
            &recruiter_state.job_count.to_le_bytes()
        ],
        bump
    )]
    pub escrow_pda: Account<'info, EscrowPda>,

    

    #[account(mut)]
    pub recruiter: Signer<'info>,

    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct AcceptJob<'info> {
    #[account(mut)]
    pub escrow_pda: Account<'info, EscrowPda>,

    #[account(mut)]
    pub candidate: Signer<'info>,
}
#[derive(Accounts)]
pub struct CanRelease<'info> {
    #[account(mut)]
    pub escrow_pda: Account<'info, EscrowPda>,

    pub recruiter: Signer<'info>,
}
#[derive(Accounts)]
pub struct Release<'info> {
    #[account(mut)]
    pub escrow_pda: Account<'info, EscrowPda>,

    #[account(mut)]
    pub candidate: Signer<'info>,
}
#[derive(Accounts)]
pub struct Cancelled<'info> {
    #[account(mut)]
    pub escrow_pda: Account<'info, EscrowPda>,

    #[account(mut)]
    pub recruiter: Signer<'info>,
}
#[error_code]
pub enum EscrowError {
    #[msg("Not open for further registration")]
    ClosedError,

    #[msg("You are not the recruiter")]
    NotAuthenticate,

    #[msg("Candidate must be set first")]
    NoCandidateYet,

    #[msg("Recruiter has not approved release")]
    NotApproved,

    #[msg("Invalid candidate")]
    InvalidCandidate,
}