const readmeText = `
# 🎲 **Welcome to OSRS Bingo!**
Our **Bingo system** brings a fun, automated way to compete in RuneScape-themed challenges. Your Bingo card consists of 15 in-game tasks, such as gaining XP or defeating bosses. Complete tasks to earn points, achieve Bingo patterns, and climb the leaderboard! 🎲🏆
## How to Participate

### 🔹 **Register Your RSN**
Before participating, link your Discord to your RuneScape account using:
\`\`\`
/rsn <YourRSN>
\`\`\`
You’ll get confirmation via a private message from the bot.

⚠️ **Note:** Clan members are auto-tracked seamlessly. Guests can participate, but progress tracking requires manual verification.

## Playing Solo or in Teams

- **Solo:** You're automatically entered solo upon registration.
- **Teams:** Team up with up to **5 players** using:
\`\`\`markdown
/bingo-team create <TeamName> <passkey>
/bingo-team join <TeamName> <passkey>
/bingo-team leave
\`\`\`
Teams must form before any task completion. Progress is shared, and points are split based on individual contribution.

## Task Progress & Updates 🔄
Tasks can be completed in any order. Progress is auto-updated every **30 minutes** or immediately when viewing your card using:
\`\`\`markdown
/bingo-cards <optional-rsn>
\`\`\`
Task completions are publicly announced and visually updated on your card.

Example announcement (team):
> 📊 Gain 1,000,000 XP in Smithing
> - Member 1 — ✅ 250,000 XP — ⭐ 34 pts — 📊 25.00%
> - Member 2 — ✅ 750,000 XP — ⭐ 100 pts — 📊 75.00%

## Earning Points

Earn points through tasks and **bonus patterns**:

- **Task Points:** Each task has base points reflecting difficulty.  
  _(e.g. “Cook 100 fish” = 10 points, “Complete 5 raids” = 60 points.)_

- **Team Scoring:** Tasks completed as a team award points split based on individual contributions.

### Bonus Points

- **Weekly Bonus (SOTW/BOTW):** Tasks aligned with the current Skill/Boss of the Week grant a **+50 bonus**.
  - E.g., Gaining Fishing XP during Fishing SOTW = 50 base + 50 bonus = **100 points**.

- **Bingo Patterns:** Completing special patterns awards additional bonus points:

### 🎯 **Bingo Patterns: How They Work**
- **Pattern Bonuses**: Completing specific patterns (rows, columns, diagonals, corners, "X"-shape, or full-board) awards extra bonus points.
- **Rotating Patterns**: Patterns vary each Bingo event, but **Full-board (Blackout)** is always active.
- **Overlapping Patterns**:  
  - The first completed pattern grants full bonus points.  
  - Subsequent overlapping patterns incur a **points penalty** proportional to how much they overlap with previously completed patterns.  
  - Example: If your new pattern overlaps **60%** with a previously completed pattern, you'll receive **60% fewer bonus points** for that second pattern.
- **Strategy Tip**: Prioritize completing higher-value patterns first and minimize overlaps to maximize your total points.
- **Real-Time Updates**: Pattern completions and penalties are announced in Discord to help track your progress clearly.

## Event Duration & Completion

- Events last **4 weeks** unless a player/team completes the full board early, causing an immediate conclusion.
- After completion, the next event starts soon (±5 min).

## Tips for Success

- **Register early** to ensure smooth progress tracking.
- **Coordinate with your team** for maximum points and pattern bonuses.
- **Prioritize SOTW/BOTW** tasks for +50 extra points.
- Aim for Bingo patterns to boost your final score.

## 🎯 Currently Active Bingo Patterns
`;

module.exports = readmeText;
