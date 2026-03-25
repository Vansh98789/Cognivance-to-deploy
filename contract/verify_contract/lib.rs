use anchor_lang::prelude::*;

declare_id!("BXttSfoCqPxcFziWpzd4jqy8LSmj8axcyBcgfNcBxLPp");

#[program]
pub mod verify_contract {
    use super::*;

    pub fn init_session(ctx:Context<Init>,session_id:String,subject:String,score:u64)->Result<()>{
        let interview_pda=&mut ctx.accounts.interview_pda;
        interview_pda.student=ctx.accounts.student.key();
        interview_pda.session_id=session_id;
        interview_pda.subject=subject;
        interview_pda.score=score;
        interview_pda.bump=ctx.bumps.interview_pda;
        Ok(())
    }
}
#[account]
pub struct InterviewSession{
    pub student:Pubkey,
    pub session_id:String,
    pub subject:String,
    pub score:u64,
    pub bump:u8
}

#[derive(Accounts)]
#[instruction(session_id: String)]
pub struct Init<'info>{
    #[account(
        init_if_needed,
        payer=student,
        space=8+32+4+200+4+100+8+1,
        seeds=[b"verify",student.key().as_ref(),session_id.as_bytes()],
        bump
    )]
    pub interview_pda:Account<'info,InterviewSession>,
    #[account(mut)]
    pub student:Signer<'info>,
    pub system_program:Program<'info,System>
}
